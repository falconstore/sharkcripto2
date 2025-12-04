import { KPIData } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Trophy, Clock, Target } from 'lucide-react';

interface CrossingKPICardsProps {
  data: KPIData;
  loading: boolean;
}

const CrossingKPICards = ({ data, loading }: CrossingKPICardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card 
            key={i} 
            className="relative overflow-hidden animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
            <CardHeader className="pb-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatSpread = (spread: number) => {
    const limitedSpread = Math.min(spread, 10);
    return `+${limitedSpread.toFixed(4)}%`;
  };

  const cards = [
    {
      title: 'Total de Cruzamentos',
      value: data.totalCrossings.toLocaleString('pt-BR'),
      icon: TrendingUp,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
      glowColor: 'group-hover:shadow-blue-500/20',
    },
    {
      title: 'Moeda Campeã',
      value: data.topCoin ? `${data.topCoin.symbol} (${data.topCoin.count}x)` : 'N/A',
      icon: Trophy,
      gradient: 'from-gold/20 to-orange-500/20',
      iconColor: 'text-gold',
      glowColor: 'group-hover:shadow-gold/20',
    },
    {
      title: 'Média por Hora',
      value: data.avgCrossingsPerHour.toFixed(1),
      icon: Clock,
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500',
      glowColor: 'group-hover:shadow-green-500/20',
    },
    {
      title: 'Melhor % Saída',
      value: formatSpread(data.bestSpread),
      icon: Target,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
      glowColor: 'group-hover:shadow-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.title} 
            className={`
              group relative overflow-hidden 
              hover:scale-[1.02] transition-all duration-300 
              border-border/50 bg-card/80 backdrop-blur-sm
              hover:border-primary/50 cursor-default
              animate-fade-in ${card.glowColor} hover:shadow-lg
            `}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            {/* Glow effect on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
            
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-background/50 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CrossingKPICards;
