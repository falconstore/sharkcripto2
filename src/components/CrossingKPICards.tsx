import { KPIData } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Trophy, Clock, Target } from 'lucide-react';

interface CrossingKPICardsProps {
  data: KPIData;
  loading: boolean;
}

const CrossingKPICards = ({ data, loading }: CrossingKPICardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Formatar spread com limite máximo de 10%
  const formatSpread = (spread: number) => {
    const limitedSpread = Math.min(spread, 10);
    return `+${limitedSpread.toFixed(4)}%`;
  };

  const cards = [
    {
      title: 'Total de Cruzamentos',
      value: data.totalCrossings.toLocaleString('pt-BR'),
      icon: TrendingUp,
      color: 'text-blue-500',
    },
    {
      title: 'Moeda Campeã',
      value: data.topCoin ? `${data.topCoin.symbol} (${data.topCoin.count}x)` : 'N/A',
      icon: Trophy,
      color: 'text-gold',
    },
    {
      title: 'Média por Hora',
      value: data.avgCrossingsPerHour.toFixed(1),
      icon: Clock,
      color: 'text-green-500',
    },
    {
      title: 'Melhor % Saída',
      value: formatSpread(data.bestSpread),
      icon: Target,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CrossingKPICards;
