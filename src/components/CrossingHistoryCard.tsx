import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { Crossing } from '@/hooks/useCrossings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CrossingHistoryCardProps {
  crossing: Crossing;
}

const CrossingHistoryCard = ({ crossing }: CrossingHistoryCardProps) => {
  const formatDate = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 animate-fade-in">
      <div className="space-y-1">
        <p className="font-mono text-sm">{formatDate(crossing.timestamp)}</p>
        <p className="text-lg font-semibold text-profit">
          {formatPercent(crossing.spread_net_percent_saida)}
        </p>
      </div>
      <Badge variant="default" className="bg-green-600">
        <TrendingUp className="h-3 w-3 mr-1" />
        Positivo
      </Badge>
    </div>
  );
};

export default CrossingHistoryCard;
