import { CoinRankingItem } from '@/hooks/useStatistics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useIsMobile } from '@/hooks/use-mobile';

interface CrossingRankingTableProps {
  data: CoinRankingItem[];
  loading: boolean;
}

const CrossingRankingTable = ({ data, loading }: CrossingRankingTableProps) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <Card className="lg:col-span-1 relative overflow-hidden animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm" style={{ animationDelay: '200ms' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent animate-shimmer" />
        <CardHeader>
          <div className="h-6 w-44 bg-muted rounded animate-pulse" />
          <div className="h-4 w-56 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full bg-muted/50 rounded animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPositionBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-orange-500 flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-gold/30 animate-pulse">
          🥇
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-gray-400/30">
          🥈
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-orange-500/30">
          🥉
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
        {index + 1}º
      </div>
    );
  };

  return (
    <Card className="lg:col-span-1 group border-border/50 bg-card/80 backdrop-blur-sm hover:border-gold/30 transition-all duration-300 animate-fade-in hover:shadow-lg hover:shadow-gold/5" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 group-hover:bg-gold/20 transition-colors">
            <Trophy className="w-5 h-5 text-gold" />
          </div>
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
        ) : isMobile ? (
          // Mobile: Cards view
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {data.slice(0, 10).map((item, index) => (
              <div 
                key={item.pair_symbol}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border border-border/50 animate-fade-in
                  ${index < 3 ? 'bg-gold/5' : 'bg-muted/30'}
                `}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {getPositionBadge(index)}
                <div className="flex-1 min-w-0">
                  <p className={`font-mono font-semibold truncate ${index < 3 ? 'text-gold' : ''}`}>
                    {item.pair_symbol}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="default" 
                      className={`text-xs ${
                        index === 0 ? 'bg-gradient-to-r from-gold to-orange-500 text-primary-foreground' : 
                          index < 3 ? 'bg-gold/20 text-gold border-gold/30' : 'bg-primary'
                      }`}
                    >
                      {item.total_crossings}x
                    </Badge>
                    <span className="text-profit font-mono text-sm">
                      +{item.avg_spread.toFixed(4)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop: Table view
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-[60px]">Pos.</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead className="text-right">Cruzamentos</TableHead>
                    <TableHead className="text-right">Média %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 10).map((item, index) => (
                    <TableRow 
                      key={item.pair_symbol}
                      className={`
                        animate-fade-in hover:bg-accent/50 transition-all
                        ${index < 3 ? 'bg-gold/5 hover:bg-gold/10' : ''}
                      `}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <TableCell className="font-medium">
                        {getPositionBadge(index)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        <span className={index < 3 ? 'text-gold' : ''}>
                          {item.pair_symbol}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant="default" 
                          className={`
                            ${index === 0 ? 'bg-gradient-to-r from-gold to-orange-500 text-primary-foreground shadow-lg shadow-gold/30' : 
                              index < 3 ? 'bg-gold/20 text-gold border-gold/30' : 'bg-primary'}
                          `}
                        >
                          {item.total_crossings}x
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-profit font-mono font-semibold">
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
