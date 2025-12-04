import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Ban, TrendingUp, BarChart3, History, ChevronLeft, ChevronRight, Search, ArrowUpDown, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useCoinListings } from '@/hooks/useCoinListings';
import CrossingsHistoryModal from './CrossingsHistoryModal';
import NewCoinBadge from './NewCoinBadge';
import DelistWarning from './DelistWarning';
import { toast } from 'sonner';

type SortField = 'pair_symbol' | 'spread_net_percent_entrada' | 'spread_net_percent_saida' | 'spot_volume_24h' | 'futures_volume_24h';
type SortOrder = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const OpportunitiesTable = () => {
  const { opportunities } = useOpportunities();
  const { favorites, blacklist, toggleFavorite, toggleBlacklist } = usePreferences();
  const { crossingsCount } = useCrossings();
  const { isNewCoin, getDelistingInfo } = useCoinListings();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { field: 'spread_net_percent_entrada', order: 'desc' }
  ]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minSpotVolume, setMinSpotVolume] = useState<number>(0);
  const [minFuturesVolume, setMinFuturesVolume] = useState<number>(0);
  const [minSpreadEntrada, setMinSpreadEntrada] = useState<number>(0);
  const [minSpreadSaida, setMinSpreadSaida] = useState<number>(0);

  const filteredAndSorted = useMemo(() => {
    // 1. Filtrar blacklist
    let filtered = opportunities.filter(opp => !blacklist.has(opp.pair_symbol));

    // 2. Filtrar por busca
    if (search) {
      filtered = filtered.filter(opp =>
        opp.pair_symbol.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 3. Filtrar por volume mínimo (Spot)
    if (minSpotVolume > 0) {
      filtered = filtered.filter(opp => opp.spot_volume_24h >= minSpotVolume);
    }

    // 4. Filtrar por volume mínimo (Futures)
    if (minFuturesVolume > 0) {
      filtered = filtered.filter(opp => opp.futures_volume_24h >= minFuturesVolume);
    }

    // 5. Filtrar por spread mínimo (Entrada)
    if (minSpreadEntrada > 0) {
      filtered = filtered.filter(opp => opp.spread_net_percent_entrada >= minSpreadEntrada);
    }

    // 6. Filtrar por spread mínimo (Saída)
    if (minSpreadSaida > 0) {
      filtered = filtered.filter(opp => opp.spread_net_percent_saida >= minSpreadSaida);
    }

    // 7. Separar favoritos
    const favoritesArray = filtered.filter(opp => favorites.has(opp.pair_symbol));
    const nonFavoritesArray = filtered.filter(opp => !favorites.has(opp.pair_symbol));

    // 8. Ordenação por múltiplas colunas
    const sortArray = (arr: typeof filtered) => {
      return arr.sort((a, b) => {
        // Percorrer cada configuração de ordenação
        for (const config of sortConfigs) {
          const aVal = a[config.field];
          const bVal = b[config.field];
          
          let comparison = 0;
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          } else {
            comparison = (aVal as number) - (bVal as number);
          }
          
          // Se valores são diferentes, aplicar ordem
          if (comparison !== 0) {
            return config.order === 'asc' ? comparison : -comparison;
          }
          // Se são iguais, continuar para próxima configuração
        }
        return 0;
      });
    };

    // Favoritos sempre no topo
    return [...sortArray(favoritesArray), ...sortArray(nonFavoritesArray)];
  }, [opportunities, search, minSpotVolume, minFuturesVolume, minSpreadEntrada, minSpreadSaida, sortConfigs, favorites, blacklist]);

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
  }, [search, minSpotVolume, minFuturesVolume, minSpreadEntrada, minSpreadSaida, sortConfigs]);

  const handleSort = (field: SortField, addToStack: boolean = false) => {
    if (addToStack) {
      // Adicionar à pilha de ordenação
      const existingIndex = sortConfigs.findIndex(c => c.field === field);
      
      if (existingIndex >= 0) {
        // Toggle order da configuração existente
        const newConfigs = [...sortConfigs];
        newConfigs[existingIndex].order = 
          newConfigs[existingIndex].order === 'asc' ? 'desc' : 'asc';
        setSortConfigs(newConfigs);
      } else {
        // Adicionar nova configuração
        setSortConfigs([...sortConfigs, { field, order: 'desc' }]);
      }
    } else {
      // Substituir toda a pilha (comportamento normal)
      const existing = sortConfigs.find(c => c.field === field);
      if (existing) {
        setSortConfigs([{ field, order: existing.order === 'asc' ? 'desc' : 'asc' }]);
      } else {
        setSortConfigs([{ field, order: 'desc' }]);
      }
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

  const clearFilters = () => {
    setMinSpotVolume(0);
    setMinFuturesVolume(0);
    setMinSpreadEntrada(0);
    setMinSpreadSaida(0);
    toast.success('Filtros limpos');
  };

  const activeFiltersCount = [minSpotVolume, minFuturesVolume, minSpreadEntrada, minSpreadSaida].filter(v => v > 0).length;

  // Componente de filtros
  const FilterPanel = () => (
    <div className="space-y-6 py-4">
      {/* Filtro de Volume Spot */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Volume Mínimo Spot</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[minSpotVolume]}
            onValueChange={(value) => setMinSpotVolume(value[0])}
            min={0}
            max={10000000}
            step={100000}
            className="flex-1"
          />
          <Input
            type="number"
            value={minSpotVolume}
            onChange={(e) => setMinSpotVolume(Number(e.target.value))}
            className="w-32"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatVolume(minSpotVolume)}
        </p>
      </div>

      {/* Filtro de Volume Futures */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Volume Mínimo Futures</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[minFuturesVolume]}
            onValueChange={(value) => setMinFuturesVolume(value[0])}
            min={0}
            max={10000000}
            step={100000}
            className="flex-1"
          />
          <Input
            type="number"
            value={minFuturesVolume}
            onChange={(e) => setMinFuturesVolume(Number(e.target.value))}
            className="w-32"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatVolume(minFuturesVolume)}
        </p>
      </div>

      {/* Filtro de Spread Entrada */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Spread Mínimo Entrada (%)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[minSpreadEntrada * 100]}
            onValueChange={(value) => setMinSpreadEntrada(value[0] / 100)}
            min={0}
            max={500}
            step={10}
            className="flex-1"
          />
          <Input
            type="number"
            value={minSpreadEntrada}
            onChange={(e) => setMinSpreadEntrada(Number(e.target.value))}
            className="w-32"
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {minSpreadEntrada.toFixed(2)}%
        </p>
      </div>

      {/* Filtro de Spread Saída */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Spread Mínimo Saída (%)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[minSpreadSaida * 100]}
            onValueChange={(value) => setMinSpreadSaida(value[0] / 100)}
            min={0}
            max={500}
            step={10}
            className="flex-1"
          />
          <Input
            type="number"
            value={minSpreadSaida}
            onChange={(e) => setMinSpreadSaida(Number(e.target.value))}
            className="w-32"
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {minSpreadSaida.toFixed(2)}%
        </p>
      </div>

      {/* Botão limpar filtros */}
      <Button
        variant="outline"
        onClick={clearFilters}
        className="w-full"
      >
        <X className="w-4 h-4 mr-2" />
        Limpar Filtros
      </Button>
    </div>
  );

  // Componente para mostrar a pilha de ordenação
  const SortStack = () => {
    if (sortConfigs.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="text-xs text-muted-foreground">Ordenação:</span>
        {sortConfigs.map((config, index) => (
          <Badge key={config.field} variant="outline" className="gap-2">
            <span className="text-xs">
              {index + 1}. {config.field.replace(/_/g, ' ')} 
              {config.order === 'asc' ? ' ↑' : ' ↓'}
            </span>
            <X
              className="w-3 h-3 cursor-pointer hover:text-destructive"
              onClick={() => {
                setSortConfigs(sortConfigs.filter((_, i) => i !== index));
              }}
            />
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <TooltipProvider>
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
            
            {/* Botão de filtros */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros Avançados</SheetTitle>
                </SheetHeader>
                <FilterPanel />
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Pilha de ordenação */}
        <SortStack />
        
        {/* Dica de uso */}
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground">
            💡 Dica: CTRL/CMD + Click nas colunas para ordenar por múltiplos campos
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSort('pair_symbol', e.ctrlKey || e.metaKey)}
                        className="font-semibold"
                      >
                        Par
                        {sortConfigs.find(c => c.field === 'pair_symbol') && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {sortConfigs.findIndex(c => c.field === 'pair_symbol') + 1}
                            {sortConfigs.find(c => c.field === 'pair_symbol')?.order === 'asc' ? '↑' : '↓'}
                          </Badge>
                        )}
                        <ArrowUpDown className="ml-2 w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>CTRL/CMD + Click para adicionar à ordenação</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSort('spread_net_percent_entrada', e.ctrlKey || e.metaKey)}
                        className="font-semibold"
                      >
                        Entrada %
                        {sortConfigs.find(c => c.field === 'spread_net_percent_entrada') && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {sortConfigs.findIndex(c => c.field === 'spread_net_percent_entrada') + 1}
                            {sortConfigs.find(c => c.field === 'spread_net_percent_entrada')?.order === 'asc' ? '↑' : '↓'}
                          </Badge>
                        )}
                        <ArrowUpDown className="ml-2 w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>CTRL/CMD + Click para adicionar à ordenação</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSort('spread_net_percent_saida', e.ctrlKey || e.metaKey)}
                        className="font-semibold"
                      >
                        Saída %
                        {sortConfigs.find(c => c.field === 'spread_net_percent_saida') && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {sortConfigs.findIndex(c => c.field === 'spread_net_percent_saida') + 1}
                            {sortConfigs.find(c => c.field === 'spread_net_percent_saida')?.order === 'asc' ? '↑' : '↓'}
                          </Badge>
                        )}
                        <ArrowUpDown className="ml-2 w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>CTRL/CMD + Click para adicionar à ordenação</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="font-semibold">
                      Funding %
                    </TooltipTrigger>
                    <TooltipContent>Taxa de financiamento do contrato futuro</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>Cruzamentos (1h)</TableHead>
                <TableHead>Preço Spot (Compra)</TableHead>
                <TableHead>Preço Futuros (Venda)</TableHead>
                <TableHead>
                  <div className="flex flex-col gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleSort('spot_volume_24h', e.ctrlKey || e.metaKey)}
                          className="font-semibold h-auto py-1"
                        >
                          Volume Spot
                          {sortConfigs.find(c => c.field === 'spot_volume_24h') && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {sortConfigs.findIndex(c => c.field === 'spot_volume_24h') + 1}
                              {sortConfigs.find(c => c.field === 'spot_volume_24h')?.order === 'asc' ? '↑' : '↓'}
                            </Badge>
                          )}
                          <ArrowUpDown className="ml-2 w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>CTRL/CMD + Click para adicionar à ordenação</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleSort('futures_volume_24h', e.ctrlKey || e.metaKey)}
                          className="font-semibold h-auto py-1"
                        >
                          Volume Futures
                          {sortConfigs.find(c => c.field === 'futures_volume_24h') && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {sortConfigs.findIndex(c => c.field === 'futures_volume_24h') + 1}
                              {sortConfigs.find(c => c.field === 'futures_volume_24h')?.order === 'asc' ? '↑' : '↓'}
                            </Badge>
                          )}
                          <ArrowUpDown className="ml-2 w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>CTRL/CMD + Click para adicionar à ordenação</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOpportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                        <div className="flex items-center gap-2">
                          {getDelistingInfo(opp.pair_symbol) && (
                            <DelistWarning scheduledDate={getDelistingInfo(opp.pair_symbol)!.scheduled_date} />
                          )}
                          <span>{opp.pair_symbol}</span>
                          {isNewCoin(opp.pair_symbol) && (
                            <NewCoinBadge />
                          )}
                        </div>
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
                      <TableCell className="text-center">
                        <span className={`font-mono font-semibold ${
                          (opp.funding_rate || 0) >= 0 ? 'text-profit' : 'text-destructive'
                        }`}>
                          {((opp.funding_rate || 0) * 100).toFixed(4)}%
                        </span>
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
    </TooltipProvider>
  );
};

export default OpportunitiesTable;
