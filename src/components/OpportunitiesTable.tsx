import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Ban, TrendingUp, BarChart3, History, ChevronLeft, ChevronRight, Search, ArrowUpDown, X, Columns, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

// Colunas disponíveis
const ALL_COLUMNS = [
  { key: 'pair_symbol', label: 'Par' },
  { key: 'spread_net_percent_entrada', label: 'Entrada %' },
  { key: 'spread_net_percent_saida', label: 'Saída %' },
  { key: 'funding_rate', label: 'Funding %' },
  { key: 'crossings', label: 'Cruzamentos' },
  { key: 'spot_bid_price', label: 'Preço Spot' },
  { key: 'futures_ask_price', label: 'Preço Futures' },
  { key: 'volumes', label: 'Volumes' },
] as const;

const DEFAULT_COLUMNS = ['pair_symbol', 'spread_net_percent_entrada', 'spread_net_percent_saida', 'funding_rate', 'crossings', 'volumes'];

const OpportunitiesTable = () => {
  const { opportunities } = useOpportunities();
  const { favorites, blacklist, toggleFavorite, toggleBlacklist } = usePreferences();
  const { crossingsCount } = useCrossings();
  const { isNewCoin, getDelistingInfo } = useCoinListings();
  const navigate = useNavigate();
  
  // Estados básicos
  const [search, setSearch] = useState('');
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { field: 'spread_net_percent_entrada', order: 'desc' }
  ]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Filtros avançados (inputs digitados)
  const [minEntrada, setMinEntrada] = useState('');
  const [maxEntrada, setMaxEntrada] = useState('');
  const [minSaida, setMinSaida] = useState('');
  const [maxSaida, setMaxSaida] = useState('');
  const [minFunding, setMinFunding] = useState('');
  const [maxFunding, setMaxFunding] = useState('');
  const [minVolSpot, setMinVolSpot] = useState('');
  const [minVolFut, setMinVolFut] = useState('');
  
  // Colunas visíveis
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('opportunitiesVisibleColumns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  // Salvar colunas no localStorage
  useEffect(() => {
    localStorage.setItem('opportunitiesVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(c => c !== columnKey)
        : [...prev, columnKey]
    );
  };

  const isColumnVisible = (columnKey: string) => visibleColumns.includes(columnKey);

  const filteredAndSorted = useMemo(() => {
    let filtered = opportunities.filter(opp => !blacklist.has(opp.pair_symbol));

    // Filtrar por busca
    if (search) {
      filtered = filtered.filter(opp =>
        opp.pair_symbol.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtros avançados digitados
    const parseNum = (val: string) => val ? parseFloat(val) : null;
    
    const minEntradaNum = parseNum(minEntrada);
    const maxEntradaNum = parseNum(maxEntrada);
    const minSaidaNum = parseNum(minSaida);
    const maxSaidaNum = parseNum(maxSaida);
    const minFundingNum = parseNum(minFunding);
    const maxFundingNum = parseNum(maxFunding);
    const minVolSpotNum = parseNum(minVolSpot);
    const minVolFutNum = parseNum(minVolFut);

    if (minEntradaNum !== null) {
      filtered = filtered.filter(opp => opp.spread_net_percent_entrada >= minEntradaNum);
    }
    if (maxEntradaNum !== null) {
      filtered = filtered.filter(opp => opp.spread_net_percent_entrada <= maxEntradaNum);
    }
    if (minSaidaNum !== null) {
      filtered = filtered.filter(opp => opp.spread_net_percent_saida >= minSaidaNum);
    }
    if (maxSaidaNum !== null) {
      filtered = filtered.filter(opp => opp.spread_net_percent_saida <= maxSaidaNum);
    }
    if (minFundingNum !== null) {
      filtered = filtered.filter(opp => ((opp.funding_rate || 0) * 100) >= minFundingNum);
    }
    if (maxFundingNum !== null) {
      filtered = filtered.filter(opp => ((opp.funding_rate || 0) * 100) <= maxFundingNum);
    }
    if (minVolSpotNum !== null) {
      filtered = filtered.filter(opp => opp.spot_volume_24h >= minVolSpotNum);
    }
    if (minVolFutNum !== null) {
      filtered = filtered.filter(opp => opp.futures_volume_24h >= minVolFutNum);
    }

    // Separar favoritos
    const favoritesArray = filtered.filter(opp => favorites.has(opp.pair_symbol));
    const nonFavoritesArray = filtered.filter(opp => !favorites.has(opp.pair_symbol));

    // Ordenação
    const sortArray = (arr: typeof filtered) => {
      return arr.sort((a, b) => {
        for (const config of sortConfigs) {
          const aVal = a[config.field];
          const bVal = b[config.field];
          
          let comparison = 0;
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          } else {
            comparison = (aVal as number) - (bVal as number);
          }
          
          if (comparison !== 0) {
            return config.order === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    };

    return [...sortArray(favoritesArray), ...sortArray(nonFavoritesArray)];
  }, [opportunities, search, minEntrada, maxEntrada, minSaida, maxSaida, minFunding, maxFunding, minVolSpot, minVolFut, sortConfigs, favorites, blacklist]);

  const paginatedOpportunities = useMemo(() => {
    if (itemsPerPage === 0) return filteredAndSorted;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, minEntrada, maxEntrada, minSaida, maxSaida, minFunding, maxFunding, minVolSpot, minVolFut, sortConfigs]);

  const handleSort = (field: SortField, addToStack: boolean = false) => {
    if (addToStack) {
      const existingIndex = sortConfigs.findIndex(c => c.field === field);
      
      if (existingIndex >= 0) {
        const newConfigs = [...sortConfigs];
        newConfigs[existingIndex].order = 
          newConfigs[existingIndex].order === 'asc' ? 'desc' : 'asc';
        setSortConfigs(newConfigs);
      } else {
        setSortConfigs([...sortConfigs, { field, order: 'desc' }]);
      }
    } else {
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
    if (!num || num === 0) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const clearFilters = () => {
    setMinEntrada('');
    setMaxEntrada('');
    setMinSaida('');
    setMaxSaida('');
    setMinFunding('');
    setMaxFunding('');
    setMinVolSpot('');
    setMinVolFut('');
    toast.success('Filtros limpos');
  };

  const activeFiltersCount = [minEntrada, maxEntrada, minSaida, maxSaida, minFunding, maxFunding, minVolSpot, minVolFut].filter(v => v !== '').length;

  // Componente de filtros avançados digitados
  const AdvancedFilters = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-3 bg-accent/30 rounded-lg">
      <div className="space-y-1">
        <Label className="text-xs">Entrada % mín</Label>
        <Input
          type="number"
          value={minEntrada}
          onChange={(e) => setMinEntrada(e.target.value)}
          placeholder="-5"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Entrada % máx</Label>
        <Input
          type="number"
          value={maxEntrada}
          onChange={(e) => setMaxEntrada(e.target.value)}
          placeholder="5"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Saída % mín</Label>
        <Input
          type="number"
          value={minSaida}
          onChange={(e) => setMinSaida(e.target.value)}
          placeholder="0"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Saída % máx</Label>
        <Input
          type="number"
          value={maxSaida}
          onChange={(e) => setMaxSaida(e.target.value)}
          placeholder="10"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Funding % mín</Label>
        <Input
          type="number"
          value={minFunding}
          onChange={(e) => setMinFunding(e.target.value)}
          placeholder="-0.1"
          className="h-8 text-sm"
          step="0.001"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Funding % máx</Label>
        <Input
          type="number"
          value={maxFunding}
          onChange={(e) => setMaxFunding(e.target.value)}
          placeholder="0.1"
          className="h-8 text-sm"
          step="0.001"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vol. Spot mín</Label>
        <Input
          type="number"
          value={minVolSpot}
          onChange={(e) => setMinVolSpot(e.target.value)}
          placeholder="100000"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vol. Fut mín</Label>
        <Input
          type="number"
          value={minVolFut}
          onChange={(e) => setMinVolFut(e.target.value)}
          placeholder="100000"
          className="h-8 text-sm"
        />
      </div>
    </div>
  );

  // Pilha de ordenação
  const SortStack = () => {
    if (sortConfigs.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-col gap-4">
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
                  className="pl-9 w-48"
                />
              </div>
              
              {/* Seletor de colunas */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="w-4 h-4 mr-2" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Colunas visíveis</p>
                    {ALL_COLUMNS.map(col => (
                      <div key={col.key} className="flex items-center gap-2">
                        <Checkbox
                          id={col.key}
                          checked={isColumnVisible(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <Label htmlFor={col.key} className="text-sm cursor-pointer">
                          {col.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Limpar filtros */}
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>
          
          {/* Filtros avançados */}
          <AdvancedFilters />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5">
                <TableHead className="w-[50px]"></TableHead>
                {isColumnVisible('pair_symbol') && (
                  <TableHead>
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
                  </TableHead>
                )}
                {isColumnVisible('spread_net_percent_entrada') && (
                  <TableHead>
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
                  </TableHead>
                )}
                {isColumnVisible('spread_net_percent_saida') && (
                  <TableHead>
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
                  </TableHead>
                )}
                {isColumnVisible('funding_rate') && (
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="font-semibold">
                        Funding %
                      </TooltipTrigger>
                      <TooltipContent>Taxa de financiamento do contrato futuro</TooltipContent>
                    </Tooltip>
                  </TableHead>
                )}
                {isColumnVisible('crossings') && (
                  <TableHead>Cruzamentos (1h)</TableHead>
                )}
                {isColumnVisible('spot_bid_price') && (
                  <TableHead>Preço Spot</TableHead>
                )}
                {isColumnVisible('futures_ask_price') && (
                  <TableHead>Preço Futures</TableHead>
                )}
                {isColumnVisible('volumes') && (
                  <TableHead>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSort('spot_volume_24h', e.ctrlKey || e.metaKey)}
                        className="font-semibold h-auto py-1"
                      >
                        Vol. Spot
                        {sortConfigs.find(c => c.field === 'spot_volume_24h') && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {sortConfigs.find(c => c.field === 'spot_volume_24h')?.order === 'asc' ? '↑' : '↓'}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleSort('futures_volume_24h', e.ctrlKey || e.metaKey)}
                        className="font-semibold h-auto py-1"
                      >
                        Vol. Fut
                        {sortConfigs.find(c => c.field === 'futures_volume_24h') && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {sortConfigs.find(c => c.field === 'futures_volume_24h')?.order === 'asc' ? '↑' : '↓'}
                          </Badge>
                        )}
                      </Button>
                    </div>
                  </TableHead>
                )}
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOpportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {search || activeFiltersCount > 0 ? 'Nenhuma oportunidade encontrada' : 'Aguardando dados...'}
                  </TableCell>
                </TableRow>
              ) : (
              paginatedOpportunities.map((opp, index) => {
                  const isFavorite = favorites.has(opp.pair_symbol);
                  const crossings = getCrossingsForPair(opp.pair_symbol);
                  return (
                    <TableRow 
                      key={opp.pair_symbol}
                      className={`
                        hover:bg-accent/80 hover:shadow-lg hover:scale-[1.01] cursor-pointer 
                        transition-all duration-200 animate-fade-in
                        ${index % 2 === 0 ? 'bg-card' : 'bg-accent/20'}
                        ${isFavorite ? 'bg-gold/5 hover:bg-gold/10' : ''}
                      `}
                      style={{ animationDelay: `${index * 30}ms` }}
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
                      {isColumnVisible('pair_symbol') && (
                        <TableCell className="font-mono font-semibold">
                          <div className="flex items-center gap-2">
                            {getDelistingInfo(opp.pair_symbol) && (
                              <DelistWarning scheduledDate={getDelistingInfo(opp.pair_symbol)!.scheduled_date} />
                            )}
                            <span>{opp.pair_symbol}</span>
                            {isNewCoin(opp.pair_symbol) && <NewCoinBadge />}
                          </div>
                        </TableCell>
                      )}
                      {isColumnVisible('spread_net_percent_entrada') && (
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`font-mono font-semibold px-3 py-1 ${
                              opp.spread_net_percent_entrada >= 0 
                                ? 'bg-profit/20 text-profit border-profit/40' 
                                : 'bg-negative-subtle text-negative border-red-500/40'
                            }`}
                          >
                            {formatNumber(opp.spread_net_percent_entrada, 4)}%
                          </Badge>
                        </TableCell>
                      )}
                      {isColumnVisible('spread_net_percent_saida') && (
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`font-mono font-semibold px-3 py-1 ${
                              opp.spread_net_percent_saida >= 0 
                                ? 'bg-profit/20 text-profit border-profit/40' 
                                : 'bg-negative-subtle text-negative border-red-500/40'
                            }`}
                          >
                            {formatNumber(opp.spread_net_percent_saida, 4)}%
                          </Badge>
                        </TableCell>
                      )}
                      {isColumnVisible('funding_rate') && (
                        <TableCell className="text-center">
                          <span className={`font-mono font-semibold ${
                            (opp.funding_rate || 0) >= 0 ? 'text-profit' : 'text-negative'
                          }`}>
                            {((opp.funding_rate || 0) * 100).toFixed(4)}%
                          </span>
                        </TableCell>
                      )}
                      {isColumnVisible('crossings') && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs font-semibold px-2 py-1 ${
                                crossings > 0 ? 'bg-gold/20 text-gold border-gold/30' : ''
                              }`}
                            >
                              {crossings}
                            </Badge>
                            {crossings > 0 && (
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
                      )}
                      {isColumnVisible('spot_bid_price') && (
                        <TableCell className="font-mono">
                          ${formatNumber(opp.spot_bid_price, 8)}
                        </TableCell>
                      )}
                      {isColumnVisible('futures_ask_price') && (
                        <TableCell className="font-mono">
                          ${formatNumber(opp.futures_ask_price, 8)}
                        </TableCell>
                      )}
                      {isColumnVisible('volumes') && (
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span>{formatVolume(opp.spot_volume_24h)}</span>
                            <span className="text-muted-foreground">/ {formatVolume(opp.futures_volume_24h)}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const symbol = opp.pair_symbol.replace('_USDT', '').replace('USDT', '');
                                  window.open(`https://www.mexc.com/pt-BR/exchange/${symbol}_USDT`, '_blank');
                                  window.open(`https://futures.mexc.com/pt-BR/exchange/${symbol}_USDT`, '_blank');
                                }}
                                className="h-8 w-8 text-gold hover:text-gold hover:bg-gold/10"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir Spot e Futures</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
                            <TooltipContent>Adicionar à Blacklist</TooltipContent>
                          </Tooltip>
                        </div>
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
          <div className="border-t border-border mt-4 pt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[80px]">
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
                      {currentPage} / {totalPages}
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
