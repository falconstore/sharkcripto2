-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies para user_roles
CREATE POLICY "Usuarios podem ver seu proprio role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir roles" ON public.user_roles
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar roles" ON public.user_roles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar roles" ON public.user_roles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Criar tabela de listagens/deslistagens
CREATE TABLE public.coin_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin_name text NOT NULL,
  pair_symbol text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('new', 'delist')),
  scheduled_date timestamp with time zone NOT NULL,
  notified boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.coin_listings ENABLE ROW LEVEL SECURITY;

-- Todos podem ver listagens (para exibir badges/avisos)
CREATE POLICY "Todos podem ver listagens" ON public.coin_listings
FOR SELECT USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Admins podem inserir listagens" ON public.coin_listings
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar
CREATE POLICY "Admins podem atualizar listagens" ON public.coin_listings
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar
CREATE POLICY "Admins podem deletar listagens" ON public.coin_listings
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_coin_listings_updated_at
BEFORE UPDATE ON public.coin_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_listings;