import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, Search, X, Filter, ChevronDown, ExternalLink, TrendingUp, Zap, Volume2, VolumeX, BarChart3, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useExternalArbitrage, getExchangeColor, ExternalOpportunity } from '@/hooks/useExternalArbitrage';
import { usePreferences } from '@/hooks/usePreferences';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { openExchangePages } from '@/lib/exchangeUrls';
import { MultiSelectExchange } from './MultiSelectExchange';
import { ExternalAnalysisModal } from './ExternalAnalysisModal';
import { FloatingArbitrageCalculator } from './FloatingArbitrageCalculator';
type SortField = 'symbol' | 'entrySpread' | 'exitSpread' | 'buyVol24' | 'sellVol24';
type SortOrder = 'asc' | 'desc';

// Função para extrair cruzamentos (inverted_count) do histCruzamento JSON
const getCrossingsCount = (histCruzamento: string | null | undefined): number | null => {
  if (!histCruzamento) return null;
  try {
    const parsed = JSON.parse(histCruzamento);
    // O sistema externo chama "inversões" o que nós chamamos de "cruzamentos"
    return parsed.inverted_count ?? parsed.totalCrossovers ?? null;
  } catch {
    return null;
  }
};

// Função para parsear histCruzamento completo
const parseHistCruzamento = (histCruzamento: string | null | undefined) => {
  if (!histCruzamento) return null;
  try {
    return JSON.parse(histCruzamento);
  } catch {
    return null;
  }
};

// Componente de tooltip com estatísticas históricas
const HistoricalStatsTooltip = ({ histCruzamento }: { histCruzamento: string | null | undefined }) => {
  const stats = parseHistCruzamento(histCruzamento);
  if (!stats) return <span className="text-muted-foreground text-xs">Sem dados históricos</span>;
  
  const formatSpread = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return `${val.toFixed(4)}%`;
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };
  
  return (
    <div className="space-y-2 min-w-[220px]">
      <div className="font-semibold text-sm border-b border-border pb-1 mb-2 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        Estatísticas 6h
      </div>
      
      {/* Spreads Médios */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Entrada Média:</span>
        <span className="text-emerald-400 font-mono">{formatSpread(stats.avg_entry_spread)}</span>
        
        <span className="text-muted-foreground">Saída Média:</span>
        <span className="text-blue-400 font-mono">{formatSpread(stats.avg_exit_spread)}</span>
        
        <span className="text-muted-foreground">Pico Entrada:</span>
        <span className="text-amber-400 font-mono">{formatSpread(stats.peak_entry_spread)}</span>
        
        <span className="text-muted-foreground">Pico Saída:</span>
        <span className="text-purple-400 font-mono">{formatSpread(stats.peak_exit_spread)}</span>
      </div>
      
      {/* Contadores */}
      <div className="border-t border-border pt-2 mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Cruzamentos (Inv.):</span>
        <span className="text-primary font-mono font-semibold">{stats.inverted_count ?? 0}</span>
        
        <span className="text-muted-foreground">Total Crossovers:</span>
        <span className="text-muted-foreground font-mono">{stats.totalCrossovers ?? '-'}</span>
        
        <span className="text-muted-foreground">Entradas:</span>
        <span className="font-mono">{stats.entry?.length ?? 0}</span>
        
        <span className="text-muted-foreground">Saídas:</span>
        <span className="font-mono">{stats.exit?.length ?? 0}</span>
      </div>
      
      {/* Período */}
      {stats.date_start && (
        <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-1.5">
          Período: {formatTime(stats.date_start)} - {formatTime(stats.date_end)}
        </div>
      )}
    </div>
  );
};

const ExternalOpportunitiesTable = () => {
  const { 
    opportunities, 
    isConnected, 
    isConnecting, 
    error, 
    lastUpdate, 
    totalCount,
    connect, 
    disconnect 
  } = useExternalArbitrage();
  
  const { favorites, toggleFavorite } = usePreferences();
  const isMobile = useIsMobile();
  
  // Estados
  const [sortField, setSortField] = useState<SortField>('entrySpread');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filtros (valores de input)
  const [minEntryInput, setMinEntryInput] = useState('');
  const [maxEntryInput, setMaxEntryInput] = useState('');
  const [minExitInput, setMinExitInput] = useState('');
  const [maxExitInput, setMaxExitInput] = useState('');
  const [minVolSpotInput, setMinVolSpotInput] = useState('');
  const [minVolFutInput, setMinVolFutInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [buyExchangeFilters, setBuyExchangeFilters] = useState<string[]>([]);
  const [sellExchangeFilters, setSellExchangeFilters] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal de análise
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ExternalOpportunity | null>(null);
  
  // Alertas sonoros
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState('3');
  const lastAlertRef = useRef<Record<string, number>>({});

  // Debounce nos filtros (300ms) para evitar lag
  const search = useDebouncedValue(searchInput, 300);
  const minEntry = useDebouncedValue(minEntryInput, 300);
  const maxEntry = useDebouncedValue(maxEntryInput, 300);
  const minExit = useDebouncedValue(minExitInput, 300);
  const maxExit = useDebouncedValue(maxExitInput, 300);
  const minVolSpot = useDebouncedValue(minVolSpotInput, 300);
  const minVolFut = useDebouncedValue(minVolFutInput, 300);

  // Ref para audio de alerta
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lista de exchanges únicas - acumula sem remover para evitar flickering nos filtros
  const exchangeSetRef = useRef<Set<string>>(new Set());
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([]);

  useEffect(() => {
    let hasNew = false;
    opportunities.forEach(opp => {
      if (!exchangeSetRef.current.has(opp.buyFrom)) {
        exchangeSetRef.current.add(opp.buyFrom);
        hasNew = true;
      }
      if (!exchangeSetRef.current.has(opp.sellTo)) {
        exchangeSetRef.current.add(opp.sellTo);
        hasNew = true;
      }
    });
    if (hasNew) {
      setAvailableExchanges(Array.from(exchangeSetRef.current).sort());
    }
  }, [opportunities]);

  // Tocar som de alerta
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }, [soundEnabled]);

  // Verificar alertas quando oportunidades mudam
  useEffect(() => {
    if (!soundEnabled || !opportunities.length) return;
    
    const threshold = parseFloat(alertThreshold) || 3;
    const now = Date.now();
    const COOLDOWN_MS = 30000; // 30 segundos entre alertas do mesmo par
    
    opportunities.forEach(opp => {
      if (opp.entrySpread >= threshold) {
        const lastAlert = lastAlertRef.current[opp.code] || 0;
        if (now - lastAlert > COOLDOWN_MS) {
          playAlertSound();
          lastAlertRef.current[opp.code] = now;
        }
      }
    });
  }, [opportunities, soundEnabled, alertThreshold, playAlertSound]);

  // Filtragem e ordenação
  const filteredAndSorted = useMemo(() => {
    let filtered = [...opportunities];

    // Busca por símbolo
    if (search) {
      filtered = filtered.filter(opp =>
        opp.symbol.toLowerCase().includes(search.toLowerCase()) ||
        opp.code.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtros numéricos
    const parseNum = (val: string) => val ? parseFloat(val) : null;
    const minEntryNum = parseNum(minEntry);
    const maxEntryNum = parseNum(maxEntry);
    const minExitNum = parseNum(minExit);
    const maxExitNum = parseNum(maxExit);
    const minVolSpotNum = parseNum(minVolSpot);
    const minVolFutNum = parseNum(minVolFut);

    if (minEntryNum !== null) {
      filtered = filtered.filter(opp => opp.entrySpread >= minEntryNum);
    }
    if (maxEntryNum !== null) {
      filtered = filtered.filter(opp => opp.entrySpread <= maxEntryNum);
    }
    if (minExitNum !== null) {
      filtered = filtered.filter(opp => opp.exitSpread >= minExitNum);
    }
    if (maxExitNum !== null) {
      filtered = filtered.filter(opp => opp.exitSpread <= maxExitNum);
    }
    if (minVolSpotNum !== null) {
      filtered = filtered.filter(opp => parseFloat(opp.buyVol24) >= minVolSpotNum);
    }
    if (minVolFutNum !== null) {
      filtered = filtered.filter(opp => parseFloat(opp.sellVol24) >= minVolFutNum);
    }

    // Filtro de exchanges de compra (multi-select)
    if (buyExchangeFilters.length > 0) {
      filtered = filtered.filter(opp => 
        buyExchangeFilters.some(ex => opp.buyFrom.toLowerCase() === ex.toLowerCase())
      );
    }

    // Filtro de exchanges de venda (multi-select)
    if (sellExchangeFilters.length > 0) {
      filtered = filtered.filter(opp => 
        sellExchangeFilters.some(ex => opp.sellTo.toLowerCase() === ex.toLowerCase())
      );
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(opp => {
        if (typeFilter === 'spot-futures') {
          return opp.buyType === 'SPOT' && opp.sellType === 'FUTURES';
        } else if (typeFilter === 'futures-futures') {
          return opp.buyType === 'FUTURES' && opp.sellType === 'FUTURES';
        }
        return true;
      });
    }

    // Separar favoritos
    const favoritesArray = filtered.filter(opp => favorites.has(opp.symbol) || favorites.has(opp.code));
    const nonFavoritesArray = filtered.filter(opp => !favorites.has(opp.symbol) && !favorites.has(opp.code));

    // Ordenação
    const sortArray = (arr: typeof filtered) => {
      return arr.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortField) {
          case 'symbol':
            aVal = a.symbol;
            bVal = b.symbol;
            break;
          case 'entrySpread':
            aVal = a.entrySpread;
            bVal = b.entrySpread;
            break;
          case 'exitSpread':
            aVal = a.exitSpread;
            bVal = b.exitSpread;
            break;
          case 'buyVol24':
            aVal = parseFloat(a.buyVol24) || 0;
            bVal = parseFloat(b.buyVol24) || 0;
            break;
          case 'sellVol24':
            aVal = parseFloat(a.sellVol24) || 0;
            bVal = parseFloat(b.sellVol24) || 0;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          const comparison = aVal.localeCompare(bVal as string);
          return sortOrder === 'asc' ? comparison : -comparison;
        }
        
        return sortOrder === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
      });
    };

    return [...sortArray(favoritesArray), ...sortArray(nonFavoritesArray)];
  }, [opportunities, search, minEntry, maxEntry, minExit, maxExit, minVolSpot, minVolFut, buyExchangeFilters, sellExchangeFilters, typeFilter, sortField, sortOrder, favorites]);

  // Paginação
  const paginatedOpportunities = useMemo(() => {
    if (itemsPerPage === 0) return filteredAndSorted;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, minEntry, maxEntry, minExit, maxExit, minVolSpot, minVolFut, buyExchangeFilters, sellExchangeFilters, typeFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
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

  const formatVolume = (vol: string) => {
    const num = parseFloat(vol) || 0;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const clearFilters = () => {
    setMinEntryInput('');
    setMaxEntryInput('');
    setMinExitInput('');
    setMaxExitInput('');
    setMinVolSpotInput('');
    setMinVolFutInput('');
    setSearchInput('');
    setBuyExchangeFilters([]);
    setSellExchangeFilters([]);
    setTypeFilter('all');
  };

  const activeFiltersCount = [minEntryInput, maxEntryInput, minExitInput, maxExitInput, minVolSpotInput, minVolFutInput].filter(v => v !== '').length +
    buyExchangeFilters.length + sellExchangeFilters.length + (typeFilter !== 'all' ? 1 : 0);
    
  const isFavorite = (opp: ExternalOpportunity) => favorites.has(opp.symbol) || favorites.has(opp.code);

  const ExchangeBadge = ({ exchange, type }: { exchange: string; type: 'SPOT' | 'FUTURES' }) => {
    const colors = getExchangeColor(exchange);
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} text-xs font-semibold`}>
          {exchange.toUpperCase()}
        </Badge>
        <Badge variant="outline" className={`text-xs font-bold ${type === 'SPOT' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-violet-500/20 text-violet-400 border-violet-500/40'}`}>
          {type === 'SPOT' ? 'S' : 'F'}
        </Badge>
      </div>
    );
  };

  const openAnalysisModal = (opp: ExternalOpportunity) => {
    setSelectedOpportunity(opp);
    setAnalysisModalOpen(true);
  };

  const AdvancedFilters = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2 p-3 bg-accent/30 rounded-lg">
      <div className="space-y-1">
        <Label className="text-xs">Entrada % mín</Label>
        <Input
          type="number"
          value={minEntryInput}
          onChange={(e) => setMinEntryInput(e.target.value)}
          placeholder="-5"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Entrada % máx</Label>
        <Input
          type="number"
          value={maxEntryInput}
          onChange={(e) => setMaxEntryInput(e.target.value)}
          placeholder="5"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Saída % mín</Label>
        <Input
          type="number"
          value={minExitInput}
          onChange={(e) => setMinExitInput(e.target.value)}
          placeholder="0"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Saída % máx</Label>
        <Input
          type="number"
          value={maxExitInput}
          onChange={(e) => setMaxExitInput(e.target.value)}
          placeholder="10"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vol. Spot mín</Label>
        <Input
          type="number"
          value={minVolSpotInput}
          onChange={(e) => setMinVolSpotInput(e.target.value)}
          placeholder="100000"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Vol. Fut mín</Label>
        <Input
          type="number"
          value={minVolFutInput}
          onChange={(e) => setMinVolFutInput(e.target.value)}
          placeholder="100000"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Compra (Exchange)</Label>
        <MultiSelectExchange
          label="Compra"
          selectedExchanges={buyExchangeFilters}
          availableExchanges={availableExchanges}
          onSelectionChange={setBuyExchangeFilters}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Venda (Exchange)</Label>
        <MultiSelectExchange
          label="Venda"
          selectedExchanges={sellExchangeFilters}
          availableExchanges={availableExchanges}
          onSelectionChange={setSellExchangeFilters}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tipo</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="spot-futures">Spot → Futures</SelectItem>
            <SelectItem value="futures-futures">Futures → Futures</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="bg-gradient-card hover-lift">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Zap className="w-5 h-5 text-purple-400" />
              Oportunidades Multi-Exchange
              {isConnected && (
                <Badge variant="outline" className="bg-profit/20 text-profit border-profit/40 ml-2">
                  {totalCount} pares
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:ml-auto">
              {/* Status de conexão */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="outline" className="bg-profit/20 text-profit border-profit/40">
                    <Wifi className="w-3 h-3 mr-1" />
                    Conectado
                  </Badge>
                ) : isConnecting ? (
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Conectando...
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Desconectado
                  </Badge>
                )}
              </div>

              {/* Toggle de som */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={soundEnabled ? 'bg-profit/20 border-profit/40' : ''}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundEnabled ? 'Alertas sonoros ativados' : 'Ativar alertas sonoros'}
                </TooltipContent>
              </Tooltip>

              {/* Botão conectar/desconectar */}
              <Button
                variant={isConnected ? "destructive" : "default"}
                size="sm"
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
              >
                {isConnected ? 'Desconectar' : 'Conectar'}
              </Button>

              {/* Calculadora de Arbitragem */}
              <FloatingArbitrageCalculator />
              {/* Busca */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar par..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 w-full sm:w-48"
                />
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="p-3 bg-destructive/20 border border-destructive/40 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Última atualização */}
          {lastUpdate && (
            <div className="text-xs text-muted-foreground">
              Última atualização: {new Date(lastUpdate).toLocaleTimeString('pt-BR')}
            </div>
          )}

          {/* Filtros */}
          {isMobile ? (
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros Avançados
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <AdvancedFilters />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <AdvancedFilters />
          )}
        </CardHeader>

        <CardContent>
          {!isConnected && !isConnecting ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Clique em "Conectar" para receber oportunidades de arbitragem em tempo real de múltiplas exchanges
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['HTX', 'KuCoin', 'MEXC', 'Bitget', 'BingX', 'Gate'].map(ex => (
                  <Badge key={ex} variant="outline" className={`${getExchangeColor(ex.toLowerCase()).bg} ${getExchangeColor(ex.toLowerCase()).text}`}>
                    {ex}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('symbol')} className="font-semibold">
                        Par {sortField === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead>Compra</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('entrySpread')} className="font-semibold">
                        Entrada % {sortField === 'entrySpread' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('exitSpread')} className="font-semibold">
                        Saída % {sortField === 'exitSpread' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help text-xs font-semibold">Cruz. 1h</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cruzamentos de fechamento na última hora (monitor externo)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>Funding</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('buyVol24')} className="font-semibold">
                        Vol. Compra {sortField === 'buyVol24' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => handleSort('sellVol24')} className="font-semibold">
                        Vol. Venda {sortField === 'sellVol24' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        {isConnecting ? 'Carregando...' : search || activeFiltersCount > 0 ? 'Nenhuma oportunidade encontrada' : 'Aguardando dados...'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOpportunities.map((opp, index) => (
                      <TableRow 
                        key={opp.id}
                        className={`
                          hover:bg-accent/80 transition-all duration-200
                          ${isFavorite(opp) ? 'bg-gold/10' : index % 2 === 0 ? 'bg-card' : 'bg-accent/20'}
                        `}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(opp.symbol)}
                            className="p-1 h-auto"
                          >
                            <Star
                              className={`w-4 h-4 ${isFavorite(opp) ? 'fill-gold text-gold' : 'text-muted-foreground'}`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help hover:text-primary transition-colors underline decoration-dotted underline-offset-4 decoration-muted-foreground/50">
                                {opp.symbol}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-3 max-w-xs">
                              <HistoricalStatsTooltip histCruzamento={opp.histCruzamento} />
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <ExchangeBadge exchange={opp.buyFrom} type={opp.buyType} />
                          <div className="text-xs text-muted-foreground mt-1">
                            ${formatNumber(opp.buyPrice, 8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ExchangeBadge exchange={opp.sellTo} type={opp.sellType} />
                          <div className="text-xs text-muted-foreground mt-1">
                            ${formatNumber(opp.sellPrice, 8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`font-mono font-semibold px-3 py-1 ${
                              opp.entrySpread >= 0 
                                ? 'bg-profit/20 text-profit border-profit/40' 
                                : 'bg-negative-subtle text-negative border-red-500/40'
                            }`}
                          >
                            {formatNumber(opp.entrySpread, 4)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={`font-mono font-semibold px-3 py-1 ${
                              opp.exitSpread >= 0 
                                ? 'bg-profit/20 text-profit border-profit/40' 
                                : 'bg-negative-subtle text-negative border-red-500/40'
                            }`}
                          >
                            {formatNumber(opp.exitSpread, 4)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const count = getCrossingsCount(opp.histCruzamento);
                            if (count !== null && count > 0) {
                              return (
                                <Badge 
                                  variant="outline" 
                                  className="bg-amber-500/20 text-amber-400 border-amber-500/40 font-mono"
                                >
                                  {count}
                                </Badge>
                              );
                            }
                            return <span className="text-muted-foreground">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {opp.buyFundingRate || opp.sellFundingRate ? (
                            <span className="font-mono text-xs">
                              {opp.buyFundingRate && `C: ${(parseFloat(opp.buyFundingRate) * 100).toFixed(4)}%`}
                              {opp.buyFundingRate && opp.sellFundingRate && ' / '}
                              {opp.sellFundingRate && `V: ${(parseFloat(opp.sellFundingRate) * 100).toFixed(4)}%`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatVolume(opp.buyVol24)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatVolume(opp.sellVol24)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {opp.histCruzamento && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openAnalysisModal(opp)}
                                  >
                                    <BarChart3 className="w-4 h-4 text-purple-400" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver análise de cruzamento</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openExchangePages(opp.symbol, opp.buyFrom, opp.buyType, opp.sellTo, opp.sellType)}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir nas exchanges</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          {filteredAndSorted.length > 0 && isConnected && (
            <div className="border-t border-border mt-4 pt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSorted.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} de {filteredAndSorted.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de análise de cruzamento */}
      {selectedOpportunity && (
        <ExternalAnalysisModal
          open={analysisModalOpen}
          onClose={() => setAnalysisModalOpen(false)}
          symbol={selectedOpportunity.symbol}
          histCruzamento={selectedOpportunity.histCruzamento}
          entrySpread={selectedOpportunity.entrySpread}
          exitSpread={selectedOpportunity.exitSpread}
          buyFrom={selectedOpportunity.buyFrom}
          sellTo={selectedOpportunity.sellTo}
          buyPrice={selectedOpportunity.buyPrice}
          sellPrice={selectedOpportunity.sellPrice}
        />
      )}
    </TooltipProvider>
  );
};

export default ExternalOpportunitiesTable;
