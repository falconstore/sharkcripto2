import { useMemo, useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Search, X, Filter, ChevronDown, ExternalLink, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useExternalArbitrage, getExchangeColor, ExternalOpportunity } from '@/hooks/useExternalArbitrage';
import { useIsMobile } from '@/hooks/use-mobile';

type SortField = 'symbol' | 'entrySpread' | 'exitSpread' | 'buyVol24' | 'sellVol24';
type SortOrder = 'asc' | 'desc';

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
  
  const isMobile = useIsMobile();
  
  // Estados
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('entrySpread');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filtros
  const [minEntry, setMinEntry] = useState('');
  const [maxEntry, setMaxEntry] = useState('');
  const [minExit, setMinExit] = useState('');
  const [maxExit, setMaxExit] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Lista de exchanges únicas
  const uniqueExchanges = useMemo(() => {
    const exchanges = new Set<string>();
    opportunities.forEach(opp => {
      exchanges.add(opp.buyFrom);
      exchanges.add(opp.sellTo);
    });
    return Array.from(exchanges).sort();
  }, [opportunities]);

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

    // Filtro de exchange
    if (exchangeFilter !== 'all') {
      filtered = filtered.filter(opp => 
        opp.buyFrom.toLowerCase() === exchangeFilter.toLowerCase() ||
        opp.sellTo.toLowerCase() === exchangeFilter.toLowerCase()
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

    // Ordenação
    filtered.sort((a, b) => {
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

    return filtered;
  }, [opportunities, search, minEntry, maxEntry, minExit, maxExit, exchangeFilter, typeFilter, sortField, sortOrder]);

  // Paginação
  const paginatedOpportunities = useMemo(() => {
    if (itemsPerPage === 0) return filteredAndSorted;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredAndSorted.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, minEntry, maxEntry, minExit, maxExit, exchangeFilter, typeFilter]);

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
    setMinEntry('');
    setMaxEntry('');
    setMinExit('');
    setMaxExit('');
    setExchangeFilter('all');
    setTypeFilter('all');
  };

  const activeFiltersCount = [minEntry, maxEntry, minExit, maxExit].filter(v => v !== '').length +
    (exchangeFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  const ExchangeBadge = ({ exchange, type }: { exchange: string; type: 'SPOT' | 'FUTURES' }) => {
    const colors = getExchangeColor(exchange);
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} text-xs font-semibold`}>
          {exchange.toUpperCase()}
        </Badge>
        <Badge variant="outline" className={`text-xs ${type === 'SPOT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-400'}`}>
          {type === 'SPOT' ? '🟢' : '📊'}
        </Badge>
      </div>
    );
  };

  const AdvancedFilters = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-accent/30 rounded-lg">
      <div className="space-y-1">
        <Label className="text-xs">Entrada % mín</Label>
        <Input
          type="number"
          value={minEntry}
          onChange={(e) => setMinEntry(e.target.value)}
          placeholder="0"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Entrada % máx</Label>
        <Input
          type="number"
          value={maxEntry}
          onChange={(e) => setMaxEntry(e.target.value)}
          placeholder="10"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Saída % mín</Label>
        <Input
          type="number"
          value={minExit}
          onChange={(e) => setMinExit(e.target.value)}
          placeholder="-5"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Saída % máx</Label>
        <Input
          type="number"
          value={maxExit}
          onChange={(e) => setMaxExit(e.target.value)}
          placeholder="5"
          className="h-8 text-sm"
          step="0.01"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Exchange</Label>
        <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {uniqueExchanges.map(ex => (
              <SelectItem key={ex} value={ex.toLowerCase()}>{ex.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

              {/* Botão conectar/desconectar */}
              <Button
                variant={isConnected ? "destructive" : "default"}
                size="sm"
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
              >
                {isConnected ? 'Desconectar' : 'Conectar'}
              </Button>

              {/* Busca */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar par..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {isConnecting ? 'Carregando...' : search || activeFiltersCount > 0 ? 'Nenhuma oportunidade encontrada' : 'Aguardando dados...'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedOpportunities.map((opp, index) => (
                      <TableRow 
                        key={opp.id}
                        className={`
                          hover:bg-accent/80 transition-all duration-200
                          ${index % 2 === 0 ? 'bg-card' : 'bg-accent/20'}
                        `}
                      >
                        <TableCell className="font-mono font-semibold">
                          {opp.symbol}
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
    </TooltipProvider>
  );
};

export default ExternalOpportunitiesTable;
