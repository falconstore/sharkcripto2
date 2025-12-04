import { Star, Ban, ExternalLink, History, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Opportunity } from '@/hooks/useOpportunities';
import NewCoinBadge from './NewCoinBadge';
import DelistWarning from './DelistWarning';

interface OpportunityCardProps {
  opportunity: Opportunity;
  isFavorite: boolean;
  crossings: number;
  isNewCoin: boolean;
  delistingInfo: { scheduled_date: string } | null;
  onToggleFavorite: () => void;
  onToggleBlacklist: () => void;
  onOpenHistory: () => void;
  onOpenMexc: () => void;
}

const OpportunityCard = ({
  opportunity,
  isFavorite,
  crossings,
  isNewCoin,
  delistingInfo,
  onToggleFavorite,
  onToggleBlacklist,
  onOpenHistory,
  onOpenMexc,
}: OpportunityCardProps) => {
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatVolume = (num: number) => {
    if (!num || num === 0) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <Card className={`
      animate-fade-in hover:shadow-lg transition-all duration-200
      ${isFavorite ? 'border-gold/50 bg-gold/5' : 'border-border/50'}
    `}>
      <CardContent className="p-4 space-y-3">
        {/* Header - Par e Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFavorite}
              className="h-8 w-8 p-0"
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'fill-gold text-gold' : 'text-muted-foreground'}`} />
            </Button>
            <span className="font-mono font-bold text-lg">{opportunity.pair_symbol}</span>
            {delistingInfo && <DelistWarning scheduledDate={delistingInfo.scheduled_date} />}
          </div>
          <div className="flex items-center gap-1">
            {isNewCoin && <NewCoinBadge />}
          </div>
        </div>

        {/* Spreads - 2 colunas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-accent/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Entrada</p>
            <Badge 
              variant="outline"
              className={`font-mono font-bold text-base px-3 py-1 ${
                opportunity.spread_net_percent_entrada >= 0 
                  ? 'bg-profit/20 text-profit border-profit/40' 
                  : 'bg-negative-subtle text-negative border-red-500/40'
              }`}
            >
              {formatNumber(opportunity.spread_net_percent_entrada, 4)}%
            </Badge>
          </div>
          <div className="bg-accent/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Saída</p>
            <Badge 
              variant="outline"
              className={`font-mono font-bold text-base px-3 py-1 ${
                opportunity.spread_net_percent_saida >= 0 
                  ? 'bg-profit/20 text-profit border-profit/40' 
                  : 'bg-negative-subtle text-negative border-red-500/40'
              }`}
            >
              {formatNumber(opportunity.spread_net_percent_saida, 4)}%
            </Badge>
          </div>
        </div>

        {/* Funding e Cruzamentos */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-muted-foreground">Funding</span>
            <span className={`font-mono font-semibold ${
              (opportunity.funding_rate || 0) >= 0 ? 'text-profit' : 'text-negative'
            }`}>
              {((opportunity.funding_rate || 0) * 100).toFixed(4)}%
            </span>
          </div>
          <div 
            className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={crossings > 0 ? onOpenHistory : undefined}
          >
            <span className="text-muted-foreground">Cruzamentos</span>
            <div className="flex items-center gap-1">
              <Badge 
                variant="secondary" 
                className={`font-semibold ${crossings > 0 ? 'bg-gold/20 text-gold' : ''}`}
              >
                {crossings}
              </Badge>
              {crossings > 0 && <History className="w-3 h-3 text-muted-foreground" />}
            </div>
          </div>
        </div>

        {/* Preços e Volumes */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground">Spot</p>
            <p className="font-mono">${formatNumber(opportunity.spot_ask_price || opportunity.spot_bid_price, 6)}</p>
            <p className="text-muted-foreground">Vol: {formatVolume(opportunity.spot_volume_24h)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Futures</p>
            <p className="font-mono">${formatNumber(opportunity.futures_bid_price || opportunity.futures_ask_price, 6)}</p>
            <p className="text-muted-foreground">Vol: {formatVolume(opportunity.futures_volume_24h)}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMexc}
            className="flex-1 text-gold border-gold/50 hover:bg-gold/10"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir MEXC
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleBlacklist}
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
          >
            <Ban className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityCard;
