import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, Clock, Wifi, Server } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

type MonitoringMode = 'realtime' | 'rest';

const StartMonitoringButton = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [mode, setMode] = useState<MonitoringMode>('realtime');
  const { updateInterval, setUpdateInterval } = usePreferences();
  const { isRunning, startMonitoring, stopMonitoring } = useGlobalMonitoring();

  const handleStart = async () => {
    if (mode === 'realtime') {
      // Modo Realtime: dados vêm do servidor Node.js via Supabase Realtime
      toast.success('Modo Realtime ativado!', {
        description: 'Certifique-se que o servidor Node.js está rodando no seu PC.'
      });
      return;
    }

    // Modo REST: fallback usando Edge Function
    setIsStarting(true);
    
    try {
      await startMonitoring(updateInterval);
      
      toast.success('Monitor REST iniciado!', {
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
      {/* Seletor de Modo */}
      <div className="flex items-center gap-2">
        <Select
          value={mode}
          onValueChange={(value) => setMode(value as MonitoringMode)}
          disabled={isRunning}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="realtime">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                <span>Realtime (VPS)</span>
              </div>
            </SelectItem>
            <SelectItem value="rest">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                <span>REST (Fallback)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Intervalo (só para modo REST) */}
      {mode === 'rest' && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Select
            value={updateInterval.toString()}
            onValueChange={(value) => setUpdateInterval(Number(value))}
            disabled={isRunning}
          >
            <SelectTrigger className="w-[120px]">
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
      )}

      {/* Badge de status */}
      {mode === 'realtime' && (
        <Badge variant="outline" className="text-profit border-profit">
          <Wifi className="w-3 h-3 mr-1" />
          WebSocket
        </Badge>
      )}
      
      {mode === 'rest' ? (
        !isRunning ? (
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
                Iniciar REST
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
            Parar REST
          </Button>
        )
      ) : (
        <Button
          variant="outline"
          size="lg"
          className="border-profit text-profit hover:bg-profit/10"
          onClick={() => {
            toast.info('Dados chegam automaticamente', {
              description: 'Execute "npm start" na pasta mexc-websocket-monitor'
            });
          }}
        >
          <Wifi className="mr-2 w-5 h-5" />
          Aguardando Dados
        </Button>
      )}
    </div>
  );
};

export default StartMonitoringButton;