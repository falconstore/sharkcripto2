import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MexcBalance {
  spotBalance: number;
  futuresBalance: number;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refreshBalance: () => Promise<void>;
}

export const useMexcBalance = (): MexcBalance => {
  const [spotBalance, setSpotBalance] = useState<number>(0);
  const [futuresBalance, setFuturesBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshBalance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('mexc-account-balance', {
        body: {},
      });

      if (invokeError) throw invokeError;

      if (data.success) {
        setSpotBalance(data.spot_usdt);
        setFuturesBalance(data.futures_usdt);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch balances');
      }
    } catch (err: any) {
      console.error('Error fetching MEXC balance:', err);
      setError(err.message || 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshBalance();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshBalance]);

  return {
    spotBalance,
    futuresBalance,
    loading,
    error,
    lastUpdate,
    refreshBalance,
  };
};