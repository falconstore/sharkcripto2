import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, BarChart3, Clock, ArrowRightLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

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
}

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
        <p className={`text-sm font-semibold ${data.spreadPercent >= 0 ? 'text-profit' : 'text-negative'}`}>
          Spread: {data.spreadPercent?.toFixed(2)}%
        </p>
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
}: ExternalAnalysisModalProps) => {
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

  const chartData = useMemo(() => {
    if (!analysis?.historicalData) return [];
    
    return analysis.historicalData.map(item => {
      const spreadPercent = item.exchange1Price > 0 
        ? ((item.exchange2Price - item.exchange1Price) / item.exchange1Price) * 100 
        : 0;
      
      return {
        ...item,
        time: item.timestamp.split(' ')[1]?.substring(0, 5) || item.timestamp,
        spreadPercent,
      };
    });
  }, [analysis]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    
    const spreads = chartData.map(d => d.spreadPercent);
    const maxSpread = Math.max(...spreads);
    const minSpread = Math.min(...spreads);
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    
    // Contar inversões (quando spread muda de sinal)
    let inversions = 0;
    for (let i = 1; i < spreads.length; i++) {
      if ((spreads[i] >= 0 && spreads[i-1] < 0) || (spreads[i] < 0 && spreads[i-1] >= 0)) {
        inversions++;
      }
    }
    
    return { maxSpread, minSpread, avgSpread, inversions };
  }, [chartData]);

  const crossoverEvents = useMemo(() => {
    if (!analysis?.crossoverEvents) return [];
    return analysis.crossoverEvents.slice(-10); // Últimos 10 eventos
  }, [analysis]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Análise de Cruzamento - {symbol}
            <Badge variant="outline" className="bg-primary/20">
              {buyFrom.toUpperCase()} → {sellTo.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Spreads atuais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-accent/30 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Entrada Atual</p>
            <p className={`text-xl font-bold ${entrySpread >= 0 ? 'text-profit' : 'text-negative'}`}>
              {entrySpread.toFixed(2)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-accent/30 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Saída Atual</p>
            <p className={`text-xl font-bold ${exitSpread >= 0 ? 'text-profit' : 'text-negative'}`}>
              {exitSpread.toFixed(2)}%
            </p>
          </div>
          {stats && (
            <>
              <div className="p-3 rounded-lg bg-accent/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Máx. Histórico
                </p>
                <p className="text-xl font-bold text-profit">
                  {stats.maxSpread.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-accent/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Mín. Histórico
                </p>
                <p className="text-xl font-bold text-negative">
                  {stats.minSpread.toFixed(2)}%
                </p>
              </div>
            </>
          )}
        </div>

        {/* Estatísticas adicionais */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground mb-1">Média do Spread</p>
              <p className={`text-lg font-semibold ${stats.avgSpread >= 0 ? 'text-profit' : 'text-negative'}`}>
                {stats.avgSpread.toFixed(2)}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" /> Inversões
              </p>
              <p className="text-lg font-semibold text-violet-400">
                {stats.inversions}x
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Cruzamentos
              </p>
              <p className="text-lg font-semibold text-amber-400">
                {analysis?.totalCrossovers || 0}x
              </p>
            </div>
          </div>
        )}

        {/* Gráfico */}
        {chartData.length > 0 ? (
          <div className="h-64 mt-4">
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
                <Legend 
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
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
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>Sem dados históricos disponíveis</p>
          </div>
        )}

        {/* Eventos de cruzamento */}
        {crossoverEvents.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Últimos Cruzamentos
            </h4>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-accent/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Horário</th>
                    <th className="text-right p-2">Spot</th>
                    <th className="text-right p-2">Futures</th>
                    <th className="text-right p-2">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {crossoverEvents.map((event, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-accent/30">
                      <td className="p-2 text-muted-foreground">{event.timestamp}</td>
                      <td className="p-2 text-right font-mono">${event.exchange1Price.toFixed(6)}</td>
                      <td className="p-2 text-right font-mono">${event.exchange2Price.toFixed(6)}</td>
                      <td className={`p-2 text-right font-mono ${event.difference >= 0 ? 'text-profit' : 'text-negative'}`}>
                        {event.difference >= 0 ? '+' : ''}{(event.difference * 100).toFixed(4)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExternalAnalysisModal;
