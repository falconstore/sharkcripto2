import { useState, useMemo } from 'react';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePreferences } from '@/hooks/usePreferences';
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
import { Search, ArrowUpDown, TrendingUp, Star, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type SortField = 'pair_symbol' | 'spread_net_percent' | 'spot_volume_24h' | 'futures_volume_24h';
type SortOrder = 'asc' | 'desc';

const OpportunitiesTable = () => {
  const { opportunities } = useOpportunities();
  const { favorites, blacklist, toggleFavorite, toggleBlacklist } = usePreferences();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('spread_net_percent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSorted = useMemo(() => {
    // Filtrar blacklist
    let filtered = opportunities.filter(opp => !blacklist.has(opp.pair_symbol));

    // Filtrar por busca
    if (search) {
      filtered = filtered.filter(opp =>
        opp.pair_symbol.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Separar favoritos
    const favoritesArray = filtered.filter(opp => favorites.has(opp.pair_symbol));
    const nonFavoritesArray = filtered.filter(opp => !favorites.has(opp.pair_symbol));

    // Ordenar cada grupo
    const sortArray = (arr: typeof filtered) => {
      return arr.sort((a, b) => {
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
    };

    // Favoritos sempre no topo
    return [...sortArray(favoritesArray), ...sortArray(nonFavoritesArray)];
  }, [opportunities, search, sortField, sortOrder, favorites, blacklist]);

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
    } else if (num < 1) {
      return `$${num.toFixed(3)}`;
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
                <TableHead className="w-[50px]"></TableHead>
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
                    Entrada %
                    <ArrowUpDown className="ml-2 w-4 h-4" />
                  </Button>
                </TableHead>
                <TableHead>Saída %</TableHead>
                <TableHead>Preço Spot (Compra)</TableHead>
                <TableHead>Preço Futuros (Venda)</TableHead>
                <TableHead>Volume 24h (Spot / Futuro)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhuma oportunidade encontrada' : 'Aguardando dados...'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((opp, index) => {
                  const isFavorite = favorites.has(opp.pair_symbol);
                  return (
                    <TableRow 
                      key={opp.timestamp + opp.pair_symbol + index}
                      className={`transition-all duration-300 hover:bg-accent/50 ${isFavorite ? 'bg-gold/5' : ''}`}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleFavorite(opp.pair_symbol);
                            toast.success(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
                          }}
                          className="p-1 h-auto"
                        >
                          <Star 
                            className={`w-4 h-4 ${isFavorite ? 'fill-gold text-gold' : 'text-muted-foreground'}`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {opp.pair_symbol}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          opp.spread_net_percent_entrada >= 0 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {formatNumber(opp.spread_net_percent_entrada, 4)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          opp.spread_net_percent_saida >= 0 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {formatNumber(opp.spread_net_percent_saida, 4)}%
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${formatNumber(opp.spot_bid_price, 8)}
                      </TableCell>
                      <TableCell className="font-mono">
                        ${formatNumber(opp.futures_ask_price, 8)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex flex-col gap-0.5">
                          <span>{formatVolume(opp.spot_volume_24h)}</span>
                          <span className="text-muted-foreground">/ {formatVolume(opp.futures_volume_24h)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleBlacklist(opp.pair_symbol);
                            toast.info(`${opp.pair_symbol} adicionado à blacklist`);
                          }}
                          className="p-1 h-auto text-destructive hover:text-destructive"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunitiesTable;