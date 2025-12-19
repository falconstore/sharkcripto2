import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Clock, 
  ArrowRightLeft,
  RotateCcw,
  LineChart as LineChartIcon,
  RefreshCw,
  AlertCircle,
  Tv
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useExternalSpreadHistory } from '@/hooks/useExternalSpreadHistory';
import { useExternalMonitor } from '@/hooks/useExternalMonitor';

// Lazy load TradingView widget for performance
const TradingViewWidget = lazy(() => import('@/components/TradingViewWidget'));
interface CrossoverEvent {
  timestamp: string;
  exchange1Price: number;
  exchange2Price: number;
  difference: number;
}

interface CrossoverAnalysis {
  totalCrossovers: number;
  lastCrossoverTimestamp: number | null;
  crossoverEvents: CrossoverEvent[];
  historicalData: CrossoverEvent[];
}

interface ExternalAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  histCruzamento: string | null;
  entrySpread: number;
  exitSpread: number;
  buyFrom: string;
  sellTo: string;
  buyPrice?: number;
  sellPrice?: number;
}

type TimePeriod = '1' | '6' | '24';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium">
          Spot: <span className="text-cyan-400">${data.exchange1Price?.toFixed(6)}</span>
        </p>
        <p className="text-sm font-medium">
          Futures: <span className="text-violet-400">${data.exchange2Price?.toFixed(6)}</span>
        </p>
        <Separator className="my-1" />
        <p className={cn(
          "text-sm font-semibold",
          data.spreadPercent >= 0 ? 'text-profit' : 'text-negative'
        )}>
          Spread: {data.spreadPercent?.toFixed(3)}%
        </p>
      </div>
    );
  }
  return null;
};

// Componente da calculadora embutida
const EmbeddedCalculator = ({ 
  buyPrice, 
  sellPrice 
}: { 
  buyPrice?: number; 
  sellPrice?: number; 
}) => {
  const [aberturaSpot, setAberturaSpot] = useState(buyPrice?.toString() || '');
  const [aberturaShort, setAberturaShort] = useState(sellPrice?.toString() || '');
  const [fechamentoSpot, setFechamentoSpot] = useState('');
  const [fechamentoShort, setFechamentoShort] = useState('');

  const lucroEntrada = useMemo(() => {
    const spot = parseFloat(aberturaSpot);
    const short = parseFloat(aberturaShort);
    if (!spot || !short || spot <= 0 || short <= 0) return null;
    return ((short / spot - 1) * 100);
  }, [aberturaSpot, aberturaShort]);

  const lucroFechamento = useMemo(() => {
    const spot = parseFloat(fechamentoSpot);
    const short = parseFloat(fechamentoShort);
    if (!spot || !short || spot <= 0 || short <= 0) return null;
    return (((short / spot - 1) * -1) * 100);
  }, [fechamentoSpot, fechamentoShort]);

  const spreadFinal = useMemo(() => {
    if (lucroEntrada === null || lucroFechamento === null) return null;
    return lucroEntrada + lucroFechamento;
  }, [lucroEntrada, lucroFechamento]);

  const limpar = useCallback(() => {
    setAberturaSpot('');
    setAberturaShort('');
    setFechamentoSpot('');
    setFechamentoShort('');
  }, []);

  const getColorClass = (value: number | null) => {
    if (value === null) return 'text-muted-foreground';
    if (value > 0) return 'text-profit';
    if (value < 0) return 'text-loss';
    return 'text-muted-foreground';
  };

  const formatResult = (value: number | null) => {
    if (value === null) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(3)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Abertura */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Abertura
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Preço Spot</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={aberturaSpot}
              onChange={(e) => setAberturaSpot(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Preço Short</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={aberturaShort}
              onChange={(e) => setAberturaShort(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className={cn(
          "p-2 bg-accent/30 rounded-md text-center font-semibold text-sm",
          getColorClass(lucroEntrada)
        )}>
          {formatResult(lucroEntrada)}
        </div>
      </div>

      <Separator />

      {/* Fechamento */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fechamento
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Preço Spot</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={fechamentoSpot}
              onChange={(e) => setFechamentoSpot(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Preço Short</Label>
            <Input
              type="number"
              step="any"
              placeholder="0.0000"
              value={fechamentoShort}
              onChange={(e) => setFechamentoShort(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className={cn(
          "p-2 bg-accent/30 rounded-md text-center font-semibold text-sm",
          getColorClass(lucroFechamento)
        )}>
          {formatResult(lucroFechamento)}
        </div>
      </div>

      <Separator />

      {/* Spread Final */}
      <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center mb-1">
          Spread Final
        </p>
        <p className={cn(
          "text-2xl font-bold text-center",
          getColorClass(spreadFinal)
        )}>
          {formatResult(spreadFinal)}
        </p>
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        className="w-full" 
        onClick={limpar}
      >
        <RotateCcw className="w-3 h-3 mr-2" />
        Limpar
      </Button>
    </div>
  );
};

// Componente de estatísticas de spread
const SpreadStatsCards = ({ 
  maxSpread, 
  minSpread, 
  avgSpread,
  label,
  count,
  isLoading = false
}: { 
  maxSpread: number; 
  minSpread: number; 
  avgSpread: number;
  label: string;
  count?: number;
  isLoading?: boolean;
}) => (
  <div className="grid grid-cols-3 gap-2">
    <Card className="bg-profit/10 border-profit/30">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Máx {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-6 w-16 mt-1" />
        ) : (
          <p className="text-lg font-bold text-profit">
            {maxSpread.toFixed(3)}%
          </p>
        )}
      </CardContent>
    </Card>
    <Card className="bg-negative/10 border-negative/30">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <TrendingDown className="w-3 h-3" /> Mín {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-6 w-16 mt-1" />
        ) : (
          <p className="text-lg font-bold text-negative">
            {minSpread.toFixed(3)}%
          </p>
        )}
      </CardContent>
    </Card>
    <Card className="bg-primary/10 border-primary/30">
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Média {label} {count !== undefined && `(${count})`}
        </p>
        {isLoading ? (
          <Skeleton className="h-6 w-16 mt-1" />
        ) : (
          <p className={cn(
            "text-lg font-bold",
            avgSpread >= 0 ? 'text-profit' : 'text-negative'
          )}>
            {avgSpread.toFixed(3)}%
          </p>
        )}
      </CardContent>
    </Card>
  </div>
);

// Componente de tabela de histórico
const HistoryTable = ({ 
  data, 
  type,
  isLoading = false
}: { 
  data: Array<{
    time: string;
    bidPrice: number;
    askPrice: number;
    spread: number;
  }>;
  type: 'entrada' | 'saida';
  isLoading?: boolean;
}) => (
  <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-accent/50 sticky top-0">
        <tr>
          <th className="text-left p-2 text-xs font-medium">Horário</th>
          <th className="text-right p-2 text-xs font-medium">
            {type === 'entrada' ? 'Bid (Spot)' : 'Ask (Spot)'}
          </th>
          <th className="text-right p-2 text-xs font-medium">
            {type === 'entrada' ? 'Ask (Fut)' : 'Bid (Fut)'}
          </th>
          <th className="text-right p-2 text-xs font-medium">Spread</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <tr key={idx} className="border-t border-border">
              <td className="p-2"><Skeleton className="h-4 w-16" /></td>
              <td className="p-2"><Skeleton className="h-4 w-20" /></td>
              <td className="p-2"><Skeleton className="h-4 w-20" /></td>
              <td className="p-2"><Skeleton className="h-4 w-14" /></td>
            </tr>
          ))
        ) : data.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-center p-4 text-muted-foreground">
              Sem dados disponíveis
            </td>
          </tr>
        ) : (
          data.map((row, idx) => (
            <tr key={idx} className="border-t border-border hover:bg-accent/30">
              <td className="p-2 text-muted-foreground text-xs">{row.time}</td>
              <td className={cn(
                "p-2 text-right font-mono text-xs",
                type === 'entrada' ? 'text-profit' : 'text-negative'
              )}>
                ${row.bidPrice.toFixed(6)}
              </td>
              <td className={cn(
                "p-2 text-right font-mono text-xs",
                type === 'entrada' ? 'text-negative' : 'text-profit'
              )}>
                ${row.askPrice.toFixed(6)}
              </td>
              <td className={cn(
                "p-2 text-right font-mono text-xs",
                row.spread >= 0 ? 'text-profit' : 'text-negative'
              )}>
                {row.spread >= 0 ? '+' : ''}{row.spread.toFixed(3)}%
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// Componente de erro/loading
const DataStatusMessage = ({ 
  isLoading, 
  error, 
  onRetry 
}: { 
  isLoading: boolean; 
  error: string | null; 
  onRetry: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando dados da API...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-2">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3 h-3 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }
  
  return null;
};

export const ExternalAnalysisModal = ({
  open,
  onClose,
  symbol,
  histCruzamento,
  entrySpread,
  exitSpread,
  buyFrom,
  sellTo,
  buyPrice,
  sellPrice,
}: ExternalAnalysisModalProps) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24');
  
  // Hooks para APIs externas
  const { 
    data: spreadHistoryData, 
    isLoading: isLoadingSpreadHistory, 
    error: spreadHistoryError,
    fetchHistory 
  } = useExternalSpreadHistory();
  
  const { 
    data: monitorData, 
    isLoading: isLoadingMonitor, 
    error: monitorError,
    fetchMonitorData 
  } = useExternalMonitor();

  // Buscar dados quando o modal abrir
  useEffect(() => {
    if (open && symbol) {
      fetchHistory({
        buyExchange: buyFrom,
        buySymbol: symbol,
        sellExchange: sellTo,
        sellSymbol: symbol,
        hoursBack: parseInt(timePeriod)
      });
      
      fetchMonitorData({
        symbol: symbol,
        buyExchange: buyFrom,
        buyMarket: 'spot',
        sellExchange: sellTo,
        sellMarket: 'future'
      });
    }
  }, [open, symbol, buyFrom, sellTo, timePeriod, fetchHistory, fetchMonitorData]);

  const handleRetry = useCallback(() => {
    fetchHistory({
      buyExchange: buyFrom,
      buySymbol: symbol,
      sellExchange: sellTo,
      sellSymbol: symbol,
      hoursBack: parseInt(timePeriod)
    });
    
    fetchMonitorData({
      symbol: symbol,
      buyExchange: buyFrom,
      buyMarket: 'spot',
      sellExchange: sellTo,
      sellMarket: 'future'
    });
  }, [buyFrom, symbol, sellTo, timePeriod, fetchHistory, fetchMonitorData]);

  // Fallback para dados do WebSocket se APIs falharem
  const analysis = useMemo<CrossoverAnalysis | null>(() => {
    if (!histCruzamento) return null;
    try {
      const parsed = JSON.parse(histCruzamento);
      return parsed.crossoverAnalysis || parsed;
    } catch (e) {
      console.error('Error parsing histCruzamento:', e);
      return null;
    }
  }, [histCruzamento]);

  // Usar dados da API externa ou fallback para WebSocket
  const chartData = useMemo(() => {
    // Priorizar dados da API do monitor
    if (monitorData?.historicalData?.length) {
      return monitorData.historicalData.map(item => ({
        ...item,
        time: item.timestamp?.split(' ')[1]?.substring(0, 5) || item.timestamp,
      }));
    }
    
    // Fallback para dados do WebSocket
    if (!analysis?.historicalData) return [];
    
    const now = new Date();
    const hoursAgo = parseInt(timePeriod);
    const cutoffTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
    
    return analysis.historicalData
      .filter(item => {
        const itemTime = new Date(item.timestamp);
        return itemTime >= cutoffTime;
      })
      .map(item => {
        const spreadPercent = item.exchange1Price > 0 
          ? ((item.exchange2Price - item.exchange1Price) / item.exchange1Price) * 100 
          : 0;
        
        return {
          ...item,
          time: item.timestamp.split(' ')[1]?.substring(0, 5) || item.timestamp,
          spreadPercent,
        };
      });
  }, [monitorData, analysis, timePeriod]);

  // Estatísticas gerais (usar da API ou calcular do WebSocket)
  const stats = useMemo(() => {
    if (monitorData?.stats) {
      return monitorData.stats;
    }
    
    if (!chartData.length) return null;
    
    const spreads = chartData.map(d => d.spreadPercent);
    const maxSpread = Math.max(...spreads);
    const minSpread = Math.min(...spreads);
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    
    let inversions = 0;
    for (let i = 1; i < spreads.length; i++) {
      if ((spreads[i] >= 0 && spreads[i-1] < 0) || (spreads[i] < 0 && spreads[i-1] >= 0)) {
        inversions++;
      }
    }
    
    return { maxSpread, minSpread, avgSpread, inversions };
  }, [monitorData, chartData]);

  // Dados de aberturas e fechamentos (usar da API ou processar do WebSocket)
  const { aberturasData, fechamentosData, aberturasStats, fechamentosStats } = useMemo(() => {
    // Priorizar dados da API de spread history
    if (spreadHistoryData) {
      const formatApiData = (events: typeof spreadHistoryData.entry) => 
        events.map(e => ({
          time: e.timestamp?.split(' ')[1]?.substring(0, 5) || e.timestamp || '',
          bidPrice: e.bidPrice,
          askPrice: e.askPrice,
          spread: e.spread
        })).slice(0, 100); // Limitar para performance
      
      return {
        aberturasData: formatApiData(spreadHistoryData.entry),
        fechamentosData: formatApiData(spreadHistoryData.exit),
        aberturasStats: spreadHistoryData.stats.entry,
        fechamentosStats: spreadHistoryData.stats.exit
      };
    }
    
    // Fallback para dados do WebSocket
    const aberturas = chartData.filter(d => d.spreadPercent > 0);
    const fechamentos = chartData.filter(d => d.spreadPercent <= 0);
    
    const formatTableData = (data: typeof chartData) => data.map(d => ({
      time: d.time,
      bidPrice: d.exchange1Price,
      askPrice: d.exchange2Price,
      spread: d.spreadPercent
    })).reverse();

    const calcStats = (data: typeof chartData) => {
      if (!data.length) return { max: 0, min: 0, avg: 0, count: 0 };
      const spreads = data.map(d => Math.abs(d.spreadPercent));
      return {
        max: Math.max(...spreads),
        min: Math.min(...spreads),
        avg: spreads.reduce((a, b) => a + b, 0) / spreads.length,
        count: data.length
      };
    };

    return {
      aberturasData: formatTableData(aberturas),
      fechamentosData: formatTableData(fechamentos),
      aberturasStats: calcStats(aberturas),
      fechamentosStats: calcStats(fechamentos)
    };
  }, [spreadHistoryData, chartData]);

  const isLoadingData = isLoadingSpreadHistory || isLoadingMonitor;
  const hasError = spreadHistoryError || monitorError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Análise - {symbol}
            <Badge variant="outline" className="bg-primary/20">
              {buyFrom.toUpperCase()} → {sellTo.toUpperCase()}
            </Badge>
            {isLoadingData && (
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Cards de valores no topo */}
        <div className="px-4 py-2 grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-border bg-accent/20">
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase">Valor Compra</p>
            <p className="text-sm font-bold text-profit">
              ${buyPrice?.toFixed(6) || '—'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase">Valor Venda</p>
            <p className="text-sm font-bold text-negative">
              ${sellPrice?.toFixed(6) || '—'}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase">Spread Entrada</p>
            <p className={cn(
              "text-sm font-bold",
              entrySpread >= 0 ? 'text-profit' : 'text-negative'
            )}>
              {entrySpread.toFixed(3)}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase">Spread Saída</p>
            <p className={cn(
              "text-sm font-bold",
              exitSpread >= 0 ? 'text-profit' : 'text-negative'
            )}>
              {exitSpread.toFixed(3)}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3" /> Inversões
            </p>
            <p className="text-sm font-bold text-violet-400">
              {stats?.inversions || 0}x
            </p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> Cruzamentos
            </p>
            <p className="text-sm font-bold text-amber-400">
              {monitorData?.totalCrossovers || analysis?.totalCrossovers || 0}x
            </p>
          </div>
        </div>

        {/* Layout side-by-side */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Calculadora à esquerda */}
          <div className="w-full md:w-72 p-4 border-b md:border-b-0 md:border-r border-border bg-accent/10 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Calculadora de Spread
            </h3>
            <EmbeddedCalculator buyPrice={buyPrice} sellPrice={sellPrice} />
          </div>

          {/* Abas à direita */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Histórico de Spreads</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRetry}
                  disabled={isLoadingData}
                  className="h-8"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoadingData && "animate-spin")} />
                </Button>
                <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1h</SelectItem>
                    <SelectItem value="6">6h</SelectItem>
                    <SelectItem value="24">24h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasError && (
              <DataStatusMessage 
                isLoading={false} 
                error={spreadHistoryError || monitorError} 
                onRetry={handleRetry} 
              />
            )}

            <Tabs defaultValue="tradingview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="tradingview" className="text-xs">
                  <Tv className="w-3 h-3 mr-1" />
                  TradingView
                </TabsTrigger>
                <TabsTrigger value="grafico" className="text-xs">
                  <LineChartIcon className="w-3 h-3 mr-1" />
                  Spread
                </TabsTrigger>
                <TabsTrigger value="aberturas" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Aberturas ({aberturasData.length})
                </TabsTrigger>
                <TabsTrigger value="fechamentos" className="text-xs">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Fechamentos ({fechamentosData.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab TradingView - Side by Side Spot/Futures */}
              <TabsContent value="tradingview" className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-80">
                  {/* Spot Chart */}
                  <div className="border border-border rounded-lg overflow-hidden flex flex-col">
                    <div className="text-xs p-2 bg-cyan-500/20 text-cyan-400 text-center font-medium flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      SPOT - {buyFrom.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <Suspense fallback={
                        <div className="h-full flex items-center justify-center bg-accent/20">
                          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      }>
                        <TradingViewWidget 
                          symbol={symbol}
                          exchange={buyFrom}
                          market="spot"
                          height={280}
                        />
                      </Suspense>
                    </div>
                  </div>
                  
                  {/* Futures Chart */}
                  <div className="border border-border rounded-lg overflow-hidden flex flex-col">
                    <div className="text-xs p-2 bg-violet-500/20 text-violet-400 text-center font-medium flex items-center justify-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      FUTURES - {sellTo.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <Suspense fallback={
                        <div className="h-full flex items-center justify-center bg-accent/20">
                          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      }>
                        <TradingViewWidget 
                          symbol={symbol}
                          exchange={sellTo}
                          market="future"
                          height={280}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-muted-foreground text-center">
                  Gráficos TradingView em tempo real • Intervalo: 1 minuto
                </p>
              </TabsContent>

              {/* Tab Gráfico */}
              <TabsContent value="grafico" className="space-y-4">
                {stats && (
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="bg-profit/10 border-profit/30">
                      <CardContent className="p-2">
                        <p className="text-[10px] text-muted-foreground">Máx Spread</p>
                        {isLoadingMonitor ? (
                          <Skeleton className="h-5 w-14 mt-1" />
                        ) : (
                          <p className="text-sm font-bold text-profit">{stats.maxSpread.toFixed(3)}%</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="bg-negative/10 border-negative/30">
                      <CardContent className="p-2">
                        <p className="text-[10px] text-muted-foreground">Mín Spread</p>
                        {isLoadingMonitor ? (
                          <Skeleton className="h-5 w-14 mt-1" />
                        ) : (
                          <p className="text-sm font-bold text-negative">{stats.minSpread.toFixed(3)}%</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/10 border-primary/30">
                      <CardContent className="p-2">
                        <p className="text-[10px] text-muted-foreground">Média</p>
                        {isLoadingMonitor ? (
                          <Skeleton className="h-5 w-14 mt-1" />
                        ) : (
                          <p className={cn(
                            "text-sm font-bold",
                            stats.avgSpread >= 0 ? 'text-profit' : 'text-negative'
                          )}>{stats.avgSpread.toFixed(3)}%</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {isLoadingMonitor ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(v) => `$${v.toFixed(4)}`}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                        <Line 
                          type="monotone" 
                          dataKey="exchange1Price" 
                          stroke="#22d3ee" 
                          dot={false}
                          name="Spot"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="exchange2Price" 
                          stroke="#a78bfa" 
                          dot={false}
                          name="Futures"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                    <p>Sem dados históricos disponíveis</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab Aberturas */}
              <TabsContent value="aberturas" className="space-y-4">
                <SpreadStatsCards 
                  maxSpread={aberturasStats.max}
                  minSpread={aberturasStats.min}
                  avgSpread={aberturasStats.avg}
                  label="Entrada"
                  count={aberturasStats.count}
                  isLoading={isLoadingSpreadHistory}
                />
                <HistoryTable 
                  data={aberturasData} 
                  type="entrada" 
                  isLoading={isLoadingSpreadHistory}
                />
              </TabsContent>

              {/* Tab Fechamentos */}
              <TabsContent value="fechamentos" className="space-y-4">
                <SpreadStatsCards 
                  maxSpread={fechamentosStats.max}
                  minSpread={fechamentosStats.min}
                  avgSpread={fechamentosStats.avg}
                  label="Saída"
                  count={fechamentosStats.count}
                  isLoading={isLoadingSpreadHistory}
                />
                <HistoryTable 
                  data={fechamentosData} 
                  type="saida" 
                  isLoading={isLoadingSpreadHistory}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalAnalysisModal;
