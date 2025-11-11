import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useMexcConfig } from '@/hooks/useMexcConfig';
import { useMexcBalance } from '@/hooks/useMexcBalance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import MexcBalanceCards from './MexcBalanceCards';

const MexcExecutionPanel = () => {
  const { opportunities } = useOpportunities();
  const { minSpread, maxOperationValue, minSpotVolume, minFuturesVolume, simulationMode, autoConfirm } = useMexcConfig();
  const { spotBalance, futuresBalance } = useMexcBalance();
  const [executing, setExecuting] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [selectedSide, setSelectedSide] = useState<'ENTRY' | 'EXIT' | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const filteredOpps = opportunities.filter(
    (opp) =>
      opp.spot_volume_24h >= minSpotVolume &&
      opp.futures_volume_24h >= minFuturesVolume
  );

  const getQuantity = (symbol: string) => quantities[symbol] || '';
  const setQuantity = (symbol: string, value: string) => {
    setQuantities(prev => ({ ...prev, [symbol]: value }));
  };

  const getTotalValue = (opp: any, qty: string) => {
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return 0;
    return quantity * opp.spot_bid_price;
  };

  const validateExecution = (opp: any, side: 'ENTRY' | 'EXIT', qty: string) => {
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return { valid: false, reason: 'Quantidade inválida' };
    
    const totalValue = getTotalValue(opp, qty);
    if (totalValue > maxOperationValue) {
      return { valid: false, reason: `Valor excede máximo (${maxOperationValue} USDT)` };
    }

    const spread = side === 'ENTRY' ? opp.spread_net_percent_entrada : opp.spread_net_percent_saida;
    if (spread < minSpread) {
      return { valid: false, reason: `Spread abaixo do mínimo (${minSpread}%)` };
    }

    // Validate balance
    if (side === 'ENTRY') {
      if (totalValue > spotBalance) {
        return { valid: false, reason: 'Saldo SPOT insuficiente' };
      }
    } else {
      if (totalValue > futuresBalance) {
        return { valid: false, reason: 'Saldo FUTURES insuficiente' };
      }
    }

    return { valid: true, reason: '' };
  };

  const handleExecute = async (opp: any, side: 'ENTRY' | 'EXIT') => {
    const qty = getQuantity(opp.pair_symbol);
    const validation = validateExecution(opp, side, qty);
    
    if (!validation.valid) {
      toast.error(validation.reason);
      return;
    }

    setSelectedOpp(opp);
    setSelectedSide(side);

    if (autoConfirm) {
      await executeOrder(opp, side);
    } else {
      setShowConfirm(true);
    }
  };

  const executeOrder = async (opp: any, side: 'ENTRY' | 'EXIT') => {
    const qty = getQuantity(opp.pair_symbol);
    setExecuting(true);
    setShowConfirm(false);

    try {
      const { data, error } = await supabase.functions.invoke('mexc-trading-executor', {
        body: {
          symbol: opp.pair_symbol,
          side,
          quantity: parseFloat(qty),
          maxValue: maxOperationValue,
          minSpread: side === 'ENTRY' ? minSpread : minSpread,
          simulationMode,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(
          data.simulation
            ? `✅ Simulação concluída: ${side} ${opp.pair_symbol}`
            : `✅ Ordem executada: ${side} ${opp.pair_symbol}`,
          {
            description: `Spread: ${data.details.spread.toFixed(4)}% | Valor: $${data.details.totalValue.toFixed(2)}`,
          }
        );
        setQuantity(opp.pair_symbol, '');
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Execution error:', error);
      toast.error('Erro ao executar ordem', {
        description: error.message || 'Tente novamente',
      });
    } finally {
      setExecuting(false);
      setSelectedOpp(null);
      setSelectedSide(null);
    }
  };

  if (filteredOpps.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Nenhuma oportunidade encontrada com os filtros atuais. Ajuste os volumes mínimos nas configurações.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Cards */}
      <MexcBalanceCards />

      <Card>
        <CardHeader>
          <CardTitle>Painel de Execução</CardTitle>
          <CardDescription>
            {filteredOpps.length} oportunidades disponíveis para execução
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Opportunities List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredOpps.map((opp) => {
              const qty = getQuantity(opp.pair_symbol);
              const totalValue = getTotalValue(opp, qty);
              const entryValidation = validateExecution(opp, 'ENTRY', qty);
              const exitValidation = validateExecution(opp, 'EXIT', qty);

              return (
                <Card key={opp.pair_symbol} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{opp.pair_symbol}</h4>
                          {simulationMode && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                              Simulação
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Spot: ${opp.spot_bid_price.toFixed(4)}
                        </div>
                      </div>

                      {/* Spreads */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>Entrada (LONG)</span>
                          </div>
                          <div className="text-xl font-bold text-green-500">
                            +{opp.spread_net_percent_entrada.toFixed(4)}%
                          </div>
                        </div>
                        <div className="space-y-1 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingDown className="h-3 w-3" />
                            <span>Saída (SHORT)</span>
                          </div>
                          <div className="text-xl font-bold text-blue-500">
                            +{opp.spread_net_percent_saida.toFixed(4)}%
                          </div>
                        </div>
                      </div>

                      {/* Volumes */}
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>Vol. Spot: ${(opp.spot_volume_24h / 1000).toFixed(0)}k</div>
                        <div>Vol. Futuros: ${(opp.futures_volume_24h / 1000).toFixed(0)}k</div>
                      </div>

                      {/* Quantity Input */}
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Label htmlFor={`qty-${opp.pair_symbol}`} className="text-sm">
                          Quantidade para executar
                        </Label>
                        <Input
                          id={`qty-${opp.pair_symbol}`}
                          type="number"
                          placeholder="Ex: 0.5"
                          value={qty}
                          onChange={(e) => setQuantity(opp.pair_symbol, e.target.value)}
                          step="0.001"
                          min="0"
                          className="text-base"
                        />
                        {qty && totalValue > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Valor total: ${totalValue.toFixed(2)} USDT
                            {totalValue > maxOperationValue && (
                              <span className="text-destructive ml-1">
                                (excede máximo de ${maxOperationValue})
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <div className="flex-1 space-y-1">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleExecute(opp, 'ENTRY')}
                            disabled={executing || !entryValidation.valid}
                          >
                            {executing && selectedOpp?.pair_symbol === opp.pair_symbol && selectedSide === 'ENTRY' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ArrowUpCircle className="h-4 w-4 mr-1" />
                                Entrada
                              </>
                            )}
                          </Button>
                          {!entryValidation.valid && qty && (
                            <p className="text-xs text-destructive text-center">{entryValidation.reason}</p>
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleExecute(opp, 'EXIT')}
                            disabled={executing || !exitValidation.valid}
                          >
                            {executing && selectedOpp?.pair_symbol === opp.pair_symbol && selectedSide === 'EXIT' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ArrowDownCircle className="h-4 w-4 mr-1" />
                                Saída
                              </>
                            )}
                          </Button>
                          {!exitValidation.valid && qty && (
                            <p className="text-xs text-destructive text-center">{exitValidation.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Execução</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div>
                <strong>Par:</strong> {selectedOpp?.pair_symbol}
              </div>
              <div>
                <strong>Operação:</strong> {selectedSide === 'ENTRY' ? 'Entrada (LONG)' : 'Saída (SHORT)'}
              </div>
              <div>
                <strong>Quantidade:</strong> {getQuantity(selectedOpp?.pair_symbol || '')} unidades
              </div>
              <div>
                <strong>Spread:</strong>{' '}
                {selectedSide === 'ENTRY'
                  ? selectedOpp?.spread_net_percent_entrada.toFixed(4)
                  : selectedOpp?.spread_net_percent_saida.toFixed(4)}
                %
              </div>
              {simulationMode && (
                <Alert className="mt-3">
                  <AlertDescription>
                    <strong>Modo Simulação:</strong> Nenhuma ordem real será executada.
                  </AlertDescription>
                </Alert>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedOpp && selectedSide && executeOrder(selectedOpp, selectedSide)}>
              Confirmar Execução
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MexcExecutionPanel;
