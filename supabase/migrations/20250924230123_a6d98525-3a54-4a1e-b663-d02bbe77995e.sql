-- Verificar se a tabela user_roles já existe, se não criar
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'assistente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar tabela para relacionar assistentes com gerentes/clientes
CREATE TABLE IF NOT EXISTS public.user_cliente_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- usuário que terá acesso (gerente ou assistente)
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL, -- usuário que concedeu o acesso (admin ou gerente)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, cliente_id)
);

-- Habilitar RLS na tabela user_cliente_access
ALTER TABLE public.user_cliente_access ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id UUID DEFAULT auth.uid())
RETURNS user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = check_user_id),
    'assistente'::user_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Função security definer para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role(check_user_id) = 'admin';
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Função security definer para verificar se usuário tem acesso a um cliente
CREATE OR REPLACE FUNCTION public.has_client_access(check_cliente_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT 
    -- Admin vê tudo
    public.is_admin(check_user_id) OR
    -- Criador do cliente
    EXISTS (SELECT 1 FROM public.clientes WHERE id = check_cliente_id AND created_by = check_user_id) OR
    -- Tem acesso explícito via user_cliente_access
    EXISTS (SELECT 1 FROM public.user_cliente_access WHERE cliente_id = check_cliente_id AND user_id = check_user_id);
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Inserir role de admin para o usuário admin@b2x.com.br
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::user_role 
FROM auth.users 
WHERE email = 'admin@b2x.com.br'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = now();

-- Inserir role de gerente para o usuário eu.kleytongoncalves@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'gerente'::user_role 
FROM auth.users 
WHERE email = 'eu.kleytongoncalves@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'gerente', updated_at = now();