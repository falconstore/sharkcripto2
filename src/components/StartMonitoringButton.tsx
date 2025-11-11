import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences } from '@/hooks/usePreferences';
import { useGlobalMonitoring } from '@/hooks/useGlobalMonitoring';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const StartMonitoringButton = () => {
  const [isStarting, setIsStarting] = useState(false);
  const { updateInterval, setUpdateInterval } = usePreferences();
  const { isRunning, startMonitoring, stopMonitoring } = useGlobalMonitoring();

  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      await startMonitoring(updateInterval);
      
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

  const handleStop = () => {
    stopMonitoring();
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
          onClick={handleStart}
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
          onClick={handleStop}
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