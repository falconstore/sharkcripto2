-- Criar tabela de alertas de spread
CREATE TABLE IF NOT EXISTS public.spread_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_symbol TEXT NOT NULL,
  target_spread DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pair_symbol)
);

-- Habilitar RLS
ALTER TABLE public.spread_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver seus próprios alertas"
  ON public.spread_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios alertas"
  ON public.spread_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios alertas"
  ON public.spread_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios alertas"
  ON public.spread_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_spread_alerts_updated_at
  BEFORE UPDATE ON public.spread_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de histórico de cálculos
CREATE TABLE IF NOT EXISTS public.calculation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_symbol TEXT,
  valor_investido DECIMAL NOT NULL,
  entrada_spot DECIMAL NOT NULL,
  entrada_futuro DECIMAL NOT NULL,
  fechamento_spot DECIMAL,
  fechamento_futuro DECIMAL,
  lucro_usd DECIMAL NOT NULL,
  lucro_brl DECIMAL NOT NULL,
  var_entrada DECIMAL NOT NULL,
  var_fechamento DECIMAL NOT NULL,
  var_total DECIMAL NOT NULL,
  exchange_rate DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.calculation_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver seu próprio histórico"
  ON public.calculation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir em seu histórico"
  ON public.calculation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seu próprio histórico"
  ON public.calculation_history FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_spread_alerts_user_id ON public.spread_alerts(user_id);
CREATE INDEX idx_spread_alerts_pair_symbol ON public.spread_alerts(pair_symbol);
CREATE INDEX idx_calculation_history_user_id ON public.calculation_history(user_id);
CREATE INDEX idx_calculation_history_created_at ON public.calculation_history(created_at DESC);