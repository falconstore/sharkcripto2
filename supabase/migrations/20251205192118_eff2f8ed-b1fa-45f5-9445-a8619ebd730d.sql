-- Tabela para armazenar atividades do Discord
CREATE TABLE public.discord_channel_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  discord_avatar TEXT,
  channel_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('message', 'reaction', 'mention')),
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  activity_date DATE DEFAULT CURRENT_DATE
);

-- Tabela para configuração de sincronização
CREATE TABLE public.discord_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  last_sync_at TIMESTAMPTZ,
  last_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(guild_id, channel_id)
);

-- Índices para performance
CREATE INDEX idx_activity_channel ON public.discord_channel_activity(channel_id);
CREATE INDEX idx_activity_date ON public.discord_channel_activity(activity_date);
CREATE INDEX idx_activity_user ON public.discord_channel_activity(discord_user_id);
CREATE INDEX idx_activity_type ON public.discord_channel_activity(activity_type);

-- Enable RLS
ALTER TABLE public.discord_channel_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_sync_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies para discord_channel_activity (ranking público)
CREATE POLICY "Todos podem ver atividades" 
ON public.discord_channel_activity 
FOR SELECT 
USING (true);

CREATE POLICY "Edge functions podem inserir atividades" 
ON public.discord_channel_activity 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Edge functions podem deletar atividades" 
ON public.discord_channel_activity 
FOR DELETE 
USING (true);

-- RLS Policies para discord_sync_config
CREATE POLICY "Todos podem ver config de sync" 
ON public.discord_sync_config 
FOR SELECT 
USING (true);

CREATE POLICY "Edge functions podem inserir config" 
ON public.discord_sync_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Edge functions podem atualizar config" 
ON public.discord_sync_config 
FOR UPDATE 
USING (true);

-- Inserir configuração inicial
INSERT INTO public.discord_sync_config (guild_id, channel_id, channel_name)
VALUES ('1343016171892510806', '1343240456569356432', 'Canal Principal')
ON CONFLICT (guild_id, channel_id) DO NOTHING;