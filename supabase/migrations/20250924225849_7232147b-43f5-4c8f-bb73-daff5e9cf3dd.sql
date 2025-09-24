-- Criar enum para tipos de papel/role
CREATE TYPE public.user_role AS ENUM ('admin', 'gerente', 'assistente');

-- Criar tabela de roles de usuários
CREATE TABLE public.user_roles (
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
CREATE TABLE public.user_cliente_access (
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

-- Trigger para atualizar updated_at na tabela user_roles
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at na tabela user_cliente_access  
CREATE TRIGGER update_user_cliente_access_updated_at
  BEFORE UPDATE ON public.user_cliente_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Policies para user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_admin());

-- Policies para user_cliente_access
CREATE POLICY "Users can view their own client access" ON public.user_cliente_access
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all client access" ON public.user_cliente_access
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins and managers can grant access" ON public.user_cliente_access
  FOR INSERT WITH CHECK (
    public.is_admin() OR 
    (public.get_user_role() = 'gerente' AND public.has_client_access(cliente_id))
  );

CREATE POLICY "Admins and granters can revoke access" ON public.user_cliente_access
  FOR DELETE USING (
    public.is_admin() OR 
    auth.uid() = granted_by
  );

-- Atualizar policies da tabela clientes para usar o novo sistema
DROP POLICY "Users can view their clients" ON public.clientes;
DROP POLICY "Users can create clients" ON public.clientes;
DROP POLICY "Users can update their clients" ON public.clientes;
DROP POLICY "Users can delete their clients" ON public.clientes;

CREATE POLICY "Users can view accessible clients" ON public.clientes
  FOR SELECT USING (public.has_client_access(id));

CREATE POLICY "Users can create clients" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update accessible clients" ON public.clientes
  FOR UPDATE USING (public.has_client_access(id));

CREATE POLICY "Users can delete accessible clients" ON public.clientes
  FOR DELETE USING (public.has_client_access(id));

-- Atualizar policies da tabela cnpjs para usar o novo sistema
DROP POLICY "Users can view cnpjs of their clients" ON public.cnpjs;
DROP POLICY "Users can create cnpjs for their clients" ON public.cnpjs;
DROP POLICY "Users can update cnpjs of their clients" ON public.cnpjs;
DROP POLICY "Users can delete cnpjs of their clients" ON public.cnpjs;

CREATE POLICY "Users can view cnpjs of accessible clients" ON public.cnpjs
  FOR SELECT USING (public.has_client_access(cliente_id));

CREATE POLICY "Users can create cnpjs for accessible clients" ON public.cnpjs
  FOR INSERT WITH CHECK (public.has_client_access(cliente_id));

CREATE POLICY "Users can update cnpjs of accessible clients" ON public.cnpjs
  FOR UPDATE USING (public.has_client_access(cliente_id));

CREATE POLICY "Users can delete cnpjs of accessible clients" ON public.cnpjs
  FOR DELETE USING (public.has_client_access(cliente_id));

-- Atualizar policies da tabela lojas para usar o novo sistema
DROP POLICY "Users can view lojas of their cnpjs" ON public.lojas;
DROP POLICY "Users can create lojas for their cnpjs" ON public.lojas;
DROP POLICY "Users can update lojas of their cnpjs" ON public.lojas;
DROP POLICY "Users can delete lojas of their cnpjs" ON public.lojas;

CREATE POLICY "Users can view lojas of accessible clients" ON public.lojas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cnpjs c 
      WHERE c.id = lojas.cnpj_id AND public.has_client_access(c.cliente_id)
    )
  );

CREATE POLICY "Users can create lojas for accessible clients" ON public.lojas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cnpjs c 
      WHERE c.id = lojas.cnpj_id AND public.has_client_access(c.cliente_id)
    )
  );

CREATE POLICY "Users can update lojas of accessible clients" ON public.lojas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cnpjs c 
      WHERE c.id = lojas.cnpj_id AND public.has_client_access(c.cliente_id)
    )
  );

CREATE POLICY "Users can delete lojas of accessible clients" ON public.lojas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cnpjs c 
      WHERE c.id = lojas.cnpj_id AND public.has_client_access(c.cliente_id)
    )
  );

-- Atualizar policies da tabela dados_mensais para usar o novo sistema
DROP POLICY "Users can view monthly data of their lojas" ON public.dados_mensais;
DROP POLICY "Users can create monthly data for their lojas" ON public.dados_mensais;
DROP POLICY "Users can update monthly data of their lojas" ON public.dados_mensais;
DROP POLICY "Users can delete monthly data of their lojas" ON public.dados_mensais;

CREATE POLICY "Users can view monthly data of accessible clients" ON public.dados_mensais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      WHERE l.id = dados_mensais.loja_id AND public.has_client_access(c.cliente_id)
    )
  );

CREATE POLICY "Users can create monthly data for accessible clients" ON public.dados_mensais
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      WHERE l.id = dados_mensais.loja_id AND public.has_client_access(c.cliente_id)
    )
  );

CREATE POLICY "Users can update monthly data of accessible clients" ON public.dados_mensais
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      WHERE l.id = dados_mensais.loja_id AND public.has_client_access(c.cliente_id)
    )
  );

CREATE POLICY "Users can delete monthly data of accessible clients" ON public.dados_mensais
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      WHERE l.id = dados_mensais.loja_id AND public.has_client_access(c.cliente_id)
    )
  );