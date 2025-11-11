-- Tabela para armazenar oportunidades de arbitragem
CREATE TABLE IF NOT EXISTS public.arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_symbol TEXT NOT NULL,
  spot_bid_price DECIMAL(20, 8) NOT NULL,
  spot_volume_24h DECIMAL(20, 2) NOT NULL,
  futures_ask_price DECIMAL(20, 8) NOT NULL,
  futures_volume_24h DECIMAL(20, 2) NOT NULL,
  spread_gross_percent DECIMAL(10, 4) NOT NULL,
  spread_net_percent DECIMAL(10, 4) NOT NULL,
  spot_taker_fee DECIMAL(6, 4) DEFAULT 0.10,
  futures_taker_fee DECIMAL(6, 4) DEFAULT 0.02,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_arbitrage_pair ON public.arbitrage_opportunities(pair_symbol);
CREATE INDEX IF NOT EXISTS idx_arbitrage_spread ON public.arbitrage_opportunities(spread_net_percent DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_timestamp ON public.arbitrage_opportunities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_active ON public.arbitrage_opportunities(is_active) WHERE is_active = true;

-- Tabela para armazenar histórico de alertas do usuário
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_symbol TEXT NOT NULL,
  min_spread_percent DECIMAL(10, 4) NOT NULL,
  min_volume_usdt DECIMAL(20, 2) DEFAULT 100000,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON public.user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_enabled ON public.user_alerts(is_enabled) WHERE is_enabled = true;

-- Tabela de perfis de usuários (para dados adicionais)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para arbitrage_opportunities (público para leitura)
CREATE POLICY "Todos podem ver oportunidades"
  ON public.arbitrage_opportunities
  FOR SELECT
  USING (true);

-- Políticas RLS para user_alerts
CREATE POLICY "Usuários podem ver seus próprios alertas"
  ON public.user_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios alertas"
  ON public.user_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios alertas"
  ON public.user_alerts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios alertas"
  ON public.user_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas RLS para profiles
CREATE POLICY "Todos podem ver perfis"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_alerts_updated_at
  BEFORE UPDATE ON public.user_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para oportunidades
ALTER PUBLICATION supabase_realtime ADD TABLE public.arbitrage_opportunities;