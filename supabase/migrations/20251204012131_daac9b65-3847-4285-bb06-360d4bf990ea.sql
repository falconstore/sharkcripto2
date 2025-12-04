-- Inserir role de admin para o usuário
INSERT INTO public.user_roles (user_id, role)
VALUES ('7c19e0ab-4405-43fa-8344-352b891fc90d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;