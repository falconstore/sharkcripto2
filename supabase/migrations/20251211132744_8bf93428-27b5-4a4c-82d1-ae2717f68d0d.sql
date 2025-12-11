-- 1. Corrigir RLS da tabela profiles
-- Remover política pública atual
DROP POLICY IF EXISTS "Todos podem ver perfis" ON profiles;

-- Usuários podem ver APENAS seu próprio perfil
CREATE POLICY "Usuarios podem ver seu proprio perfil"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Admins podem ver TODOS os perfis (necessário para gestão)
CREATE POLICY "Admins podem ver todos perfis"
ON profiles FOR SELECT  
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Corrigir RLS da tabela discord_channel_activity
-- Remover política pública atual
DROP POLICY IF EXISTS "Todos podem ver atividades" ON discord_channel_activity;

-- Apenas usuários autenticados podem ver atividades
CREATE POLICY "Usuarios autenticados podem ver atividades"
ON discord_channel_activity FOR SELECT
USING (auth.uid() IS NOT NULL);