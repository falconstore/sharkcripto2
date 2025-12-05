import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type PeriodFilter = "24h" | "7d" | "30d" | "all";

export interface RankingEntry {
  discord_user_id: string;
  discord_username: string;
  discord_avatar: string | null;
  messages: number;
  reactions: number;
  mentions: number;
  total: number;
}

export interface SyncConfig {
  id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string | null;
  last_sync_at: string | null;
  last_message_id: string | null;
}

function getDateFilter(period: PeriodFilter): string | null {
  const now = new Date();
  switch (period) {
    case "24h":
      now.setDate(now.getDate() - 1);
      return now.toISOString().split("T")[0];
    case "7d":
      now.setDate(now.getDate() - 7);
      return now.toISOString().split("T")[0];
    case "30d":
      now.setDate(now.getDate() - 30);
      return now.toISOString().split("T")[0];
    case "all":
      return null;
  }
}

export function useDiscordRanking(period: PeriodFilter, channelId?: string) {
  return useQuery({
    queryKey: ["discord-ranking", period, channelId],
    queryFn: async () => {
      const dateFilter = getDateFilter(period);
      
      // If no channelId provided, get from config
      let activeChannelId = channelId;
      if (!activeChannelId) {
        const { data: config } = await supabase
          .from("discord_sync_config")
          .select("channel_id")
          .maybeSingle();
        activeChannelId = config?.channel_id || "1343240456569356432";
      }
      
      let query = supabase
        .from("discord_channel_activity")
        .select("discord_user_id, discord_username, discord_avatar, activity_type")
        .eq("channel_id", activeChannelId);
      
      if (dateFilter) {
        query = query.gte("activity_date", dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate data client-side
      const userMap = new Map<string, RankingEntry>();

      for (const activity of data || []) {
        const existing = userMap.get(activity.discord_user_id) || {
          discord_user_id: activity.discord_user_id,
          discord_username: activity.discord_username,
          discord_avatar: activity.discord_avatar,
          messages: 0,
          reactions: 0,
          mentions: 0,
          total: 0,
        };

        if (activity.activity_type === "message") {
          existing.messages++;
        } else if (activity.activity_type === "reaction") {
          existing.reactions++;
        } else if (activity.activity_type === "mention") {
          existing.mentions++;
        }
        existing.total++;

        // Update username/avatar with latest
        existing.discord_username = activity.discord_username;
        existing.discord_avatar = activity.discord_avatar;

        userMap.set(activity.discord_user_id, existing);
      }

      // Convert to array and sort by total
      const ranking = Array.from(userMap.values()).sort((a, b) => b.total - a.total);

      return ranking.slice(0, 50);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDiscordSyncConfig() {
  return useQuery({
    queryKey: ["discord-sync-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_sync_config")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return data as SyncConfig | null;
    },
  });
}

export function useTriggerDiscordSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("discord-sync", {
        body: {
          channelId: "1343240456569356432",
          guildId: "1343016171892510806",
          maxMessages: 500,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída!",
        description: `${data.stats.messagesProcessed} mensagens processadas, ${data.stats.uniqueUsers} usuários encontrados.`,
      });
      queryClient.invalidateQueries({ queryKey: ["discord-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["discord-sync-config"] });
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar com o Discord. Tente novamente.",
        variant: "destructive",
      });
    },
  });
}
