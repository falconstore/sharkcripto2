-- Adicionar colunas para preços de ENTRADA corretos
ALTER TABLE public.arbitrage_opportunities 
ADD COLUMN IF NOT EXISTS spot_ask_price numeric,
ADD COLUMN IF NOT EXISTS futures_bid_price numeric;

-- Adicionar índice para performance no upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_arbitrage_opportunities_pair_symbol 
ON public.arbitrage_opportunities (pair_symbol) WHERE is_active = true;