import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, BarChart3, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Cores vibrantes para o gráfico
const CHART_COLORS = {
  entrada: '#22c55e', // green-500
  saida: '#ef4444',   // red-500
};

// Tooltip customizado com diferença entre entrada e saída
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length >= 2) {
    const entrada = payload.find((p: any) => p.dataKey === 'entrada')?.value ?? 0;
    const saida = payload.find((p: any) => p.dataKey === 'saida')?.value ?? 0;
    const diferenca = entrada - saida;
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.entrada }} />
            <span>Entrada:</span>
            <span className="font-mono font-medium">{entrada.toFixed(4)}%</span>
          </p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.saida }} />
            <span>Saída:</span>
            <span className="font-mono font-medium">{saida.toFixed(4)}%</span>
          </p>
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-sm flex items-center justify-between">
              <span className="font-medium">Lucro Potencial:</span>
              <span className={cn(
                "font-mono font-bold",
                diferenca > 0 ? "text-[#22c55e]" : "text-[#ef4444]"
              )}>
                {diferenca > 0 ? '+' : ''}{diferenca.toFixed(4)}%
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

type Period = '15m' | '30m' | '1h' | '3h';

interface CrossingStats {
  max: { value: number; timestamp: string } | null;
  min: { value: number; timestamp: string } | null;
  count: number;
}

interface ChartDataPoint {
  time: string;
  timestamp: Date;
  entrada: number;
  saida: number;
}

interface CoinAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  pairSymbol: string;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '15m', label: '15M' },
  { value: '30m', label: '30M' },
  { value: '1h', label: '1H' },
  { value: '3h', label: '3H' },
];

const CoinAnalysisModal = ({ open, onClose, pairSymbol }: CoinAnalysisModalProps) => {
  const [period, setPeriod] = useState<Period>('1h');
  const [loading, setLoading] = useState(true);
  const [entradaStats, setEntradaStats] = useState<CrossingStats>({ max: null, min: null, count: 0 });
  const [saidaStats, setSaidaStats] = useState<CrossingStats>({ max: null, min: null, count: 0 });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const getTimeAgo = useCallback((p: Period): Date => {
    const timeAgo = new Date();
    if (p === '15m') timeAgo.setMinutes(timeAgo.getMinutes() - 15);
    else if (p === '30m') timeAgo.setMinutes(timeAgo.getMinutes() - 30);
    else if (p === '1h') timeAgo.setHours(timeAgo.getHours() - 1);
    else if (p === '3h') timeAgo.setHours(timeAgo.getHours() - 3);
    return timeAgo;
  }, []);

  const normalizeSymbol = (symbol: string) => symbol.replace('_', '').replace('USDT', '').toUpperCase();

  const fetchData = useCallback(async () => {
    if (!pairSymbol) return;
    
    setLoading(true);
    const timeAgo = getTimeAgo(period);
    const normalizedSymbol = normalizeSymbol(pairSymbol);

    try {
      // Buscar dados em paralelo
      const [entradaResult, saidaResult, historyResult] = await Promise.all([
        // Cruzamentos de entrada (para cards)
        supabase
          .from('pair_crossings_entrada')
          .select('*')
          .or(`pair_symbol.eq.${pairSymbol},pair_symbol.eq.${normalizedSymbol}`)
          .gte('timestamp', timeAgo.toISOString())
          .order('timestamp', { ascending: true }),
        
        // Cruzamentos de saída (para cards)
        supabase
          .from('pair_crossings')
          .select('*')
          .or(`pair_symbol.eq.${pairSymbol},pair_symbol.eq.${normalizedSymbol}`)
          .gte('timestamp', timeAgo.toISOString())
          .order('timestamp', { ascending: true }),
        
        // Histórico de spreads (para gráfico contínuo)
        supabase
          .from('spread_history')
          .select('spread_entrada, spread_saida, timestamp')
          .or(`pair_symbol.eq.${pairSymbol},pair_symbol.eq.${normalizedSymbol}`)
          .gte('timestamp', timeAgo.toISOString())
          .order('timestamp', { ascending: true })
      ]);

      const entradaData = entradaResult.data;
      const saidaData = saidaResult.data;
      const historyData = historyResult.data;

      // Calcular estatísticas de entrada (dos cruzamentos)
      if (entradaData && entradaData.length > 0) {
        const values = entradaData.map(d => d.spread_net_percent_entrada);
        const maxIdx = values.indexOf(Math.max(...values));
        const minIdx = values.indexOf(Math.min(...values));
        setEntradaStats({
          max: { value: values[maxIdx], timestamp: entradaData[maxIdx].timestamp },
          min: { value: values[minIdx], timestamp: entradaData[minIdx].timestamp },
          count: entradaData.length,
        });
      } else {
        setEntradaStats({ max: null, min: null, count: 0 });
      }

      // Calcular estatísticas de saída (dos cruzamentos)
      if (saidaData && saidaData.length > 0) {
        const values = saidaData.map(d => d.spread_net_percent_saida);
        const maxIdx = values.indexOf(Math.max(...values));
        const minIdx = values.indexOf(Math.min(...values));
        setSaidaStats({
          max: { value: values[maxIdx], timestamp: saidaData[maxIdx].timestamp },
          min: { value: values[minIdx], timestamp: saidaData[minIdx].timestamp },
          count: saidaData.length,
        });
      } else {
        setSaidaStats({ max: null, min: null, count: 0 });
      }

      // Montar dados do gráfico a partir do histórico contínuo
      if (historyData && historyData.length > 0) {
        const chartPoints: ChartDataPoint[] = historyData.map(d => ({
          time: format(new Date(d.timestamp), 'dd/MM HH:mm'),
          timestamp: new Date(d.timestamp),
          entrada: Number(d.spread_entrada),
          saida: Number(d.spread_saida),
        }));
        setChartData(chartPoints);
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de análise:', error);
    } finally {
      setLoading(false);
    }
  }, [pairSymbol, period, getTimeAgo]);

  useEffect(() => {
    if (open && pairSymbol) {
      fetchData();
    }
  }, [open, pairSymbol, period, fetchData]);

  const formatDate = (timestamp: string) => {
    return format(new Date(timestamp), 'dd/MM HH:mm', { locale: ptBR });
  };

  const handleOpenMexc = () => {
    const symbol = pairSymbol.replace('_USDT', '').replace('USDT', '');
    window.open(`https://www.mexc.com/pt-BR/exchange/${symbol}_USDT`, 'mexc-spot');
    window.open(`https://futures.mexc.com/pt-BR/exchange/${symbol}_USDT`, 'mexc-futures');
  };

  const StatCard = ({ 
    title, 
    value, 
    timestamp, 
    icon: Icon, 
    isPositive 
  }: { 
    title: string; 
    value: number | null; 
    timestamp: string | null;
    icon: typeof TrendingUp;
    isPositive: boolean;
  }) => (
    <Card className="bg-accent/30">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${isPositive ? 'text-profit' : 'text-negative'}`} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        {value !== null ? (
          <>
            <div className={`text-xl font-bold font-mono ${isPositive ? 'text-profit' : 'text-negative'}`}>
              {value >= 0 ? '+' : ''}{value.toFixed(4)}%
            </div>
            {timestamp && (
              <div className="text-xs text-muted-foreground mt-1">
                {formatDate(timestamp)}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground text-sm">Sem dados</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="font-mono text-xl">{pairSymbol}</span>
              <Badge variant="outline" className="text-xs">
                Análise de Cruzamentos
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={handleOpenMexc}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Filtro de período */}
        <div className="flex gap-2 mb-4">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Entrada */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-profit flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Lucro de Entrada
                  <Badge variant="secondary" className="text-xs">{entradaStats.count} cruzamentos</Badge>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    title="Máximo"
                    value={entradaStats.max?.value ?? null}
                    timestamp={entradaStats.max?.timestamp ?? null}
                    icon={TrendingUp}
                    isPositive={true}
                  />
                  <StatCard
                    title="Mínimo"
                    value={entradaStats.min?.value ?? null}
                    timestamp={entradaStats.min?.timestamp ?? null}
                    icon={TrendingDown}
                    isPositive={(entradaStats.min?.value ?? 0) >= 0}
                  />
                </div>
              </div>

              {/* Saída */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-negative flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Lucro de Saída
                  <Badge variant="secondary" className="text-xs">{saidaStats.count} cruzamentos</Badge>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    title="Máximo"
                    value={saidaStats.max?.value ?? null}
                    timestamp={saidaStats.max?.timestamp ?? null}
                    icon={TrendingUp}
                    isPositive={(saidaStats.max?.value ?? 0) >= 0}
                  />
                  <StatCard
                    title="Mínimo"
                    value={saidaStats.min?.value ?? null}
                    timestamp={saidaStats.min?.timestamp ?? null}
                    icon={TrendingDown}
                    isPositive={false}
                  />
                </div>
              </div>
            </div>

            {/* Gráfico de linhas contínuas */}
            <Card className="bg-accent/20">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Gráfico de Spreads
                </h3>
                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Nenhum histórico de spread no período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }} 
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `${value.toFixed(2)}%`}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        formatter={(value) => (
                          <span className="flex items-center gap-1.5 text-sm">
                            {value === 'entrada' ? (
                              <>
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: CHART_COLORS.entrada }} />
                                <span>Entrada</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3.5 h-3.5" style={{ color: CHART_COLORS.saida }} />
                                <span>Saída</span>
                              </>
                            )}
                          </span>
                        )}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                      <Line
                        type="monotone"
                        dataKey="entrada"
                        stroke={CHART_COLORS.entrada}
                        name="entrada"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={true}
                      />
                      <Line
                        type="monotone"
                        dataKey="saida"
                        stroke={CHART_COLORS.saida}
                        name="saida"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CoinAnalysisModal;