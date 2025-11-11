import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
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
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const { setOpportunities } = useOpportunities();
  const { updateInterval, setUpdateInterval } = usePreferences();

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket já conectado');
      return;
    }

    setIsStarting(true);
    console.log('🔌 Conectando ao WebSocket...');

    // URL completa da edge function WebSocket
    const wsUrl = 'wss://jschuymzkukzthesevoy.supabase.co/functions/v1/mexc-realtime-websocket';
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket conectado!');
      setIsConnected(true);
      setIsRunning(true);
      isRunningRef.current = true;
      setIsStarting(false);
      
      toast.success('Monitor de arbitragem iniciado!', {
        description: 'Recebendo atualizações em tempo real'
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'opportunities' && message.data) {
          console.log(`📊 Recebidas ${message.data.length} oportunidades`);
          setOpportunities(message.data);
        }
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Erro no WebSocket:', error);
      setIsConnected(false);
      setIsStarting(false);
      
      toast.error('Erro na conexão', {
        description: 'Tentando reconectar...'
      });
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
      setIsConnected(false);
      wsRef.current = null;

      // Reconectar automaticamente se ainda estiver "running"
      if (isRunningRef.current) {
        console.log('♻️ Reconectando em 5 segundos...');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    };
  };

  const stopMonitoring = () => {
    console.log('🛑 Parando monitoramento...');
    
    isRunningRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsRunning(false);
    setIsConnected(false);
    setOpportunities([]);
    
    toast.info('Monitor parado', {
      description: 'O monitoramento foi interrompido'
    });
  };

  const startMonitoring = () => {
    connectWebSocket();
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isConnected && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-md">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-500">Tempo Real</span>
          </div>
        )}
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