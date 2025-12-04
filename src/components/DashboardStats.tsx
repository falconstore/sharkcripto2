import { useMemo } from 'react';
import { TrendingUp, Activity, DollarSign, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePreferences } from '@/hooks/usePreferences';

const DashboardStats = () => {
  const { opportunities } = useOpportunities();
  const { blacklist } = usePreferences();

  const stats = useMemo(() => {
    const filtered = opportunities.filter(opp => !blacklist.has(opp.pair_symbol));
    if (filtered.length === 0) {
      return {
        activeOpportunities: 0,
        bestSpread: 0,
        totalVolume24h: 0,
        uniquePairs: 0
      };
    }

    const activeOpps = filtered.filter(opp => opp.spread_net_percent > 0.01);
    return {
      activeOpportunities: activeOpps.length,
      bestSpread: Math.max(...filtered.map(o => o.spread_net_percent)),
      totalVolume24h: filtered.reduce((sum, o) => sum + o.spot_volume_24h + o.futures_volume_24h, 0),
      uniquePairs: filtered.length
    };
  }, [opportunities, blacklist]);

  const formatVolume = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return `$${(num / 1000).toFixed(0)}K`;
  };

  const cards = [
    {
      label: 'Pares Monitorados',
      value: stats.uniquePairs,
      subtitle: 'USDT pares ativos',
      icon: Activity,
      tooltip: 'Total de pares de trading USDT sendo monitorados no momento',
      iconColor: 'text-primary',
      delay: '0s'
    },
    {
      label: 'Oportunidades Ativas',
      value: stats.activeOpportunities,
      subtitle: 'Últimos 5 minutos',
      icon: TrendingUp,
      tooltip: 'Oportunidades com spread maior que 0.01% detectadas recentemente',
      iconColor: 'text-primary',
      pulse: true,
      delay: '0.1s'
    },
    {
      label: 'Melhor Spread',
      value: stats.bestSpread > 0 ? `${stats.bestSpread.toFixed(2)}%` : '--',
      subtitle: 'Spread líquido atual',
      icon: Zap,
      tooltip: 'Maior diferença percentual entre preços spot e futuros (após taxas)',
      iconColor: 'text-accent',
      highlight: true,
      delay: '0.2s'
    },
    {
      label: 'Volume Total 24h',
      value: stats.totalVolume24h > 0 ? formatVolume(stats.totalVolume24h) : '--',
      subtitle: 'Spot + Futuros combinados',
      icon: DollarSign,
      tooltip: 'Soma do volume de negociação nas últimas 24h (spot + futuros)',
      iconColor: 'text-primary',
      delay: '0.3s'
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Tooltip key={card.label}>
              <TooltipTrigger asChild>
                <div 
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 animate-fade-in-up cursor-pointer"
                  style={{ animationDelay: card.delay }}
                >
                  {/* Animated gradient border on hover */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                  
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  
                  {/* Glow effect for highlight cards */}
                  {card.highlight && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-pulse-glow -z-20" />
                  )}
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {card.label}
                      </span>
                      <div className={`p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110 ${card.pulse ? 'animate-pulse-gold' : ''}`}>
                        <Icon className={`w-5 h-5 ${card.iconColor} drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]`} />
                      </div>
                    </div>
                    
                    <div className={`text-3xl font-bold mb-1 transition-all duration-300 group-hover:text-gradient-gold ${card.highlight ? 'text-gradient-gold' : ''} ${card.pulse ? 'animate-pulse-gold' : ''}`}>
                      {card.value}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {card.subtitle}
                    </p>
                    
                    {/* Bottom accent line */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{card.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default DashboardStats;
