import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMexcBalance } from '@/hooks/useMexcBalance';
import { RefreshCw, Wallet, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MexcBalanceCards = () => {
  const { spotBalance, futuresBalance, loading, error, lastUpdate, refreshBalance } = useMexcBalance();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Saldos da Conta MEXC</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshBalance}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Atualizado {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {error ? (
          <Badge variant="destructive" className="w-full justify-center py-2">
            Erro ao carregar saldos: {error}
          </Badge>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SPOT Balance */}
            <div className="space-y-2 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>SPOT</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {loading ? '...' : spotBalance.toFixed(2)}
                </span>
                <span className="text-muted-foreground">USDT</span>
              </div>
            </div>

            {/* FUTURES Balance */}
            <div className="space-y-2 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>FUTUROS</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {loading ? '...' : futuresBalance.toFixed(2)}
                </span>
                <span className="text-muted-foreground">USDT</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MexcBalanceCards;