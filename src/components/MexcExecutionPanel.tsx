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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

const MexcExecutionPanel = () => {
  const { opportunities } = useOpportunities();
  const { minSpread, maxOperationValue, minSpotVolume, minFuturesVolume, simulationMode, autoConfirm } = useMexcConfig();
  const [executing, setExecuting] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [selectedSide, setSelectedSide] = useState<'ENTRY' | 'EXIT' | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);

  const filteredOpps = opportunities.filter(
    (opp) =>
      opp.spot_volume_24h >= minSpotVolume &&
      opp.futures_volume_24h >= minFuturesVolume
  );

  const handleExecute = async (opp: any, side: 'ENTRY' | 'EXIT') => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Informe uma quantidade válida');
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
    setExecuting(true);
    setShowConfirm(false);

    try {
      const { data, error } = await supabase.functions.invoke('mexc-trading-executor', {
        body: {
          symbol: opp.pair_symbol,
          side,
          quantity: parseFloat(quantity),
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
        setQuantity('');
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
      <Card>
        <CardHeader>
          <CardTitle>Painel de Execução</CardTitle>
          <CardDescription>
            {filteredOpps.length} oportunidades disponíveis para execução
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quantity Input */}
            <div className="space-y-2">
              <Label>Quantidade (Unidades)</Label>
              <Input
                type="number"
                placeholder="Ex: 0.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.001"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Valor máximo por operação: ${maxOperationValue.toFixed(0)} USDT
              </p>
            </div>

            {/* Opportunities List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredOpps.map((opp) => (
                <Card key={opp.pair_symbol} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{opp.pair_symbol}</h4>
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>Entrada (LONG)</span>
                          </div>
                          <div className="text-lg font-bold text-green-500">
                            {opp.spread_net_percent_entrada.toFixed(4)}%
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingDown className="h-3 w-3" />
                            <span>Saída (SHORT)</span>
                          </div>
                          <div className="text-lg font-bold text-blue-500">
                            {opp.spread_net_percent_saida.toFixed(4)}%
                          </div>
                        </div>
                      </div>

                      {/* Volumes */}
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>Vol. Spot: ${(opp.spot_volume_24h / 1000).toFixed(0)}k</div>
                        <div>Vol. Futuros: ${(opp.futures_volume_24h / 1000).toFixed(0)}k</div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleExecute(opp, 'ENTRY')}
                          disabled={executing || !quantity || opp.spread_net_percent_entrada < minSpread}
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
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleExecute(opp, 'EXIT')}
                          disabled={executing || !quantity || opp.spread_net_percent_saida < minSpread}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                <strong>Quantidade:</strong> {quantity} unidades
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
