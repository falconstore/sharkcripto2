-- Create spread_history table for continuous spread tracking
CREATE TABLE public.spread_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_symbol TEXT NOT NULL,
  spread_entrada NUMERIC NOT NULL,
  spread_saida NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by symbol and time
CREATE INDEX idx_spread_history_symbol_time 
ON public.spread_history(pair_symbol, timestamp DESC);

-- Index for cleanup queries
CREATE INDEX idx_spread_history_timestamp 
ON public.spread_history(timestamp);

-- Enable Row Level Security
ALTER TABLE public.spread_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Todos podem ver historico de spread"
ON public.spread_history
FOR SELECT
USING (true);

CREATE POLICY "Edge functions podem inserir historico"
ON public.spread_history
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Edge functions podem deletar historico"
ON public.spread_history
FOR DELETE
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.spread_history;