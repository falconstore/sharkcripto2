import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const StartMonitoringButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const startMonitoring = async () => {
    setIsStarting(true);
    
    try {
      const { error } = await supabase.functions.invoke('mexc-arbitrage-monitor', {
        method: 'POST'
      });

      if (error) {
        throw error;
      }

      setIsRunning(true);
      toast.success('Monitor de arbitragem iniciado!', {
        description: 'Os dados começarão a aparecer em alguns segundos'
      });
    } catch (error) {
      console.error('Error starting monitor:', error);
      toast.error('Erro ao iniciar monitor', {
        description: 'Tente novamente em alguns segundos'
      });
    } finally {
      setIsStarting(false);
    }
  };

  const stopMonitoring = () => {
    setIsRunning(false);
    toast.info('Monitor parado', {
      description: 'O monitoramento foi interrompido'
    });
  };

  return (
    <div className="flex items-center gap-3">
      {!isRunning ? (
        <Button
          onClick={startMonitoring}
          disabled={isStarting}
          className="bg-profit hover:bg-profit/90 text-profit-foreground"
          size="lg"
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 w-5 h-5 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Play className="mr-2 w-5 h-5" />
              Iniciar Monitoramento
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={stopMonitoring}
          variant="destructive"
          size="lg"
        >
          <Square className="mr-2 w-5 h-5" />
          Parar Monitoramento
        </Button>
      )}
    </div>
  );
};

export default StartMonitoringButton;