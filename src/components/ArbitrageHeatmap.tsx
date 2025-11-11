import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface Opportunity {
  id: string;
  pair_symbol: string;
  spread_net_percent: number;
  spot_volume_24h: number;
  futures_volume_24h: number;
}

const ArbitrageHeatmap = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    fetchOpportunities();

    const channel = supabase
      .channel('heatmap-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arbitrage_opportunities'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newOpp = payload.new as Opportunity;
            
            setOpportunities(prev => {
              const existing = prev.find(o => o.id === newOpp.id);
              if (existing) {
                return prev.map(o => o.id === newOpp.id ? newOpp : o);
              } else {
                return [...prev, newOpp];
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOpportunities = async () => {
    const { data, error } = await supabase
      .from('arbitrage_opportunities')
      .select('id, pair_symbol, spread_net_percent, spot_volume_24h, futures_volume_24h')
      .eq('is_active', true)
      .order('spread_net_percent', { ascending: false })
      .limit(50);

    if (data) {
      setOpportunities(data);
    }
  };

  const getHeatmapColor = (spread: number) => {
    // 0% = azul escuro, 0.5% = azul claro, 1%+ = dourado
    if (spread < 0) return 'rgba(220, 38, 38, 0.7)'; // Vermelho para negativo
    if (spread < 0.3) return 'rgba(59, 130, 246, 0.5)'; // Azul escuro
    if (spread < 0.6) return 'rgba(96, 165, 250, 0.6)'; // Azul médio
    if (spread < 1.0) return 'rgba(147, 197, 253, 0.7)'; // Azul claro
    if (spread < 1.5) return 'rgba(251, 191, 36, 0.7)'; // Amarelo/Dourado
    return 'rgba(234, 179, 8, 0.9)'; // Dourado forte
  };

  const getTextColor = (spread: number) => {
    if (spread >= 1.0) return 'text-gold-foreground';
    return 'text-foreground';
  };

  return (
    <Card className="bg-gradient-card hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold" />
          Mapa de Calor - Spreads por Par
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {opportunities.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Aguardando dados do heatmap...
            </div>
          ) : (
            opportunities.map((opp) => (
              <div
                key={opp.id}
                className="group relative p-3 rounded-lg border transition-all duration-300 hover:scale-105 hover:z-10 cursor-pointer"
                style={{
                  backgroundColor: getHeatmapColor(opp.spread_net_percent),
                  borderColor: opp.spread_net_percent >= 1.0 ? 'hsl(var(--gold))' : 'hsl(var(--border))',
                }}
              >
                <div className={`text-xs font-mono font-semibold ${getTextColor(opp.spread_net_percent)}`}>
                  {opp.pair_symbol}
                </div>
                <div className={`text-lg font-bold ${getTextColor(opp.spread_net_percent)}`}>
                  {opp.spread_net_percent.toFixed(2)}%
                </div>
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  <div className="font-semibold mb-1">{opp.pair_symbol}</div>
                  <div>Spread: {opp.spread_net_percent.toFixed(4)}%</div>
                  <div>Vol. Spot: ${(opp.spot_volume_24h / 1000).toFixed(0)}K</div>
                  <div>Vol. Futuros: ${(opp.futures_volume_24h / 1000).toFixed(0)}K</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legenda */}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }} />
            <span className="text-muted-foreground">&lt; 0.3%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(147, 197, 253, 0.7)' }} />
            <span className="text-muted-foreground">0.3-1.0%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-gold" style={{ backgroundColor: 'rgba(234, 179, 8, 0.9)' }} />
            <span className="text-gold font-semibold">&gt; 1.0%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArbitrageHeatmap;