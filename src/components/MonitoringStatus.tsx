import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const MonitoringStatus = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Verificar se há dados recentes (últimos 30 segundos)
    const checkStatus = async () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('arbitrage_opportunities')
        .select('timestamp')
        .gte('timestamp', thirtySecondsAgo)
        .limit(1);

      if (data && data.length > 0) {
        setIsMonitoring(true);
        setLastUpdate(new Date(data[0].timestamp));
      } else {
        setIsMonitoring(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    // Realtime para detectar novas oportunidades
    const channel = supabase
      .channel('monitoring-status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'arbitrage_opportunities'
        },
        (payload) => {
          setIsMonitoring(true);
          setLastUpdate(new Date(payload.new.timestamp));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const timeAgo = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 10) return 'Agora mesmo';
    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
    return `${Math.floor(seconds / 3600)}h atrás`;
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMonitoring ? (
              <>
                <div className="relative">
                  <Wifi className="w-6 h-6 text-profit drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-profit rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Sistema Ativo</span>
                    <Badge 
                      variant="outline" 
                      className="bg-profit/20 text-profit border-profit/30 animate-pulse font-semibold"
                    >
                      ● Monitorando
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Todos os pares USDT • Atualizado {timeAgo(lastUpdate)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-muted-foreground" />
                <div>
                  <span className="text-sm font-semibold text-muted-foreground">Sistema Inativo</span>
                  <p className="text-xs text-muted-foreground">
                    Aguardando dados... {timeAgo(lastUpdate)}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${isMonitoring ? 'animate-spin text-profit drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitoringStatus;