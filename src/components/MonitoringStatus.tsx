import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-card/50 cursor-default">
          {isMonitoring ? (
            <>
              <div className="relative">
                <Wifi className="w-5 h-5 text-profit drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-profit rounded-full animate-ping" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-profit rounded-full" />
              </div>
              <span className="text-xs font-medium text-profit hidden sm:block">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground hidden sm:block">Offline</span>
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-xs">
          {isMonitoring ? (
            <>
              <p className="font-semibold text-profit">Sistema Ativo</p>
              <p className="text-muted-foreground">Atualizado {timeAgo(lastUpdate)}</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Sistema Inativo</p>
              <p className="text-muted-foreground">Aguardando dados...</p>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default MonitoringStatus;
