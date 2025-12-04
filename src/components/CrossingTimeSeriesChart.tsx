import { TimeSeriesData, Period } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface CrossingTimeSeriesChartProps {
  data: TimeSeriesData[];
  loading: boolean;
  period: Period;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--gold))',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(346, 77%, 50%)',
];

const getPeriodLabel = (period: Period): string => {
  const labels: Record<Period, string> = {
    '15min': 'Últimos 15 minutos',
    '30min': 'Últimos 30 minutos',
    '1h': 'Última hora',
    '3h': 'Últimas 3 horas',
    '24h': 'Últimas 24 horas',
  };
  return labels[period];
};

const CrossingTimeSeriesChart = ({ data, loading, period }: CrossingTimeSeriesChartProps) => {
  if (loading) {
    return (
      <Card className="relative overflow-hidden animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            Cruzamentos ao Longo do Tempo
          </CardTitle>
          <CardDescription>
            Top 5 moedas com mais cruzamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nenhum dado disponível para o período selecionado
        </CardContent>
      </Card>
    );
  }

  const coinNames = Object.keys(data[0]).filter(key => key !== 'time');

  return (
    <Card className="group border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 animate-fade-in hover:shadow-lg hover:shadow-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          Cruzamentos ao Longo do Tempo
        </CardTitle>
        <CardDescription>
          {getPeriodLabel(period)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
            <XAxis
              dataKey="time"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            {coinNames.map((coin, index) => (
              <Line
                key={coin}
                type="monotone"
                dataKey={coin}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[index % COLORS.length] }}
                activeDot={{ 
                  r: 6, 
                  fill: COLORS[index % COLORS.length],
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2,
                }}
                animationDuration={1000}
                animationBegin={index * 200}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CrossingTimeSeriesChart;
