-- Adicionar colunas faltantes na tabela arbitrage_opportunities
ALTER TABLE public.arbitrage_opportunities 
ADD COLUMN IF NOT EXISTS spread_net_percent_entrada numeric,
ADD COLUMN IF NOT EXISTS spread_net_percent_saida numeric,
ADD COLUMN IF NOT EXISTS funding_rate numeric;