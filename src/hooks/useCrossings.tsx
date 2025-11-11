import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Crossing {
  id: string;
  pair_symbol: string;
  spread_net_percent_saida: number;
  timestamp: string;
  created_at: string;
}

export interface CrossingsCount {
  [pair_symbol: string]: number;
}

type Period = '15m' | '30m' | '1h' | '2h';

const PERIOD_INTERVALS: Record<Period, string> = {
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '2h': '2 hours',
};

export const useCrossings = () => {
  const [crossingsCount, setCrossingsCount] = useState<CrossingsCount>({});
  const [loading, setLoading] = useState(false);

  // Buscar contagem de cruzamentos para todas as moedas na última hora
  const fetchCrossingsCount = async (period: Period = '1h') => {
    try {
      setLoading(true);
      const interval = PERIOD_INTERVALS[period];
      
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('pair_symbol')
        .gte('timestamp', `now() - interval '${interval}'`);

      if (error) throw error;

      // Contar cruzamentos por moeda
      const counts: CrossingsCount = {};
      data?.forEach((crossing) => {
        counts[crossing.pair_symbol] = (counts[crossing.pair_symbol] || 0) + 1;
      });

      setCrossingsCount(counts);
    } catch (error) {
      console.error('Erro ao buscar contagem de cruzamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar histórico detalhado de cruzamentos para uma moeda específica
  const fetchCrossingHistory = async (
    pairSymbol: string,
    period: Period = '1h'
  ): Promise<Crossing[]> => {
    try {
      const interval = PERIOD_INTERVALS[period];
      
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('*')
        .eq('pair_symbol', pairSymbol)
        .gte('timestamp', `now() - interval '${interval}'`)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de cruzamentos:', error);
      return [];
    }
  };

  // Atualizar contagem automaticamente a cada 30 segundos
  useEffect(() => {
    fetchCrossingsCount();
    const interval = setInterval(() => {
      fetchCrossingsCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    crossingsCount,
    loading,
    fetchCrossingsCount,
    fetchCrossingHistory,
  };
};
