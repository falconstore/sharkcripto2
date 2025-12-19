import { useState, useCallback } from 'react';

// Token da API - em produção, isso deveria vir de uma edge function
const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxNjEwIiwiaWF0IjoxNzY2MTY5NzY1LCJleHAiOjE3NjY3NzQ1NjUsInVzdWFyaW8iOiJuYWx2YW1lbG8yOTEiLCJ0ZWxlZ3JhbV9pZCI6IiIsInJvbGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJpZF9lbmNyeXB0ZWQiOiJYb3ZGbC0xQjZab2ZiY3htZ2l4cXg3ODROdm5EWlljSHM4bGdweGdNMkZZIn0._0dL8Av7A-1EqUOwlIqr1uz8GoEimr1wm0jowWENQwQ';
const API_URL = 'https://arbmastercrypto.shop/crypto/monitorCrypto';

export interface HistoricalDataPoint {
  timestamp: string;
  exchange1Price: number;
  exchange2Price: number;
  spreadPercent: number;
}

export interface MonitorData {
  historicalData: HistoricalDataPoint[];
  totalCrossovers: number;
  lastCrossoverTimestamp: string | null;
  currentSpread: number;
  stats: {
    maxSpread: number;
    minSpread: number;
    avgSpread: number;
    inversions: number;
  };
}

export interface UseExternalMonitorParams {
  symbol: string;
  buyExchange: string;
  buyMarket: 'spot' | 'future';
  sellExchange: string;
  sellMarket: 'spot' | 'future';
}

const calculateStats = (data: HistoricalDataPoint[]) => {
  if (data.length === 0) {
    return { maxSpread: 0, minSpread: 0, avgSpread: 0, inversions: 0 };
  }

  const spreads = data.map(d => d.spreadPercent);
  let inversions = 0;
  
  for (let i = 1; i < spreads.length; i++) {
    if ((spreads[i] >= 0 && spreads[i - 1] < 0) || (spreads[i] < 0 && spreads[i - 1] >= 0)) {
      inversions++;
    }
  }

  return {
    maxSpread: Math.max(...spreads),
    minSpread: Math.min(...spreads),
    avgSpread: spreads.reduce((a, b) => a + b, 0) / spreads.length,
    inversions
  };
};

export const useExternalMonitor = () => {
  const [data, setData] = useState<MonitorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonitorData = useCallback(async ({
    symbol,
    buyExchange,
    buyMarket,
    sellExchange,
    sellMarket
  }: UseExternalMonitorParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // Extrair apenas o símbolo base (ex: "BTCUSDT" -> "BTC")
      const cryptoSymbol = symbol.replace('USDT', '').replace('_P', '').toUpperCase();

      const payload = {
        crypto: cryptoSymbol,
        current: 'USDT',
        buy: {
          exchange: buyExchange.toLowerCase(),
          market: buyMarket
        },
        sell: {
          exchange: sellExchange.toLowerCase(),
          market: sellMarket
        },
        history: true
      };

      console.log('Fetching monitor data with payload:', payload);

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
      console.log('Monitor data response:', result);

      // Processar dados históricos
      const historicalData: HistoricalDataPoint[] = (result.historicalData || result.history || []).map((item: any) => {
        const exchange1Price = parseFloat(item.exchange1Price || item.buyPrice || item.price1) || 0;
        const exchange2Price = parseFloat(item.exchange2Price || item.sellPrice || item.price2) || 0;
        const spreadPercent = exchange1Price > 0 
          ? ((exchange2Price - exchange1Price) / exchange1Price) * 100 
          : 0;

        return {
          timestamp: item.timestamp || item.time,
          exchange1Price,
          exchange2Price,
          spreadPercent
        };
      });

      const stats = calculateStats(historicalData);

      setData({
        historicalData,
        totalCrossovers: result.totalCrossovers || result.crossovers || 0,
        lastCrossoverTimestamp: result.lastCrossoverTimestamp || result.lastCrossover || null,
        currentSpread: result.currentSpread || result.spread || 0,
        stats
      });
    } catch (err) {
      console.error('Error fetching monitor data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados do monitor');
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
    fetchMonitorData,
    clear
  };
};
