import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X, TrendingUp, TrendingDown, Play, Pause, GripVertical, Wallet, Bell } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCalculatorStore, CalculatorData } from '@/hooks/useCalculatorStore';
import { useBankroll } from '@/hooks/useBankroll';
import { toast } from 'sonner';

interface CompactArbitrageCalculatorProps {
  id: string;
  onRemove: (id: string) => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const CompactArbitrageCalculator = ({ id, onRemove, isDragging, dragHandleProps }: CompactArbitrageCalculatorProps) => {
  const { opportunities } = useOpportunities();
  const { rate: taxaCambioAtual } = useExchangeRate();
  const { updateCalculator, calculators, profitThreshold, soundEnabled } = useCalculatorStore();
  const { addOperation } = useBankroll();

  // Get stored calculator data
  const storedCalc = useMemo(() => 
    calculators.find(c => c.id === id), 
    [calculators, id]
  );

  // Local states initialized from store
  const [valorInvestido, setValorInvestido] = useState<string>(storedCalc?.valorInvestido || '');
  const [selectedPair, setSelectedPair] = useState<string>(storedCalc?.selectedPair || '');
  const [trackingActive, setTrackingActive] = useState(storedCalc?.trackingActive || false);
  const [entradaSpot, setEntradaSpot] = useState<string>(storedCalc?.entradaSpot || '');
  const [entradaFuturo, setEntradaFuturo] = useState<string>(storedCalc?.entradaFuturo || '');
  const [fechamentoSpot, setFechamentoSpot] = useState<string>(storedCalc?.fechamentoSpot || '');
  const [fechamentoFuturo, setFechamentoFuturo] = useState<string>(storedCalc?.fechamentoFuturo || '');

  // Estados de resultado
  const [lucroUSD, setLucroUSD] = useState<number>(0);
  const [lucroBRL, setLucroBRL] = useState<number>(0);
  const [varTotal, setVarTotal] = useState<number>(0);
  
  // Sound notification ref
  const lastNotifiedProfit = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const TAXA = 0.001;

  // Persist state changes to store
  useEffect(() => {
    updateCalculator(id, {
      selectedPair,
      valorInvestido,
      entradaSpot,
      entradaFuturo,
      fechamentoSpot,
      fechamentoFuturo,
      trackingActive,
    });
  }, [selectedPair, valorInvestido, entradaSpot, entradaFuturo, fechamentoSpot, fechamentoFuturo, trackingActive, id, updateCalculator]);

  // Sound notification for profit
  useEffect(() => {
    if (soundEnabled && lucroUSD > 0 && lucroUSD >= profitThreshold && lucroUSD !== lastNotifiedProfit.current) {
      playProfitSound();
      lastNotifiedProfit.current = lucroUSD;
    }
  }, [lucroUSD, profitThreshold, soundEnabled]);

  const playProfitSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // Oportunidade selecionada
  const selectedOpp = useMemo(() => {
    return opportunities.find(o => o.pair_symbol === selectedPair);
  }, [opportunities, selectedPair]);

  // Acompanhamento automático de saída
  useEffect(() => {
    if (selectedOpp && trackingActive) {
      setFechamentoSpot(selectedOpp.spot_bid_price.toString());
      setFechamentoFuturo(selectedOpp.futures_ask_price.toString());
      calcular(
        parseFloat(valorInvestido) || 0,
        parseFloat(entradaSpot) || 0,
        parseFloat(entradaFuturo) || 0,
        selectedOpp.spot_bid_price,
        selectedOpp.futures_ask_price
      );
    }
  }, [selectedOpp?.spot_bid_price, selectedOpp?.futures_ask_price, trackingActive, valorInvestido, entradaSpot, entradaFuturo]);

  const calcular = (
    valor?: number,
    spotEntrada?: number,
    futuroEntrada?: number,
    spotFechamento?: number,
    futuroFechamento?: number
  ) => {
    const v = valor !== undefined ? valor : parseFloat(valorInvestido) || 0;
    const sE = spotEntrada !== undefined ? spotEntrada : parseFloat(entradaSpot) || 0;
    const fE = futuroEntrada !== undefined ? futuroEntrada : parseFloat(entradaFuturo) || 0;
    const sF = spotFechamento !== undefined ? spotFechamento : parseFloat(fechamentoSpot) || 0;
    const fF = futuroFechamento !== undefined ? futuroFechamento : parseFloat(fechamentoFuturo) || 0;

    if (!v || !sE || !fE) {
      setLucroUSD(0);
      setLucroBRL(0);
      setVarTotal(0);
      return;
    }

    const variacaoEntrada = fE / sE - 1;
    const variacaoFechamento = sF > 0 && fF > 0 ? (sF - fF) / sF : 0;
    const variacaoTotal = variacaoEntrada + variacaoFechamento;
    const lucroEmUSD = v * variacaoTotal * (1 - TAXA);
    const lucroEmBRL = lucroEmUSD * taxaCambioAtual;

    setLucroUSD(lucroEmUSD);
    setLucroBRL(lucroEmBRL);
    setVarTotal(variacaoTotal * 100);
  };

  const handleSaveToBank = () => {
    if (!valorInvestido || lucroUSD === 0) {
      toast.error('Calcule uma operação antes de salvar');
      return;
    }
    
    addOperation({
      operation_type: 'trade',
      amount_usdt: parseFloat(valorInvestido),
      profit_usdt: lucroUSD,
      profit_brl: lucroBRL,
      pair_symbol: selectedPair || 'N/A',
      notes: `Gerenciamento - Var: ${varTotal.toFixed(4)}%`
    });
    
    toast.success('Operação salva na banca!');
  };

  const spreadEntrada = useMemo(() => {
    if (!entradaSpot || !entradaFuturo) return 0;
    const sE = parseFloat(entradaSpot);
    const fE = parseFloat(entradaFuturo);
    return (fE / sE - 1) * 100;
  }, [entradaSpot, entradaFuturo]);

  const showProfitAlert = lucroUSD > 0 && lucroUSD >= profitThreshold;

  return (
    <Card className={`bg-gradient-card border-border/50 hover:border-primary/30 transition-all ${isDragging ? 'opacity-50 scale-105' : ''}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Drag Handle */}
            <div 
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Par..." />
              </SelectTrigger>
              <SelectContent>
                {opportunities.map(opp => (
                  <SelectItem key={opp.pair_symbol} value={opp.pair_symbol}>
                    <span className="font-mono text-xs">{opp.pair_symbol}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trackingActive && (
              <Badge variant="outline" className="bg-profit/10 text-profit text-[10px] animate-pulse">
                LIVE
              </Badge>
            )}
            {showProfitAlert && (
              <Badge variant="outline" className="bg-gold/20 text-gold text-[10px] animate-pulse">
                <Bell className="w-2.5 h-2.5 mr-0.5" />
                $
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(id)}
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Valor Investido */}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Valor (USD)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={valorInvestido}
            onChange={e => setValorInvestido(e.target.value)}
            className="h-8 text-sm font-mono"
          />
        </div>

        {/* Grid de Preços */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Entrada Spot</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={entradaSpot}
              onChange={e => setEntradaSpot(e.target.value)}
              className="h-7 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Entrada Futuro</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={entradaFuturo}
              onChange={e => setEntradaFuturo(e.target.value)}
              className="h-7 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Fech. Spot</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={fechamentoSpot}
              onChange={e => setFechamentoSpot(e.target.value)}
              className="h-7 text-xs font-mono"
              disabled={trackingActive}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Fech. Futuro</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={fechamentoFuturo}
              onChange={e => setFechamentoFuturo(e.target.value)}
              className="h-7 text-xs font-mono"
              disabled={trackingActive}
            />
          </div>
        </div>

        {/* Toggle de Tracking */}
        {selectedPair && (
          <div className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-accent/20">
            <div className="flex items-center gap-1">
              {trackingActive ? (
                <Play className="w-3 h-3 text-profit" />
              ) : (
                <Pause className="w-3 h-3 text-muted-foreground" />
              )}
              <Label htmlFor={`tracking-${id}`} className="text-[10px] cursor-pointer">
                Auto tracking
              </Label>
            </div>
            <Switch
              id={`tracking-${id}`}
              checked={trackingActive}
              onCheckedChange={setTrackingActive}
              className="scale-75"
            />
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2">
          <Button
            onClick={() => calcular()}
            className="flex-1 h-8 text-xs bg-gradient-primary"
            disabled={trackingActive}
          >
            {trackingActive ? 'Auto...' : 'Calcular'}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSaveToBank}
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-gold/10 text-gold border-gold/30 hover:bg-gold/20"
                disabled={lucroUSD === 0}
              >
                <Wallet className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Salvar na Banca</TooltipContent>
          </Tooltip>
        </div>

        {/* Resultados */}
        <div className={`p-2 rounded-md border border-border/50 ${showProfitAlert ? 'bg-profit/10 border-profit/30' : 'bg-accent/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Spread Entrada:</span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                spreadEntrada >= 0
                  ? 'bg-profit/20 text-profit border-profit/30'
                  : 'bg-negative-subtle text-negative border-red-500/30'
              }`}
            >
              {spreadEntrada >= 0 ? <TrendingUp className="w-2 h-2 mr-0.5" /> : <TrendingDown className="w-2 h-2 mr-0.5" />}
              {spreadEntrada.toFixed(4)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground">Var. Total:</span>
            <span className={`font-mono text-xs font-semibold ${varTotal >= 0 ? 'text-profit' : 'text-negative'}`}>
              {varTotal.toFixed(4)}%
            </span>
          </div>
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Lucro:</span>
              <div className="text-right">
                <p className={`font-mono text-sm font-bold ${lucroUSD >= 0 ? 'text-profit' : 'text-negative'}`}>
                  ${lucroUSD.toFixed(2)}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  R$ {lucroBRL.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactArbitrageCalculator;
