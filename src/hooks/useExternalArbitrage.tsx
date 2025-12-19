import { create } from 'zustand';
import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
export interface ExternalOpportunity {
  id: string;
  code: string;
  symbol: string;
  
  // Compra
  buyFrom: string;
  buyType: 'SPOT' | 'FUTURES';
  buyPrice: number;
  buyVol24: string;
  buyFundingRate: string | null;
  
  // Venda
  sellTo: string;
  sellType: 'SPOT' | 'FUTURES';
  sellPrice: number;
  sellVol24: string;
  sellFundingRate: string | null;
  
  // Spreads
  entrySpread: number;
  exitSpread: number;
  
  // Metadata
  timestamp: string;
  current: string;
  histCruzamento: string | null;
}

interface ExternalArbitrageStore {
  opportunities: ExternalOpportunity[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: string | null;
  totalCount: number;
  setOpportunities: (opportunities: ExternalOpportunity[], count: number) => void;
  setConnectionState: (isConnected: boolean, isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useExternalArbitrageStore = create<ExternalArbitrageStore>((set) => ({
  opportunities: [],
  isConnected: false,
  isConnecting: false,
  error: null,
  lastUpdate: null,
  totalCount: 0,
  setOpportunities: (opportunities, count) => set({ 
    opportunities, 
    totalCount: count,
    lastUpdate: new Date().toISOString() 
  }),
  setConnectionState: (isConnected, isConnecting) => set({ isConnected, isConnecting }),
  setError: (error) => set({ error }),
  clear: () => set({ opportunities: [], isConnected: false, isConnecting: false, error: null, lastUpdate: null, totalCount: 0 }),
}));

// Token do WebSocket - em produção, isso deveria vir de uma edge function
const WS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNjEwIiwiaWF0IjoxNzY2MTY5NzY1LCJleHAiOjE3NjY3NzQ1NjUsInVzdWFyaW8iOiJuYWx2YW1lbG8yOTEiLCJ0ZWxlZ3JhbV9pZCI6IiIsInJvbGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJpZF9lbmNyeXB0ZWQiOiJYb3ZGbC0xQjZab2ZiY3htZ2l4cXg3ODROdm5EWlljSHM4bGdweGdNMkZZIn0._0dL8Av7A-1EqUOwlIqr1uz8GoEimr1wm0jowWENQwQ';
const WS_URL = `wss://futurosv4.arbmastercrypto.shop/api/v1/websocket?token=${WS_TOKEN}`;

export const useExternalArbitrage = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const pendingDataRef = useRef<string | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const THROTTLE_MS = 1000; // Máximo 1 update por segundo
  
  const { 
    opportunities, 
    isConnected, 
    isConnecting, 
    error, 
    lastUpdate,
    totalCount,
    setOpportunities, 
    setConnectionState, 
    setError,
    clear 
  } = useExternalArbitrageStore();

  const parseMessage = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.data && Array.isArray(parsed.data)) {
        const opportunities: ExternalOpportunity[] = parsed.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          symbol: item.symbol,
          buyFrom: item.buyFrom,
          buyType: item.buyType,
          buyPrice: parseFloat(item.buyPrice) || 0,
          buyVol24: item.buyVol24 || '0',
          buyFundingRate: item.buyFundingRate,
          sellTo: item.sellTo,
          sellType: item.sellType,
          sellPrice: parseFloat(item.sellPrice) || 0,
          sellVol24: item.sellVol24 || '0',
          sellFundingRate: item.sellFundingRate,
          entrySpread: parseFloat(item.entrySpread) || 0,
          exitSpread: parseFloat(item.exitSpread) || 0,
          timestamp: item.timestamp,
          current: item.current,
          histCruzamento: item.histCruzamento,
        }));
        
        setOpportunities(opportunities, parsed.count || opportunities.length);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  }, [setOpportunities]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (isConnecting) {
      console.log('Already connecting...');
      return;
    }

    setConnectionState(false, true);
    setError(null);

    try {
      console.log('Connecting to external WebSocket...');
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('External WebSocket connected');
        setConnectionState(true, false);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        
        // Throttle: se passou menos de THROTTLE_MS, guarda os dados e agenda update
        if (timeSinceLastUpdate < THROTTLE_MS) {
          pendingDataRef.current = event.data;
          
          // Se não há timeout agendado, agendar
          if (!throttleTimeoutRef.current) {
            throttleTimeoutRef.current = setTimeout(() => {
              if (pendingDataRef.current) {
                parseMessage(pendingDataRef.current);
                lastUpdateTimeRef.current = Date.now();
                pendingDataRef.current = null;
              }
              throttleTimeoutRef.current = null;
            }, THROTTLE_MS - timeSinceLastUpdate);
          }
        } else {
          // Passou tempo suficiente, atualiza imediatamente
          parseMessage(event.data);
          lastUpdateTimeRef.current = now;
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Erro na conexão WebSocket');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionState(false, false);
        wsRef.current = null;

        // Reconectar automaticamente se não foi fechamento intencional
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setConnectionState(false, false);
      setError('Falha ao criar conexão WebSocket');
    }
  }, [isConnecting, parseMessage, setConnectionState, setError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    clear();
  }, [clear]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
      }
    };
  }, []);

  return {
    opportunities,
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    totalCount,
    connect,
    disconnect,
  };
};

// Exchange badge colors
export const EXCHANGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  mexc: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  htx: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  kucoin: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
  bitget: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  bingx: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  gate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
};

export const getExchangeColor = (exchange: string) => {
  const key = exchange.toLowerCase();
  return EXCHANGE_COLORS[key] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' };
};
