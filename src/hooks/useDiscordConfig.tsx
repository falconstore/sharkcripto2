import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DiscordConfig {
  id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string | null;
  last_sync_at: string | null;
  last_message_id: string | null;
}

export interface SyncStats {
  messagesProcessed: number;
  activitiesRecorded: number;
  messageActivities: number;
  reactionActivities: number;
  mentionActivities: number;
  uniqueUsers: number;
  syncedAt: string;
}

const DEFAULT_GUILD_ID = "1343016171892510806";
const DEFAULT_CHANNEL_ID = "1343240456569356432";

export function useDiscordConfig() {
  return useQuery({
    queryKey: ["discord-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_sync_config")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no config exists
      if (!data) {
        return {
          id: "",
          guild_id: DEFAULT_GUILD_ID,
          channel_id: DEFAULT_CHANNEL_ID,
          channel_name: null,
          last_sync_at: null,
          last_message_id: null,
        } as DiscordConfig;
      }

      return data as DiscordConfig;
    },
  });
}

export function useUpdateDiscordConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guildId, channelId }: { guildId: string; channelId: string }) => {
      const { data, error } = await supabase
        .from("discord_sync_config")
        .upsert(
          {
            guild_id: guildId,
            channel_id: channelId,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "guild_id,channel_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva!",
        description: "Guild ID e Channel ID atualizados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["discord-config"] });
    },
    onError: (error) => {
      console.error("Update config error:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    },
  });
}

export function useTriggerDiscordSyncWithOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      guildId,
      maxMessages = 200,
      skipReactions = false,
    }: {
      channelId: string;
      guildId: string;
      maxMessages?: number;
      skipReactions?: boolean;
    }) => {
      const response = await supabase.functions.invoke("discord-sync", {
        body: {
          channelId,
          guildId,
          maxMessages,
          skipReactions,
        },
      });

      if (response.error) throw response.error;
      return response.data as { success: boolean; stats: SyncStats };
    },
    onSuccess: (data) => {
      toast({
        title: "Sincronização concluída!",
        description: `${data.stats.messagesProcessed} mensagens, ${data.stats.uniqueUsers} usuários encontrados.`,
      });
      queryClient.invalidateQueries({ queryKey: ["discord-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["discord-config"] });
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar. Verifique se o bot tem permissão no canal.",
        variant: "destructive",
      });
    },
  });
}
