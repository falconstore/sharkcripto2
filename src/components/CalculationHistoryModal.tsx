import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Trash2, Upload } from 'lucide-react';
import { useCalculationHistory } from '@/hooks/useCalculationHistory';
import { format } from 'date-fns';

interface CalculationHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadCalculation?: (calculation: any) => void;
}

const CalculationHistoryModal = ({ 
  open, 
  onOpenChange, 
  onLoadCalculation 
}: CalculationHistoryModalProps) => {
  const { history, deleteCalculation } = useCalculationHistory();

  const handleLoad = (calc: any) => {
    if (onLoadCalculation) {
      onLoadCalculation(calc);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-gold" />
            Histórico de Cálculos ({history.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {history.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum cálculo salvo ainda
              </CardContent>
            </Card>
          ) : (
            history.map((calc) => (
              <Card key={calc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {calc.pair_symbol && (
                          <Badge variant="outline" className="font-mono">
                            {calc.pair_symbol}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {calc.created_at && format(new Date(calc.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Investido:</span>
                          <span className="font-mono ml-1">${calc.valor_investido.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lucro USD:</span>
                          <span className={`font-mono ml-1 font-semibold ${calc.lucro_usd >= 0 ? 'text-profit' : 'text-destructive'}`}>
                            ${calc.lucro_usd.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lucro BRL:</span>
                          <span className={`font-mono ml-1 font-semibold ${calc.lucro_brl >= 0 ? 'text-profit' : 'text-destructive'}`}>
                            R${calc.lucro_brl.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Var. Total:</span>
                          <Badge 
                            variant={calc.var_total >= 0 ? 'default' : 'destructive'}
                            className="ml-1"
                          >
                            {calc.var_total.toFixed(4)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Entrada: ${calc.entrada_spot.toFixed(8)} / ${calc.entrada_futuro.toFixed(8)}
                        {calc.fechamento_spot && calc.fechamento_futuro && (
                          <> | Saída: ${calc.fechamento_spot.toFixed(8)} / ${calc.fechamento_futuro.toFixed(8)}</>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {onLoadCalculation && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleLoad(calc)}
                          title="Carregar cálculo"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => calc.id && deleteCalculation(calc.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalculationHistoryModal;
