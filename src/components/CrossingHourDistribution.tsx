import { HourDistribution } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock } from 'lucide-react';

interface CrossingHourDistributionProps {
  data: HourDistribution[];
  loading: boolean;
}

const CrossingHourDistribution = ({ data, loading }: CrossingHourDistributionProps) => {
  if (loading) {
    return (
      <Card className="lg:col-span-1 relative overflow-hidden animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm" style={{ animationDelay: '100ms' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent animate-shimmer" />
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

  const chartData = data.map(item => ({
    hour: `${item.hour}h`,
    cruzamentos: item.count,
    rawHour: item.hour,
  }));

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card className="lg:col-span-1 group border-border/50 bg-card/80 backdrop-blur-sm hover:border-gold/30 transition-all duration-300 animate-fade-in hover:shadow-lg hover:shadow-gold/5" style={{ animationDelay: '100ms' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 group-hover:bg-gold/20 transition-colors">
            <Clock className="w-5 h-5 text-gold" />
          </div>
          Distribuição por Horário
        </CardTitle>
        <CardDescription>
          Cruzamentos por hora do dia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.every(item => item.count === 0) ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum cruzamento registrado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis
                dataKey="hour"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval={2}
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
                  boxShadow: '0 10px 40px -10px hsl(var(--gold) / 0.2)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
              />
              <Bar
                dataKey="cruzamentos"
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
                animationBegin={0}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.cruzamentos === maxCount ? 'hsl(var(--gold))' : 'url(#barGradient)'}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default CrossingHourDistribution;
