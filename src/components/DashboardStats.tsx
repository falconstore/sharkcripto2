import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Activity, DollarSign } from 'lucide-react';

interface Stats {
  activeOpportunities: number;
  bestSpread: number;
  totalVolume24h: number;
  uniquePairs: number;
}

const DashboardStats = () => {
  const [stats, setStats] = useState<Stats>({
    activeOpportunities: 0,
    bestSpread: 0,
    totalVolume24h: 0,
    uniquePairs: 0,
  });

  useEffect(() => {
    fetchStats();

    // Atualizar stats a cada 10 segundos
    const interval = setInterval(fetchStats, 10000);

    // Realtime para atualizações instantâneas
    const channel = supabase
      .channel('stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arbitrage_opportunities'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Buscar oportunidades ativas das últimas 5 minutos
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('arbitrage_opportunities')
        .select('pair_symbol, spread_net_percent, spot_volume_24h, futures_volume_24h')
        .eq('is_active', true)
        .gte('timestamp', fiveMinutesAgo)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      if (data && data.length > 0) {
        // Agrupar por par (pegar apenas o mais recente de cada)
        const latestByPair = new Map<string, typeof data[0]>();
        data.forEach(opp => {
          if (!latestByPair.has(opp.pair_symbol)) {
            latestByPair.set(opp.pair_symbol, opp);
          }
        });

        const uniqueOpps = Array.from(latestByPair.values());
        
        setStats({
          activeOpportunities: uniqueOpps.length,
          bestSpread: Math.max(...uniqueOpps.map(o => o.spread_net_percent)),
          totalVolume24h: uniqueOpps.reduce((sum, o) => sum + o.spot_volume_24h + o.futures_volume_24h, 0),
          uniquePairs: latestByPair.size,
        });
      }
    } catch (error) {
      console.error('Error in fetchStats:', error);
    }
  };

  const formatVolume = (num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return `$${(num / 1000).toFixed(0)}K`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">Pares Monitorados</div>
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div className="text-3xl font-bold">{stats.uniquePairs}</div>
        <p className="text-xs text-muted-foreground mt-1">USDT pares ativos</p>
      </div>

      <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">Oportunidades Ativas</div>
          <TrendingUp className="w-5 h-5 text-gold" />
        </div>
        <div className="text-3xl font-bold text-gold animate-pulse-gold">
          {stats.activeOpportunities}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Últimos 5 minutos</p>
      </div>

      <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">Melhor Spread</div>
          <TrendingUp className="w-5 h-5 text-profit" />
        </div>
        <div className="text-3xl font-bold text-profit">
          {stats.bestSpread > 0 ? `${stats.bestSpread.toFixed(4)}%` : '--'}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Spread líquido máximo</p>
      </div>

      <div className="bg-gradient-card rounded-lg p-6 border border-border hover-lift">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">Volume Total 24h</div>
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div className="text-3xl font-bold">
          {stats.totalVolume24h > 0 ? formatVolume(stats.totalVolume24h) : '--'}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Spot + Futuros combinados</p>
      </div>
    </div>
  );
};

export default DashboardStats;