-- 1. Remover índice condicional que não funciona com UPSERT (se existir)
DROP INDEX IF EXISTS idx_arbitrage_opportunities_pair_symbol;
DROP INDEX IF EXISTS idx_arbitrage_opportunities_active_pair;

-- 2. Adicionar constraint única no pair_symbol (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'arbitrage_opportunities_pair_symbol_unique'
  ) THEN
    ALTER TABLE public.arbitrage_opportunities 
    ADD CONSTRAINT arbitrage_opportunities_pair_symbol_unique UNIQUE (pair_symbol);
  END IF;
END $$;

-- 3. Criar tabela para persistência das calculadoras por usuário
CREATE TABLE IF NOT EXISTS public.user_calculators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calculator_id text NOT NULL,
  selected_pair text,
  valor_investido text,
  entrada_spot text,
  entrada_futuro text,
  fechamento_spot text,
  fechamento_futuro text,
  tracking_active boolean DEFAULT false,
  order_index integer DEFAULT 0,
  profit_threshold_percent numeric DEFAULT 0.1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, calculator_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.user_calculators ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS
CREATE POLICY "Usuários podem ver suas calculadoras" 
  ON public.user_calculators FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas calculadoras" 
  ON public.user_calculators FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas calculadoras" 
  ON public.user_calculators FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas calculadoras" 
  ON public.user_calculators FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_user_calculators_updated_at
  BEFORE UPDATE ON public.user_calculators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();