-- Criar tabela para cooldown persistente de cruzamentos
CREATE TABLE IF NOT EXISTS public.crossing_cooldowns (
  pair_symbol TEXT PRIMARY KEY,
  last_crossing_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para crossing_cooldowns
ALTER TABLE public.crossing_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Edge functions podem gerenciar cooldowns" 
ON public.crossing_cooldowns 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Criar índice otimizado para consultas de cruzamentos recentes
CREATE INDEX IF NOT EXISTS idx_pair_crossings_recent 
ON public.pair_crossings (timestamp DESC, pair_symbol);

-- Criar índice para pair_symbol
CREATE INDEX IF NOT EXISTS idx_pair_crossings_symbol 
ON public.pair_crossings (pair_symbol);