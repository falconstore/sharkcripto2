-- Permitir que admins atualizem qualquer perfil
CREATE POLICY "Admins podem atualizar qualquer perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));