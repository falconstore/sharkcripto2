-- Criar tabela de histórico de ações administrativas
CREATE TABLE public.admin_action_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_action_history ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver o histórico
CREATE POLICY "Admins podem ver histórico"
ON public.admin_action_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem inserir no histórico
CREATE POLICY "Admins podem inserir histórico"
ON public.admin_action_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_admin_action_history_created_at ON public.admin_action_history(created_at DESC);
CREATE INDEX idx_admin_action_history_admin_user_id ON public.admin_action_history(admin_user_id);
CREATE INDEX idx_admin_action_history_target_user_id ON public.admin_action_history(target_user_id);