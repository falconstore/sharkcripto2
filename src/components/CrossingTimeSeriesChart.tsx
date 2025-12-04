import { TimeSeriesData, Period } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
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

  // Extrair nomes das moedas (todas as chaves exceto 'time')
  const coinNames = Object.keys(data[0]).filter(key => key !== 'time');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Cruzamentos ao Longo do Tempo
        </CardTitle>
        <CardDescription>
          {getPeriodLabel(period)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                borderRadius: '8px',
              }}
            />
            <Legend />
            {coinNames.map((coin, index) => (
              <Line
                key={coin}
                type="monotone"
                dataKey={coin}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CrossingTimeSeriesChart;