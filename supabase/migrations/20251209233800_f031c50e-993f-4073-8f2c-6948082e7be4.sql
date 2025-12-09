-- Criar tabela para cruzamentos de ENTRADA (quando spread_net_percent_entrada > 0)
CREATE TABLE public.pair_crossings_entrada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_symbol TEXT NOT NULL,
  spread_net_percent_entrada NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscas rápidas por símbolo e tempo
CREATE INDEX idx_pair_crossings_entrada_symbol_time 
ON public.pair_crossings_entrada(pair_symbol, timestamp DESC);

-- Habilitar RLS
ALTER TABLE public.pair_crossings_entrada ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem ver cruzamentos de entrada"
ON public.pair_crossings_entrada
FOR SELECT
USING (true);

CREATE POLICY "Edge functions podem inserir cruzamentos de entrada"
ON public.pair_crossings_entrada
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Edge functions podem deletar cruzamentos de entrada"
ON public.pair_crossings_entrada
FOR DELETE
USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pair_crossings_entrada;

-- Criar tabela de cooldowns para entrada (separado do de saída)
CREATE TABLE public.crossing_cooldowns_entrada (
  pair_symbol TEXT PRIMARY KEY,
  last_crossing_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crossing_cooldowns_entrada ENABLE ROW LEVEL SECURITY;

-- Política RLS para cooldowns de entrada
CREATE POLICY "Edge functions podem gerenciar cooldowns entrada"
ON public.crossing_cooldowns_entrada
FOR ALL
USING (true)
WITH CHECK (true);