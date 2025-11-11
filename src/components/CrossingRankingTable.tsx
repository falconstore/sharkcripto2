import { CoinRankingItem } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CrossingRankingTableProps {
  data: CoinRankingItem[];
  loading: boolean;
}

const CrossingRankingTable = ({ data, loading }: CrossingRankingTableProps) => {
  if (loading) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px] mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getPositionIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}º`;
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          Ranking de Moedas
        </CardTitle>
        <CardDescription>
          Moedas com mais cruzamentos no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum cruzamento registrado
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">Pos.</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead className="text-right">Cruzamentos</TableHead>
                    <TableHead className="text-right">Média %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 10).map((item, index) => (
                    <TableRow key={item.pair_symbol}>
                      <TableCell className="font-medium text-center">
                        {getPositionIcon(index)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {item.pair_symbol}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="bg-primary">
                          {item.total_crossings}x
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-500 font-mono">
                          +{item.avg_spread.toFixed(4)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrossingRankingTable;
