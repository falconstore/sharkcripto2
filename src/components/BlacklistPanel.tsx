import { usePreferences } from '@/hooks/usePreferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ban, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const BlacklistPanel = () => {
  const { blacklist, toggleBlacklist } = usePreferences();
  
  const blacklistedCoins = Array.from(blacklist);

  const handleRemove = (symbol: string) => {
    toggleBlacklist(symbol);
    toast.success(`${symbol} removido da blacklist`);
  };

  const handleClearAll = () => {
    blacklistedCoins.forEach(symbol => toggleBlacklist(symbol));
    toast.success('Blacklist limpa');
  };

  if (blacklistedCoins.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-card hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Blacklist de Moedas
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-destructive hover:text-destructive"
          >
            Limpar Tudo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {blacklistedCoins.map((symbol) => (
            <Badge
              key={symbol}
              variant="outline"
              className="pl-3 pr-2 py-1.5 text-sm border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <span className="font-mono font-semibold">{symbol}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(symbol)}
                className="ml-2 h-auto p-0 hover:bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Total: {blacklistedCoins.length} moeda{blacklistedCoins.length !== 1 ? 's' : ''} bloqueada{blacklistedCoins.length !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
};

export default BlacklistPanel;
