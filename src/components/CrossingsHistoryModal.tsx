import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCrossings, Crossing } from '@/hooks/useCrossings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import CrossingHistoryCard from './CrossingHistoryCard';

interface CrossingsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pairSymbol: string;
}

type Period = '15m' | '30m' | '1h' | '2h';

const PERIOD_LABELS: Record<Period, string> = {
  '15m': '15 minutos',
  '30m': '30 minutos',
  '1h': '1 hora',
  '2h': '2 horas',
};

const CrossingsHistoryModal = ({ open, onOpenChange, pairSymbol }: CrossingsHistoryModalProps) => {
  const { fetchCrossingHistory } = useCrossings();
  const [period, setPeriod] = useState<Period>('1h');
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, period, pairSymbol]);

  const loadHistory = async () => {
    setLoading(true);
    const history = await fetchCrossingHistory(pairSymbol, period);
    setCrossings(history);
    setLoading(false);
  };

  const formatDate = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="truncate">Histórico - {pairSymbol}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtros de Período */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="text-xs sm:text-sm"
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>

          {/* Total de Cruzamentos */}
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Total de cruzamentos em {PERIOD_LABELS[period]}:
            </p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{crossings.length}</p>
          </div>

          {/* Lista de Histórico - Cards no mobile, Tabela no desktop */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando histórico...
              </div>
            ) : crossings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cruzamento encontrado neste período
              </div>
            ) : isMobile ? (
              <div className="space-y-2">
                {crossings.map((crossing) => (
                  <CrossingHistoryCard key={crossing.id} crossing={crossing} />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead className="text-right">% Saída</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossings.map((crossing) => (
                      <TableRow key={crossing.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(crossing.timestamp)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatPercent(crossing.spread_net_percent_saida)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="bg-green-600">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Positivo
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CrossingsHistoryModal;
