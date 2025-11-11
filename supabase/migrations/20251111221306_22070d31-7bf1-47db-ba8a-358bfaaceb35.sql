-- Tabela de configuração de banca (saldo inicial por usuário)
CREATE TABLE bankroll_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  initial_balance_usdt NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de gerenciamento de operações da banca
CREATE TABLE bankroll_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Tipo de operação
  operation_type TEXT NOT NULL CHECK (operation_type IN ('trade', 'deposit', 'withdrawal')),
  operation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Referência ao cálculo (se for trade)
  calculation_id UUID REFERENCES calculation_history(id),
  
  -- Valores da operação
  amount_usdt NUMERIC NOT NULL,
  profit_usdt NUMERIC DEFAULT 0,
  profit_brl NUMERIC DEFAULT 0,
  
  -- Metadata
  pair_symbol TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bankroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_management ENABLE ROW LEVEL SECURITY;

-- RLS Policies para bankroll_config
CREATE POLICY "Usuários podem gerenciar sua config de banca"
  ON bankroll_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies para bankroll_management
CREATE POLICY "Usuários podem ver suas operações"
  ON bankroll_management FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas operações"
  ON bankroll_management FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas operações"
  ON bankroll_management FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas operações"
  ON bankroll_management FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_bankroll_management_user ON bankroll_management(user_id);
CREATE INDEX idx_bankroll_management_date ON bankroll_management(operation_date);
CREATE INDEX idx_bankroll_management_type ON bankroll_management(operation_type);
CREATE INDEX idx_bankroll_config_user ON bankroll_config(user_id);

-- Trigger para updated_at em bankroll_config
CREATE TRIGGER update_bankroll_config_updated_at
  BEFORE UPDATE ON bankroll_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em bankroll_management
CREATE TRIGGER update_bankroll_management_updated_at
  BEFORE UPDATE ON bankroll_management
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();