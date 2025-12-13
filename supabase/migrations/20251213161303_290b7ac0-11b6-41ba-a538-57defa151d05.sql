-- Criar tabela de configuração do sistema
CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Todos podem ler configurações (necessário para verificar manutenção)
CREATE POLICY "Todos podem ler configuracoes"
ON public.system_config FOR SELECT
USING (true);

-- Apenas admins podem modificar configurações
CREATE POLICY "Admins podem inserir configuracoes"
ON public.system_config FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar configuracoes"
ON public.system_config FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar configuracoes"
ON public.system_config FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir configuração inicial de manutenção (ATIVADO)
INSERT INTO public.system_config (key, value) 
VALUES ('maintenance_mode', '{"enabled": true, "message": "Sistema em manutenção. Voltamos em breve!"}');