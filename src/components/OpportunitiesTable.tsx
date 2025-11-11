import { useState, useMemo } from 'react';
import { useOpportunities } from '@/hooks/useOpportunities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SortField = 'pair_symbol' | 'spread_net_percent' | 'spot_volume_24h' | 'futures_volume_24h';
type SortOrder = 'asc' | 'desc';

const OpportunitiesTable = () => {
  const { opportunities } = useOpportunities();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('spread_net_percent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSorted = useMemo(() => {
    let filtered = opportunities;

    // Filtrar por busca
    if (search) {
      filtered = filtered.filter(opp =>
        opp.pair_symbol.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [opportunities, search, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatVolume = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  return (
    <Card className="bg-gradient-card hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            Oportunidades de Arbitragem
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar par..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5">
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('pair_symbol')}
                    className="font-semibold"
                  >
                    Par
                    <ArrowUpDown className="ml-2 w-4 h-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('spread_net_percent')}
                    className="font-semibold"
                  >
                    Spread Líquido %
                    <ArrowUpDown className="ml-2 w-4 h-4" />
                  </Button>
                </TableHead>
                <TableHead>Preço Spot (Compra)</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('spot_volume_24h')}
                    className="font-semibold"
                  >
                    Volume Spot 24h
                    <ArrowUpDown className="ml-2 w-4 h-4" />
                  </Button>
                </TableHead>
                <TableHead>Preço Futuros (Venda)</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('futures_volume_24h')}
                    className="font-semibold"
                  >
                    Volume Futuros 24h
                    <ArrowUpDown className="ml-2 w-4 h-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhuma oportunidade encontrada' : 'Aguardando dados...'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((opp, index) => (
                  <TableRow 
                    key={opp.timestamp + opp.pair_symbol + index}
                    className="transition-all duration-300 hover:bg-accent/50"
                  >
                    <TableCell className="font-mono font-semibold">
                      {opp.pair_symbol}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gold/10 text-gold border border-gold/20 animate-pulse-gold">
                        {formatNumber(opp.spread_net_percent, 4)}%
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      ${formatNumber(opp.spot_bid_price, 8)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatVolume(opp.spot_volume_24h)}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${formatNumber(opp.futures_ask_price, 8)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatVolume(opp.futures_volume_24h)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunitiesTable;