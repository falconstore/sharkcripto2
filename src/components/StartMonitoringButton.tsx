import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePreferences } from '@/hooks/usePreferences';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const StartMonitoringButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [intervalId, setIntervalId] = useState<number | null>(null);
  const { setOpportunities } = useOpportunities();
  const { updateInterval, setUpdateInterval } = usePreferences();

  const callMonitor = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('mexc-arbitrage-monitor', {
        method: 'POST'
      });

      if (error) {
        console.error('Error calling monitor:', error);
        return;
      }

      if (data?.opportunities) {
        setOpportunities(data.opportunities);
      }
    } catch (error) {
      console.error('Error calling monitor:', error);
    }
  };

  const startMonitoring = async () => {
    setIsStarting(true);
    
    try {
      // Primeira chamada imediata
      await callMonitor();

      // Configurar chamadas com intervalo selecionado
      const id = window.setInterval(callMonitor, updateInterval * 1000);
      setIntervalId(id);
      setIsRunning(true);
      
      toast.success('Monitor de arbitragem iniciado!', {
        description: `Atualizando a cada ${updateInterval} segundo${updateInterval > 1 ? 's' : ''}`
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
    if (intervalId) {
      window.clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    setOpportunities([]);
    toast.info('Monitor parado', {
      description: 'O monitoramento foi interrompido'
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <Select
          value={updateInterval.toString()}
          onValueChange={(value) => setUpdateInterval(Number(value))}
          disabled={isRunning}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 segundo</SelectItem>
            <SelectItem value="2">2 segundos</SelectItem>
            <SelectItem value="3">3 segundos</SelectItem>
            <SelectItem value="4">4 segundos</SelectItem>
            <SelectItem value="5">5 segundos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
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