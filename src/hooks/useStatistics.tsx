import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Period = '15min' | '30min' | '1h' | '3h' | '24h';
export type SortBy = 'crossings' | 'spread' | 'name';

export interface TimeSeriesData {
  time: string;
  [key: string]: number | string;
}

export interface HourDistribution {
  hour: number;
  count: number;
}

export interface CoinRankingItem {
  pair_symbol: string;
  total_crossings: number;
  avg_spread: number;
  last_crossing: string;
}

export interface KPIData {
  totalCrossings: number;
  topCoin: { symbol: string; count: number } | null;
  avgCrossingsPerHour: number;
  bestSpread: number;
}

const getPeriodMs = (period: Period): number => {
  const intervals: Record<Period, number> = {
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '3h': 3 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  };
  return intervals[period];
};

const getStartTimestamp = (period: Period): string => {
  const ms = getPeriodMs(period);
  return new Date(Date.now() - ms).toISOString();
};

// Validação: só considerar spreads entre 0% e 10%
const isValidSpread = (spread: number): boolean => {
  return spread >= 0 && spread <= 10;
};

export const useStatistics = (
  period: Period = '24h',
  blacklist: Set<string> = new Set()
) => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalCrossings: 0,
    topCoin: null,
    avgCrossingsPerHour: 0,
    bestSpread: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [hourDistribution, setHourDistribution] = useState<HourDistribution[]>([]);
  const [coinRanking, setCoinRanking] = useState<CoinRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchKPIs = async () => {
    try {
      const startTime = getStartTimestamp(period);
      
      // Total de cruzamentos (com spread válido)
      const { data: allData } = await supabase
        .from('pair_crossings')
        .select('pair_symbol, spread_net_percent_saida')
        .gte('timestamp', startTime)
        .lte('spread_net_percent_saida', 10)
        .gte('spread_net_percent_saida', 0);

      // Filtrar blacklist e contar
      const filteredData = allData?.filter(item => !blacklist.has(item.pair_symbol)) || [];
      const totalCrossings = filteredData.length;

      // Moeda campeã
      const coinCounts: { [key: string]: number } = {};
      filteredData.forEach((item) => {
        coinCounts[item.pair_symbol] = (coinCounts[item.pair_symbol] || 0) + 1;
      });

      const topCoin = Object.entries(coinCounts).sort((a, b) => b[1] - a[1])[0];

      // Melhor spread (válido)
      const validSpreads = filteredData
        .map(item => item.spread_net_percent_saida)
        .filter(isValidSpread);
      
      const bestSpread = validSpreads.length > 0 
        ? Math.max(...validSpreads) 
        : 0;

      // Calcular média por hora
      const periodHours = getPeriodMs(period) / (60 * 60 * 1000);
      const avgCrossingsPerHour = totalCrossings / periodHours;
      
      setKpiData({
        totalCrossings,
        topCoin: topCoin ? { symbol: topCoin[0], count: topCoin[1] } : null,
        avgCrossingsPerHour,
        bestSpread: Math.min(bestSpread, 10), // Limitar exibição a 10%
      });
    } catch (err) {
      console.error('Erro ao buscar KPIs:', err);
    }
  };

  const fetchCoinRanking = async (sortBy: SortBy = 'crossings') => {
    try {
      const startTime = getStartTimestamp(period);
      
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('pair_symbol, spread_net_percent_saida, timestamp')
        .gte('timestamp', startTime)
        .lte('spread_net_percent_saida', 10)
        .gte('spread_net_percent_saida', 0)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Agrupar por moeda
      const grouped: { [key: string]: { count: number; spreads: number[]; lastTime: string } } = {};
      
      data?.forEach((item) => {
        if (blacklist.has(item.pair_symbol)) return;
        if (!isValidSpread(item.spread_net_percent_saida)) return;
        
        if (!grouped[item.pair_symbol]) {
          grouped[item.pair_symbol] = { count: 0, spreads: [], lastTime: item.timestamp };
        }
        grouped[item.pair_symbol].count++;
        grouped[item.pair_symbol].spreads.push(item.spread_net_percent_saida);
        if (item.timestamp > grouped[item.pair_symbol].lastTime) {
          grouped[item.pair_symbol].lastTime = item.timestamp;
        }
      });

      // Converter para array e calcular médias
      const ranking: CoinRankingItem[] = Object.entries(grouped).map(([symbol, data]) => ({
        pair_symbol: symbol,
        total_crossings: data.count,
        avg_spread: data.spreads.reduce((a, b) => a + b, 0) / data.spreads.length,
        last_crossing: data.lastTime,
      }));

      // Ordenar
      if (sortBy === 'crossings') {
        ranking.sort((a, b) => b.total_crossings - a.total_crossings);
      } else if (sortBy === 'spread') {
        ranking.sort((a, b) => b.avg_spread - a.avg_spread);
      } else {
        ranking.sort((a, b) => a.pair_symbol.localeCompare(b.pair_symbol));
      }

      setCoinRanking(ranking);
    } catch (err) {
      console.error('Erro ao buscar ranking:', err);
    }
  };

  const fetchTimeSeries = async (topN: number = 5) => {
    try {
      const topCoins = coinRanking.slice(0, topN).map(c => c.pair_symbol);
      
      if (topCoins.length === 0) return;

      const startTime = getStartTimestamp(period);
      
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('pair_symbol, timestamp')
        .gte('timestamp', startTime)
        .lte('spread_net_percent_saida', 10)
        .gte('spread_net_percent_saida', 0)
        .in('pair_symbol', topCoins)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Agrupar por intervalo de tempo apropriado
      const periodMs = getPeriodMs(period);
      const intervalMinutes = periodMs <= 60 * 60 * 1000 ? 5 : periodMs <= 3 * 60 * 60 * 1000 ? 15 : 60;
      
      const grouped: { [key: string]: { [coin: string]: number } } = {};

      data?.forEach((item) => {
        if (blacklist.has(item.pair_symbol)) return;
        const date = new Date(item.timestamp);
        const minutes = Math.floor(date.getMinutes() / intervalMinutes) * intervalMinutes;
        const key = `${date.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        if (!grouped[key]) {
          grouped[key] = {};
        }
        grouped[key][item.pair_symbol] = (grouped[key][item.pair_symbol] || 0) + 1;
      });

      // Converter para array
      const series: TimeSeriesData[] = Object.entries(grouped).map(([time, coins]) => ({
        time,
        ...coins,
      }));

      setTimeSeriesData(series);
    } catch (err) {
      console.error('Erro ao buscar série temporal:', err);
    }
  };

  const fetchHourDistribution = async () => {
    try {
      const startTime = getStartTimestamp(period);
      
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('timestamp')
        .gte('timestamp', startTime)
        .lte('spread_net_percent_saida', 10)
        .gte('spread_net_percent_saida', 0);

      if (error) throw error;

      const hourCounts: { [hour: number]: number } = {};
      
      data?.forEach((item) => {
        const hour = new Date(item.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const distribution: HourDistribution[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourCounts[i] || 0,
      }));

      setHourDistribution(distribution);
    } catch (err) {
      console.error('Erro ao buscar distribuição por hora:', err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchKPIs();
        await fetchCoinRanking();
        await fetchHourDistribution();
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [period]);

  useEffect(() => {
    if (coinRanking.length > 0) {
      fetchTimeSeries();
    }
  }, [coinRanking]);

  return {
    kpiData,
    timeSeriesData,
    hourDistribution,
    coinRanking,
    loading,
    error,
    refetch: () => {
      fetchKPIs();
      fetchCoinRanking();
      fetchTimeSeries();
      fetchHourDistribution();
    },
  };
};
