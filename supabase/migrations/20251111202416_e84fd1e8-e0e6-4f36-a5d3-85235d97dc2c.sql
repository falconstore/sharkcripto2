-- Criar tabela para armazenar cruzamentos (quando saída fica positiva)
CREATE TABLE IF NOT EXISTS public.pair_crossings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_symbol text NOT NULL,
  spread_net_percent_saida numeric NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Criar índice para otimizar queries por símbolo e timestamp
CREATE INDEX IF NOT EXISTS idx_pair_crossings_symbol_timestamp 
ON public.pair_crossings(pair_symbol, timestamp DESC);

-- Habilitar RLS
ALTER TABLE public.pair_crossings ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver cruzamentos
CREATE POLICY "Todos podem ver cruzamentos"
ON public.pair_crossings
FOR SELECT
USING (true);

-- Policy: Edge functions podem inserir cruzamentos
CREATE POLICY "Edge functions podem inserir cruzamentos"
ON public.pair_crossings
FOR INSERT
WITH CHECK (true);

-- Policy: Edge functions podem deletar cruzamentos antigos
CREATE POLICY "Edge functions podem deletar cruzamentos"
ON public.pair_crossings
FOR DELETE
USING (true);