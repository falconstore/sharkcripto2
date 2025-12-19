import { useState, useCallback } from 'react';
import { format, subHours } from 'date-fns';

// Token do WebSocket - em produção, isso deveria vir de uma edge function
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNjEwIiwiaWF0IjoxNzY2MTY5NzY1LCJleHAiOjE3NjY3NzQ1NjUsInVzdWFyaW8iOiJuYWx2YW1lbG8yOTEiLCJ0ZWxlZ3JhbV9pZCI6IiIsInJvbGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJpZF9lbmNyeXB0ZWQiOiJYb3ZGbC0xQjZab2ZiY3htZ2l4cXg3ODROdm5EWlljSHM4bGdweGdNMkZZIn0._0dL8Av7A-1EqUOwlIqr1uz8GoEimr1wm0jowWENQwQ';
const API_URL = 'https://futurosv3.arbmastercrypto.shop/api/v1/buy-sell-data';

export interface SpreadEvent {
  timestamp: string;
  bidPrice: number;
  askPrice: number;
  spread: number;
  exchange1?: string;
  exchange2?: string;
}

export interface SpreadHistoryData {
  entry: SpreadEvent[];
  exit: SpreadEvent[];
  stats: {
    entry: { max: number; min: number; avg: number; count: number };
    exit: { max: number; min: number; avg: number; count: number };
  };
}

export interface UseExternalSpreadHistoryParams {
  buyExchange: string;
  buySymbol: string;
  sellExchange: string;
  sellSymbol: string;
  hoursBack?: number;
  minEntrySpread?: number;
}

const calculateStats = (events: SpreadEvent[]) => {
  if (events.length === 0) {
    return { max: 0, min: 0, avg: 0, count: 0 };
  }
  
  const spreads = events.map(e => Math.abs(e.spread));
  return {
    max: Math.max(...spreads),
    min: Math.min(...spreads),
    avg: spreads.reduce((a, b) => a + b, 0) / spreads.length,
    count: events.length
  };
};

export const useExternalSpreadHistory = () => {
  const [data, setData] = useState<SpreadHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async ({
    buyExchange,
    buySymbol,
    sellExchange,
    sellSymbol,
    hoursBack = 24,
    minEntrySpread = 0
  }: UseExternalSpreadHistoryParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startDate = subHours(now, hoursBack);
      
      // Formatar símbolos - a API pode esperar formatos diferentes
      // Spot: "BTC/USDT", Futures: "BTC/USDT:USDT"
      const formatSymbol = (symbol: string, market: 'spot' | 'futures') => {
        const cleanSymbol = symbol.replace('USDT', '').replace('_P', '');
        if (market === 'futures') {
          return `${cleanSymbol}/USDT:USDT`;
        }
        return `${cleanSymbol}/USDT`;
      };

      const payload = {
        buy_exchange: buyExchange.toLowerCase(),
        buy_symbol: formatSymbol(buySymbol, 'spot'),
        sell_exchange: sellExchange.toLowerCase(),
        sell_symbol: formatSymbol(sellSymbol, 'futures'),
        date_start: format(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        date_end: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        min_entry_spread: minEntrySpread
      };

      console.log('Fetching spread history with payload:', payload);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Spread history response:', result);

      // Processar dados de entrada (entry) e saída (exit)
      const entryEvents: SpreadEvent[] = (result.entry || []).map((item: any) => ({
        timestamp: item.timestamp || item.time,
        bidPrice: parseFloat(item.bid_price || item.bidPrice) || 0,
        askPrice: parseFloat(item.ask_price || item.askPrice) || 0,
        spread: parseFloat(item.spread || item.entry_spread) || 0,
      }));

      const exitEvents: SpreadEvent[] = (result.exit || []).map((item: any) => ({
        timestamp: item.timestamp || item.time,
        bidPrice: parseFloat(item.bid_price || item.bidPrice) || 0,
        askPrice: parseFloat(item.ask_price || item.askPrice) || 0,
        spread: parseFloat(item.spread || item.exit_spread) || 0,
      }));

      setData({
        entry: entryEvents,
        exit: exitEvents,
        stats: {
          entry: calculateStats(entryEvents),
          exit: calculateStats(exitEvents)
        }
      });
    } catch (err) {
      console.error('Error fetching spread history:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar histórico');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchHistory,
    clear
  };
};
