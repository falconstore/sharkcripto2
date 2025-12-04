import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, TrendingDown, Play, Pause, Save, History as HistoryIcon, Wallet } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { useBankroll } from '@/hooks/useBankroll';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import CalculationHistoryModal from './CalculationHistoryModal';
const ImprovedArbitrageCalculator = () => {
  const {
    opportunities
  } = useOpportunities();
  const {
    rate: taxaCambioAtual,
    source: exchangeSource
  } = useExchangeRate();
  const {
    saveCalculation,
    history
  } = useCalculationHistory();
  const {
    addPoint,
    getHistory
  } = usePriceHistory();
  const {
    addOperation
  } = useBankroll();
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const [varEntrada, setVarEntrada] = useState<number>(0);
  const [varFech, setVarFech] = useState<number>(0);
  const [varTotal, setVarTotal] = useState<number>(0);
  const TAXA = 0.001; // 0.1%

  // Oportunidade selecionada
  const selectedOpp = useMemo(() => {
    return opportunities.find(o => o.pair_symbol === selectedPair);
  }, [opportunities, selectedPair]);

  // Adicionar pontos ao histórico de spread
  useEffect(() => {
    if (selectedOpp) {
      addPoint(selectedOpp.pair_symbol, selectedOpp.spread_net_percent);
    }
  }, [selectedOpp, addPoint]);

  // Acompanhamento automático de saída - reage imediatamente às mudanças
  useEffect(() => {
    if (selectedOpp && trackingActive) {
      // Atualiza imediatamente quando selectedOpp muda
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
  const calcular = (valor?: number, spotEntrada?: number, futuroEntrada?: number, spotFechamento?: number, futuroFechamento?: number) => {
    const v = valor !== undefined ? valor : parseFloat(valorInvestido) || 0;
    const sE = spotEntrada !== undefined ? spotEntrada : parseFloat(entradaSpot) || 0;
    const fE = futuroEntrada !== undefined ? futuroEntrada : parseFloat(entradaFuturo) || 0;
    const sF = spotFechamento !== undefined ? spotFechamento : parseFloat(fechamentoSpot) || 0;
    const fF = futuroFechamento !== undefined ? futuroFechamento : parseFloat(fechamentoFuturo) || 0;
    if (!v || !sE || !fE) {
      setLucroUSD(0);
      setLucroBRL(0);
      setVarEntrada(0);
      setVarFech(0);
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
    setVarEntrada(variacaoEntrada * 100);
    setVarFech(variacaoFechamento * 100);
    setVarTotal(variacaoTotal * 100);
  };
  const limpar = () => {
    setValorInvestido('');
    setSelectedPair('');
    setEntradaSpot('');
    setEntradaFuturo('');
    setFechamentoSpot('');
    setFechamentoFuturo('');
    setTrackingActive(false);
    setLucroUSD(0);
    setLucroBRL(0);
    setVarEntrada(0);
    setVarFech(0);
    setVarTotal(0);
  };
  const spreadEntrada = useMemo(() => {
    if (!entradaSpot || !entradaFuturo) return 0;
    const sE = parseFloat(entradaSpot);
    const fE = parseFloat(entradaFuturo);
    return (fE / sE - 1) * 100;
  }, [entradaSpot, entradaFuturo]);
  const spreadSaida = useMemo(() => {
    if (!fechamentoSpot || !fechamentoFuturo) return 0;
    const sF = parseFloat(fechamentoSpot);
    const fF = parseFloat(fechamentoFuturo);
    return (sF - fF) / sF * 100;
  }, [fechamentoSpot, fechamentoFuturo]);
  return <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary text-left text-secondary-foreground bg-primary">
          <Calculator className="w-4 h-4 mr-2" />
          Calculadora de Arbitragem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gold" />
                Calculadora de Arbitragem Avançada
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
                <HistoryIcon className="w-4 h-4 mr-2" />
                Histórico ({history?.length || 0})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grid Principal: Inputs | Live Data */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Coluna 1 e 2: Inputs */}
              <div className="lg:col-span-2 space-y-4">
                {/* Valor Investido */}
                <div className="space-y-2">
                  <Label htmlFor="valorInvestido" className="text-sm font-medium">
                    Valor Investido (USDT)
                  </Label>
                  <Input id="valorInvestido" type="number" placeholder="0.00" value={valorInvestido} onChange={e => setValorInvestido(e.target.value)} className="font-mono" />
                </div>

                {/* Seletor de Moeda */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selecionar Moeda (opcional)</Label>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma oportunidade para ver dados ao vivo..." />
                    </SelectTrigger>
                    <SelectContent>
                  {opportunities.map(opp => <SelectItem key={opp.pair_symbol} value={opp.pair_symbol}>
                      <span className="font-mono">{opp.pair_symbol}</span>
                    </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Preços de Entrada */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Preços de Entrada</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="entradaSpot" className="text-xs text-muted-foreground">
                        Entrada Spot
                      </Label>
                      <Input id="entradaSpot" type="number" placeholder="0.00000000" value={entradaSpot} onChange={e => setEntradaSpot(e.target.value)} className="font-mono text-sm" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entradaFuturo" className="text-xs text-muted-foreground">
                        Entrada Futuro
                      </Label>
                      <Input id="entradaFuturo" type="number" placeholder="0.00000000" value={entradaFuturo} onChange={e => setEntradaFuturo(e.target.value)} className="font-mono text-sm" />
                    </div>
                  </div>
                </div>

                {/* Toggle de Tracking */}
                {selectedPair && <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/20">
                    <div className="flex items-center gap-2">
                      {trackingActive ? <Play className="w-4 h-4 text-profit" /> : <Pause className="w-4 h-4 text-muted-foreground" />}
                      <Label htmlFor="tracking" className="text-sm cursor-pointer">
                        Acompanhar saída automaticamente
                      </Label>
                    </div>
                    <Switch id="tracking" checked={trackingActive} onCheckedChange={setTrackingActive} />
                  </div>}

                {/* Preços de Fechamento */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Preços de Fechamento</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="fechamentoSpot" className="text-xs text-muted-foreground">
                        Fechamento Spot
                      </Label>
                      <Input id="fechamentoSpot" type="number" placeholder="0.00000000" value={fechamentoSpot} onChange={e => setFechamentoSpot(e.target.value)} className="font-mono text-sm" disabled={trackingActive} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fechamentoFuturo" className="text-xs text-muted-foreground">
                        Fechamento Futuro
                      </Label>
                      <Input id="fechamentoFuturo" type="number" placeholder="0.00000000" value={fechamentoFuturo} onChange={e => setFechamentoFuturo(e.target.value)} className="font-mono text-sm" disabled={trackingActive} />
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button onClick={() => calcular()} className="flex-1 bg-gradient-primary" disabled={trackingActive}>
                    <Calculator className="w-4 h-4 mr-2" />
                    {trackingActive ? 'Calculando...' : 'Calcular'}
                  </Button>
                  <Button onClick={() => {
                    const calc = {
                      pair_symbol: selectedPair || null,
                      valor_investido: parseFloat(valorInvestido) || 0,
                      entrada_spot: parseFloat(entradaSpot) || 0,
                      entrada_futuro: parseFloat(entradaFuturo) || 0,
                      fechamento_spot: parseFloat(fechamentoSpot) || null,
                      fechamento_futuro: parseFloat(fechamentoFuturo) || null,
                      lucro_usd: lucroUSD,
                      lucro_brl: lucroBRL,
                      var_entrada: varEntrada,
                      var_fechamento: varFech,
                      var_total: varTotal,
                      exchange_rate: taxaCambioAtual
                    };
                    saveCalculation(calc);
                  }} variant="outline" disabled={lucroUSD === 0}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button 
                    onClick={() => {
                      addOperation({
                        operation_type: 'trade',
                        amount_usdt: parseFloat(valorInvestido) || 0,
                        profit_usdt: lucroUSD,
                        profit_brl: lucroBRL,
                        pair_symbol: selectedPair,
                        notes: `Trade ${selectedPair} - Var: ${varTotal.toFixed(2)}%`
                      });
                    }} 
                    variant="outline" 
                    disabled={lucroUSD === 0}
                    className="bg-gold/10 text-gold border-gold/30 hover:bg-gold/20"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Salvar na Banca
                  </Button>
                  <Button onClick={limpar} variant="outline">
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Coluna 3: Live Data */}
              <div className="space-y-4">
                <div className="sticky top-0">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    Dados ao Vivo
                    {trackingActive && <Badge variant="outline" className="bg-profit/10 text-profit animate-pulse">
                        AO VIVO
                      </Badge>}
                  </h3>

                  {selectedOpp ? <div className="space-y-3">
                      <Card className="bg-accent/30 border-border">
                        <CardContent className="p-4 space-y-2">
                          <div className="text-xs text-muted-foreground">Preços Atuais</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Spot:</span>
                              <span className="font-mono font-semibold">${selectedOpp.spot_bid_price.toFixed(8)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Futuro:</span>
                              <span className="font-mono font-semibold">${selectedOpp.futures_ask_price.toFixed(8)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-accent/30 border-border">
                        <CardContent className="p-4 space-y-2">
                          <div className="text-xs text-muted-foreground">Spreads</div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs">Entrada:</span>
                              <Badge variant="outline" className={spreadEntrada > 0 ? 'bg-profit/20 text-profit border-profit/30' : 'bg-negative-subtle text-negative border-red-500/30'}>
                                {spreadEntrada > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {spreadEntrada.toFixed(4)}%
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs">Saída:</span>
                              <Badge variant="outline" className={spreadSaida > 0 ? 'bg-profit/20 text-profit border-profit/30' : 'bg-negative-subtle text-negative border-red-500/30'}>
                                {spreadSaida > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {spreadSaida.toFixed(4)}%
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Sparkline de Spread */}
                      {(() => {
                    const sparklineData = getHistory(selectedPair, 5);
                    return sparklineData.length > 10 ? <Card className="bg-accent/30 border-border">
                            <CardContent className="p-4">
                              <div className="text-xs text-muted-foreground mb-2">
                                Spread (últimos 5 min)
                              </div>
                              <Sparklines data={sparklineData.map(p => p.spread)} height={40}>
                                <SparklinesLine color={spreadEntrada > 0 ? '#22c55e' : '#ef4444'} style={{
                            strokeWidth: 2
                          }} />
                              </Sparklines>
                            </CardContent>
                          </Card> : null;
                  })()}

                      <div className="text-center">
                        <Badge variant="outline" className={`text-xs ${varTotal >= 0 ? 'bg-profit/10 text-profit border-profit/20' : 'bg-negative-subtle text-negative border-red-500/30'}`}>
                          {varTotal >= 0 ? 'POSITIVO' : 'NEGATIVO'}
                        </Badge>
                      </div>
                    </div> : <div className="text-center py-8 text-muted-foreground text-sm">
                      Selecione uma moeda para ver dados ao vivo
                    </div>}
                </div>
              </div>
            </div>

            {/* Resultados */}
            {(lucroUSD !== 0 || varTotal !== 0) && <div className="space-y-4 p-6 bg-gradient-to-br from-accent/30 to-accent/10 rounded-lg border border-border animate-fade-in">
                <h3 className="text-sm font-semibold text-center mb-4">Resultados da Operação</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={`${lucroUSD >= 0 ? 'bg-profit/5 border-profit/20' : 'bg-destructive/5 border-destructive/20'}`}>
                    <CardContent className="p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-2">Lucro em USDT</div>
                      <div className={`text-3xl font-bold font-mono ${lucroUSD >= 0 ? 'text-profit' : 'text-destructive'}`}>
                        {lucroUSD.toFixed(2)} USDT
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${lucroBRL >= 0 ? 'bg-profit/5 border-profit/20' : 'bg-destructive/5 border-destructive/20'}`}>
                    <CardContent className="p-4 text-center">
                      <div className="text-xs text-muted-foreground mb-2">
                        Lucro em BRL (R$ {taxaCambioAtual.toFixed(2)} - {exchangeSource})
                      </div>
                      <div className={`text-3xl font-bold font-mono ${lucroBRL >= 0 ? 'text-profit' : 'text-destructive'}`}>
                        R$ {lucroBRL.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">Var. Entrada</div>
                    <div className={`text-lg font-bold font-mono ${varEntrada >= 0 ? 'text-profit' : 'text-destructive'}`}>
                      {varEntrada >= 0 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                      {varEntrada.toFixed(4)}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">Var. Fechamento</div>
                    <div className={`text-lg font-bold font-mono ${varFech >= 0 ? 'text-profit' : 'text-destructive'}`}>
                      {varFech >= 0 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                      {varFech.toFixed(4)}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">Var. Total</div>
                    <div className={`text-lg font-bold font-mono ${varTotal >= 0 ? 'text-gold' : 'text-destructive'}`}>
                      {varTotal >= 0 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : <TrendingDown className="inline w-4 h-4 mr-1" />}
                      {varTotal.toFixed(4)}%
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
                  Taxa de {(TAXA * 100).toFixed(2)}% já descontada • Câmbio BRL/USDT: R$ {taxaCambioAtual.toFixed(2)}
                </div>
              </div>}
          </CardContent>
        </Card>
      </DialogContent>

      <CalculationHistoryModal open={historyOpen} onOpenChange={setHistoryOpen} onLoadCalculation={calc => {
      setSelectedPair(calc.pair_symbol || '');
      setValorInvestido(calc.valor_investido.toString());
      setEntradaSpot(calc.entrada_spot.toString());
      setEntradaFuturo(calc.entrada_futuro.toString());
      if (calc.fechamento_spot) setFechamentoSpot(calc.fechamento_spot.toString());
      if (calc.fechamento_futuro) setFechamentoFuturo(calc.fechamento_futuro.toString());
      calcular();
    }} />
    </Dialog>;
};
export default ImprovedArbitrageCalculator;