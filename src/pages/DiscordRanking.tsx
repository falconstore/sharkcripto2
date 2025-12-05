import { useState } from "react";
import { Trophy, RefreshCw, MessageSquare, Heart, AtSign, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDiscordRanking, useDiscordSyncConfig, useTriggerDiscordSync, type PeriodFilter } from "@/hooks/useDiscordRanking";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Todo tempo" },
];

function getDiscordAvatarUrl(userId: string, avatarHash: string | null) {
  if (!avatarHash) {
    // Default avatar based on discriminator
    const defaultIndex = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`;
}

function getRankBadge(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `#${position}`;
}

export default function DiscordRanking() {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  
  const { data: ranking, isLoading: isLoadingRanking } = useDiscordRanking(period);
  const { data: syncConfig } = useDiscordSyncConfig();
  const { mutate: triggerSync, isPending: isSyncing } = useTriggerDiscordSync();

  const lastSyncText = syncConfig?.last_sync_at
    ? formatDistanceToNow(new Date(syncConfig.last_sync_at), { addSuffix: true, locale: ptBR })
    : "Nunca sincronizado";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ranking Discord</h1>
              <p className="text-sm text-muted-foreground">Atividade do canal</p>
            </div>
          </div>
          
          <Button 
            onClick={() => triggerSync()} 
            disabled={isSyncing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Último sync: {lastSyncText}</span>
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className="min-w-[70px]"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Ranking Table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Participantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRanking ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : ranking && ranking.length > 0 ? (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Usuário</div>
                  <div className="col-span-2 text-center">
                    <MessageSquare className="h-3 w-3 inline" />
                  </div>
                  <div className="col-span-2 text-center">
                    <Heart className="h-3 w-3 inline" />
                  </div>
                  <div className="col-span-2 text-center">
                    <AtSign className="h-3 w-3 inline" />
                  </div>
                </div>
                
                {/* Rows */}
                {ranking.map((entry, index) => (
                  <div
                    key={entry.discord_user_id}
                    className={`grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-lg transition-colors ${
                      index < 3 ? "bg-yellow-500/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="col-span-1 text-lg font-bold">
                      {getRankBadge(index + 1)}
                    </div>
                    
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage 
                          src={getDiscordAvatarUrl(entry.discord_user_id, entry.discord_avatar)} 
                          alt={entry.discord_username}
                        />
                        <AvatarFallback className="text-xs">
                          {entry.discord_username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate text-foreground">
                        {entry.discord_username}
                      </span>
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <Badge variant="secondary" className="font-mono">
                        {entry.messages}
                      </Badge>
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <Badge variant="secondary" className="font-mono">
                        {entry.reactions}
                      </Badge>
                    </div>
                    
                    <div className="col-span-2 text-center">
                      <Badge variant="secondary" className="font-mono">
                        {entry.mentions}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade encontrada</p>
                <p className="text-sm mt-2">Clique em "Sincronizar" para buscar dados do Discord</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Mensagens</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span>Reações</span>
          </div>
          <div className="flex items-center gap-2">
            <AtSign className="h-4 w-4" />
            <span>Menções</span>
          </div>
        </div>
      </div>
    </div>
  );
}
