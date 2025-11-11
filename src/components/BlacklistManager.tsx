import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ban, Search, Trash2, X, ExternalLink } from 'lucide-react';
import { usePreferences } from '@/hooks/usePreferences';
import { cleanupBlacklistedPair } from '@/lib/cleanupBlacklistedPair';
import { toast } from '@/hooks/use-toast';

interface BlacklistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BlacklistManager = ({ open, onOpenChange }: BlacklistManagerProps) => {
  const { blacklist, toggleBlacklist } = usePreferences();
  const [search, setSearch] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const blacklistArray = useMemo(() => {
    return Array.from(blacklist).sort();
  }, [blacklist]);

  const filteredBlacklist = useMemo(() => {
    if (!search) return blacklistArray;
    return blacklistArray.filter(symbol => 
      symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [blacklistArray, search]);

  const handleRemoveFromBlacklist = (symbol: string) => {
    toggleBlacklist(symbol);
    toast({
      title: "Removido da blacklist",
      description: `${symbol} pode aparecer novamente nas oportunidades`,
    });
  };

  const handleClearHistory = async (symbol: string) => {
    const success = await cleanupBlacklistedPair(symbol);
    if (success) {
      toast({
        title: "Histórico limpo",
        description: `Todos os cruzamentos de ${symbol} foram deletados`,
      });
    } else {
      toast({
        title: "Erro ao limpar",
        description: "Não foi possível limpar o histórico",
        variant: "destructive",
      });
    }
  };

  const handleClearAllHistory = async () => {
    setIsClearing(true);
    let successCount = 0;
    
    for (const symbol of blacklistArray) {
      const success = await cleanupBlacklistedPair(symbol);
      if (success) successCount++;
    }
    
    setIsClearing(false);
    
    toast({
      title: "Limpeza concluída",
      description: `Histórico de ${successCount} moedas foi limpo`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Gerenciar Blacklist
            <Badge variant="outline" className="ml-2">
              {blacklistArray.length} {blacklistArray.length === 1 ? 'moeda' : 'moedas'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar moeda na blacklist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearch('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Lista de moedas */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredBlacklist.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {search ? 'Nenhuma moeda encontrada' : 'Blacklist vazia'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBlacklist.map((symbol) => (
                  <div
                    key={symbol}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Ban className="w-4 h-4 text-destructive" />
                      <div>
                        <div className="font-mono font-semibold">{symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          Adicionado à blacklist
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://www.mexc.com/pt-BR/exchange/${symbol}_USDT`, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Spot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://futures.mexc.com/pt-BR/exchange/${symbol}_USDT`, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Futuro
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearHistory(symbol)}
                        className="text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Limpar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveFromBlacklist(symbol)}
                        className="text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Ações em massa */}
          {blacklistArray.length > 0 && (
            <div className="flex justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {blacklistArray.length} {blacklistArray.length === 1 ? 'moeda na' : 'moedas na'} blacklist
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllHistory}
                disabled={isClearing}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Limpando...' : 'Limpar histórico de todas'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlacklistManager;
