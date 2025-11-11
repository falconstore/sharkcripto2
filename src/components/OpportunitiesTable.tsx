import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Ban, TrendingUp, BarChart3, History, ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOpportunities } from '@/hooks/useOpportunities';
import { usePreferences } from '@/hooks/usePreferences';
import { useCrossings } from '@/hooks/useCrossings';
import CrossingsHistoryModal from './CrossingsHistoryModal';
import { toast } from 'sonner';

type SortField = 'pair_symbol' | 'spread_net_percent' | 'spot_volume_24h' | 'futures_volume_24h';
type SortOrder = 'asc' | 'desc';

const OpportunitiesTable = () => {
  const { opportunities } = useOpportunities();
  const { favorites, blacklist, toggleFavorite, toggleBlacklist } = usePreferences();
  const { crossingsCount } = useCrossings();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('spread_net_percent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Paginação
  const paginatedOpportunities = useMemo(() => {
    if (itemsPerPage === 0) return filteredAndSorted; // "Todos"
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredAndSorted.length / itemsPerPage);

  // Resetar para página 1 ao buscar/filtrar
  useMemo(() => {
    setCurrentPage(1);
  }, [search, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleOpenHistory = (symbol: string) => {
    setSelectedPair(symbol);
    setHistoryModalOpen(true);
  };

  const getCrossingsForPair = (symbol: string): number => {
    return crossingsCount[symbol] || 0;
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatVolume = (num: number) => {
    if (!num || num === 0) {
      return '$0.00';
    }
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
                <TableHead>Cruzamentos (1h)</TableHead>
                <TableHead>Preço Spot (Compra)</TableHead>
                <TableHead>Preço Futuros (Venda)</TableHead>
                <TableHead>Volume 24h (Spot / Futuro)</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOpportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhuma oportunidade encontrada' : 'Aguardando dados...'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOpportunities.map((opp, index) => {
                  const isFavorite = favorites.has(opp.pair_symbol);
                  const crossingsCount = getCrossingsForPair(opp.pair_symbol);
                  return (
                    <TableRow 
                      key={opp.pair_symbol}
                      className={`hover:bg-accent/80 hover:shadow-md cursor-pointer transition-all ${
                        index % 2 === 0 ? 'bg-card' : 'bg-accent/20'
                      }`}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleFavorite(opp.pair_symbol);
                            toast.success(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
                          }}
                          className="h-8 w-8 p-0 hover:scale-110 transition-transform"
                        >
                          <Star className={`w-5 h-5 ${isFavorite ? 'fill-gold text-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' : 'text-muted-foreground'}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {opp.pair_symbol}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`font-mono font-semibold px-3 py-1 ${
                            opp.spread_net_percent_entrada >= 0 
                              ? 'bg-profit/20 text-profit border-profit/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                              : 'bg-destructive/20 text-destructive border-destructive/40'
                          }`}
                        >
                          {formatNumber(opp.spread_net_percent_entrada, 4)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={`font-mono font-semibold px-3 py-1 ${
                            opp.spread_net_percent_saida >= 0 
                              ? 'bg-profit/20 text-profit border-profit/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                              : 'bg-destructive/20 text-destructive border-destructive/40'
                          }`}
                        >
                          {formatNumber(opp.spread_net_percent_saida, 4)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs font-semibold px-2 py-1 ${
                              crossingsCount > 0 ? 'bg-gold/20 text-gold border-gold/30' : ''
                            }`}
                          >
                            {crossingsCount}
                          </Badge>
                          {crossingsCount > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenHistory(opp.pair_symbol)}
                              className="h-6 w-6"
                            >
                              <History className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
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
                          size="icon"
                          onClick={() => {
                            toggleBlacklist(opp.pair_symbol);
                            toast.info(`${opp.pair_symbol} adicionado à blacklist`);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
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

        {/* Paginação */}
        {filteredAndSorted.length > 0 && (
          <div className="border-t border-border mt-4 pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Info */}
              <div className="text-sm text-muted-foreground">
                Mostrando{' '}
                <span className="font-semibold text-foreground">
                  {itemsPerPage === 0 
                    ? filteredAndSorted.length
                    : Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSorted.length)
                  }
                </span>
                {' '}-{' '}
                <span className="font-semibold text-foreground">
                  {itemsPerPage === 0 
                    ? filteredAndSorted.length 
                    : Math.min(currentPage * itemsPerPage, filteredAndSorted.length)
                  }
                </span>
                {' '}de{' '}
                <span className="font-semibold text-foreground">{filteredAndSorted.length}</span>
                {' '}oportunidades
              </div>

              {/* Controles */}
              <div className="flex items-center gap-4">
                {/* Items por página */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="0">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Navegação de páginas */}
                {itemsPerPage > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="text-sm font-medium">
                      Página {currentPage} de {totalPages}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/statistics')}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Ver estatísticas completas
          </Button>
        </div>
      </CardContent>

      <CrossingsHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        pairSymbol={selectedPair}
      />
    </Card>
  );
};

export default OpportunitiesTable;
