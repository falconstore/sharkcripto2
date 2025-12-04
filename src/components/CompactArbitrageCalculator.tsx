import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, Play, Pause } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface CompactArbitrageCalculatorProps {
  id: string;
  onRemove: (id: string) => void;
}

const CompactArbitrageCalculator = ({ id, onRemove }: CompactArbitrageCalculatorProps) => {
  const { opportunities } = useOpportunities();
  const { rate: taxaCambioAtual } = useExchangeRate();

  // Estados básicos
  const [valorInvestido, setValorInvestido] = useState<string>('');
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [trackingActive, setTrackingActive] = useState(false);

  // Estados de entrada/saída
  const [entradaSpot, setEntradaSpot] = useState<string>('');
  const [entradaFuturo, setEntradaFuturo] = useState<string>('');
  const [fechamentoSpot, setFechamentoSpot] = useState<string>('');
  const [fechamentoFuturo, setFechamentoFuturo] = useState<string>('');

  // Estados de resultado
  const [lucroUSD, setLucroUSD] = useState<number>(0);
  const [lucroBRL, setLucroBRL] = useState<number>(0);
  const [varTotal, setVarTotal] = useState<number>(0);
  
  const TAXA = 0.001; // 0.1%

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

  const spreadEntrada = useMemo(() => {
    if (!entradaSpot || !entradaFuturo) return 0;
    const sE = parseFloat(entradaSpot);
    const fE = parseFloat(entradaFuturo);
    return (fE / sE - 1) * 100;
  }, [entradaSpot, entradaFuturo]);

  return (
    <Card className="bg-gradient-card border-border/50 hover:border-primary/30 transition-all">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Selecionar par..." />
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
                AO VIVO
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

        {/* Botão Calcular */}
        <Button
          onClick={() => calcular()}
          className="w-full h-8 text-xs bg-gradient-primary"
          disabled={trackingActive}
        >
          {trackingActive ? 'Calculando...' : 'Calcular'}
        </Button>

        {/* Resultados */}
        <div className="p-2 rounded-md bg-accent/30 border border-border/50">
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
