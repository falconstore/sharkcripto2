import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Period = 'today' | 'week' | 'month' | 'custom';
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
  avgCrossingsPerDay: number;
  bestSpread: number;
}

const getPeriodInterval = (period: Period, customStart?: Date, customEnd?: Date): string => {
  if (period === 'custom' && customStart && customEnd) {
    return `timestamp BETWEEN '${customStart.toISOString()}' AND '${customEnd.toISOString()}'`;
  }
  
  const intervals = {
    today: "timestamp >= NOW() - INTERVAL '24 hours'",
    week: "timestamp >= NOW() - INTERVAL '7 days'",
    month: "timestamp >= NOW() - INTERVAL '30 days'",
  };
  
  return intervals[period] || intervals.today;
};

export const useStatistics = (
  period: Period = 'today',
  customStart?: Date,
  customEnd?: Date,
  blacklist: Set<string> = new Set()
) => {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalCrossings: 0,
    topCoin: null,
    avgCrossingsPerDay: 0,
    bestSpread: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [hourDistribution, setHourDistribution] = useState<HourDistribution[]>([]);
  const [coinRanking, setCoinRanking] = useState<CoinRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchKPIs = async () => {
    try {
      const whereClause = getPeriodInterval(period, customStart, customEnd);
      
      // Total de cruzamentos
      const { count: totalCrossings } = await supabase
        .from('pair_crossings')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', period === 'today' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : 
             period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() :
             new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Moeda campeã
      const { data: topCoinData } = await supabase
        .from('pair_crossings')
        .select('pair_symbol')
        .gte('timestamp', period === 'today' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : 
             period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() :
             new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const coinCounts: { [key: string]: number } = {};
      topCoinData?.forEach((item) => {
        if (blacklist.has(item.pair_symbol)) return; // Filtrar blacklist
        coinCounts[item.pair_symbol] = (coinCounts[item.pair_symbol] || 0) + 1;
      });

      const topCoin = Object.entries(coinCounts).sort((a, b) => b[1] - a[1])[0];

      // Melhor spread
      const { data: bestSpreadData } = await supabase
        .from('pair_crossings')
        .select('spread_net_percent_saida')
        .gte('timestamp', period === 'today' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : 
             period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() :
             new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('spread_net_percent_saida', { ascending: false })
        .limit(1)
        .single();

      const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
      
      setKpiData({
        totalCrossings: totalCrossings || 0,
        topCoin: topCoin ? { symbol: topCoin[0], count: topCoin[1] } : null,
        avgCrossingsPerDay: (totalCrossings || 0) / days,
        bestSpread: bestSpreadData?.spread_net_percent_saida || 0,
      });
    } catch (err) {
      console.error('Erro ao buscar KPIs:', err);
    }
  };

  const fetchCoinRanking = async (sortBy: SortBy = 'crossings') => {
    try {
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('pair_symbol, spread_net_percent_saida, timestamp')
        .gte('timestamp', period === 'today' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : 
             period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() :
             new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Agrupar por moeda
      const grouped: { [key: string]: { count: number; spreads: number[]; lastTime: string } } = {};
      
      data?.forEach((item) => {
        if (blacklist.has(item.pair_symbol)) return; // Filtrar blacklist
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
      // Buscar top N moedas
      const topCoins = coinRanking.slice(0, topN).map(c => c.pair_symbol);
      
      if (topCoins.length === 0) return;

      const { data, error } = await supabase
        .from('pair_crossings')
        .select('pair_symbol, timestamp')
        .gte('timestamp', period === 'today' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : 
             period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() :
             new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .in('pair_symbol', topCoins)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Agrupar por hora/dia
      const timeFormat = period === 'today' ? 'hour' : 'day';
      const grouped: { [key: string]: { [coin: string]: number } } = {};

      data?.forEach((item) => {
        if (blacklist.has(item.pair_symbol)) return; // Filtrar blacklist
        const date = new Date(item.timestamp);
        const key = timeFormat === 'hour' 
          ? `${date.getHours()}:00`
          : date.toLocaleDateString('pt-BR');

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
      const { data, error } = await supabase
        .from('pair_crossings')
        .select('timestamp')
        .gte('timestamp', period === 'today' ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : 
             period === 'week' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() :
             new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const hourCounts: { [hour: number]: number } = {};
      
      data?.forEach((item) => {
        // Não filtrar blacklist aqui para manter distribuição geral de horários
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
  }, [period, customStart, customEnd]);

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
