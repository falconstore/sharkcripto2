import { useMemo } from 'react';
import { TrendingUp, Activity, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePreferences } from '@/hooks/usePreferences';

const DashboardStats = () => {
  const { opportunities } = useOpportunities();
  const { blacklist } = usePreferences();

  const stats = useMemo(() => {
    // Filtrar blacklist
    const filtered = opportunities.filter(opp => !blacklist.has(opp.pair_symbol));
    
    if (filtered.length === 0) {
      return {
        activeOpportunities: 0,
        bestSpread: 0,
        totalVolume24h: 0,
        uniquePairs: 0,
      };
    }

    // Contar apenas oportunidades com spread > 0.01%
    const activeOpps = filtered.filter(opp => opp.spread_net_percent > 0.01);
    
    return {
      activeOpportunities: activeOpps.length,
      bestSpread: Math.max(...filtered.map(o => o.spread_net_percent)),
      totalVolume24h: filtered.reduce((sum, o) => sum + o.spot_volume_24h + o.futures_volume_24h, 0),
      uniquePairs: filtered.length,
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

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Pares Monitorados</div>
                <Activity className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]" />
              </div>
              <div className="text-3xl font-bold animate-fade-in">{stats.uniquePairs}</div>
              <p className="text-xs text-muted-foreground mt-1">USDT pares ativos</p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total de pares de trading USDT sendo monitorados no momento</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Oportunidades Ativas</div>
                <TrendingUp className="w-6 h-6 text-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" />
              </div>
              <div className="text-3xl font-bold text-gold animate-pulse">
                {stats.activeOpportunities}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 5 minutos</p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Oportunidades com spread maior que 0.01% detectadas recentemente</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Melhor Spread</div>
                <TrendingUp className="w-6 h-6 text-profit drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              </div>
              <div className="text-3xl font-bold text-profit animate-fade-in">
                {stats.bestSpread > 0 ? `${stats.bestSpread.toFixed(4)}%` : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Spread líquido máximo</p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Maior diferença percentual entre preços spot e futuros (após taxas)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-muted-foreground">Volume Total 24h</div>
                <DollarSign className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]" />
              </div>
              <div className="text-3xl font-bold animate-fade-in">
                {stats.totalVolume24h > 0 ? formatVolume(stats.totalVolume24h) : '--'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Spot + Futuros combinados</p>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Soma do volume de negociação nas últimas 24h (spot + futuros)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default DashboardStats;