import { useState, useEffect, useCallback } from 'react';
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

type Period = '15m' | '30m' | '1h' | '3h';

// Tamanho de página para paginação
const PAGE_SIZE = 2000;

export const useCrossings = () => {
  const [crossingsCount, setCrossingsCount] = useState<CrossingsCount>({});
  const [loading, setLoading] = useState(false);

  // Função para calcular timestamp baseado no período
  const getTimeAgo = useCallback((period: Period): Date => {
    const timeAgo = new Date();
    if (period === '15m') timeAgo.setMinutes(timeAgo.getMinutes() - 15);
    else if (period === '30m') timeAgo.setMinutes(timeAgo.getMinutes() - 30);
    else if (period === '1h') timeAgo.setHours(timeAgo.getHours() - 1);
    else if (period === '3h') timeAgo.setHours(timeAgo.getHours() - 3);
    return timeAgo;
  }, []);

  // Buscar contagem de cruzamentos com PAGINAÇÃO para não perder dados
  const fetchCrossingsCount = useCallback(async (period: Period = '1h') => {
    try {
      setLoading(true);
      
      const timeAgo = getTimeAgo(period);
      
      let allData: { pair_symbol: string }[] = [];
      let page = 0;
      let hasMore = true;
      
      // Buscar em páginas de 2000 até não ter mais dados
      while (hasMore) {
        const { data, error } = await supabase
          .from('pair_crossings')
          .select('pair_symbol')
          .gte('timestamp', timeAgo.toISOString())
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Contar cruzamentos por moeda
      const counts: CrossingsCount = {};
      allData.forEach((crossing) => {
        counts[crossing.pair_symbol] = (counts[crossing.pair_symbol] || 0) + 1;
      });

      setCrossingsCount(counts);
    } catch (error) {
      console.error('Erro ao buscar contagem de cruzamentos:', error);
    } finally {
      setLoading(false);
    }
  }, [getTimeAgo]);

  // Buscar histórico detalhado de cruzamentos para uma moeda específica
  const fetchCrossingHistory = useCallback(async (
    pairSymbol: string,
    period: Period = '1h'
  ): Promise<Crossing[]> => {
    try {
      const timeAgo = getTimeAgo(period);
      
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('*')
        .eq('pair_symbol', pairSymbol)
        .gte('timestamp', timeAgo.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de cruzamentos:', error);
      return [];
    }
  }, [getTimeAgo]);

  // Setup realtime subscription + polling
  useEffect(() => {
    // Fetch inicial
    fetchCrossingsCount();

    // Configurar realtime para atualizações instantâneas
    const channel = supabase
      .channel('crossings-realtime-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pair_crossings',
        },
        (payload) => {
          // Atualizar contagem incrementalmente
          const newCrossing = payload.new as { pair_symbol: string };
          setCrossingsCount(prev => ({
            ...prev,
            [newCrossing.pair_symbol]: (prev[newCrossing.pair_symbol] || 0) + 1
          }));
        }
      )
      .subscribe();

    // Polling como backup (a cada 15 segundos)
    const interval = setInterval(() => {
      fetchCrossingsCount();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchCrossingsCount]);

  return {
    crossingsCount,
    loading,
    fetchCrossingsCount,
    fetchCrossingHistory,
  };
};
