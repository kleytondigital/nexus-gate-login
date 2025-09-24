-- Criar triggers apenas se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_user_cliente_access_updated_at'
    ) THEN
        CREATE TRIGGER update_user_cliente_access_updated_at
          BEFORE UPDATE ON public.user_cliente_access
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Criar policies apenas se não existirem
DO $$ 
BEGIN
    -- Policies para user_roles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own role') THEN
        CREATE POLICY "Users can view their own role" ON public.user_roles
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all roles') THEN
        CREATE POLICY "Admins can view all roles" ON public.user_roles
          FOR SELECT USING (public.is_admin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can manage all roles') THEN
        CREATE POLICY "Admins can manage all roles" ON public.user_roles
          FOR ALL USING (public.is_admin());
    END IF;

    -- Policies para user_cliente_access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_cliente_access' AND policyname = 'Users can view their own client access') THEN
        CREATE POLICY "Users can view their own client access" ON public.user_cliente_access
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_cliente_access' AND policyname = 'Admins can view all client access') THEN
        CREATE POLICY "Admins can view all client access" ON public.user_cliente_access
          FOR SELECT USING (public.is_admin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_cliente_access' AND policyname = 'Admins and managers can grant access') THEN
        CREATE POLICY "Admins and managers can grant access" ON public.user_cliente_access
          FOR INSERT WITH CHECK (
            public.is_admin() OR 
            (public.get_user_role() = 'gerente' AND public.has_client_access(cliente_id))
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_cliente_access' AND policyname = 'Admins and granters can revoke access') THEN
        CREATE POLICY "Admins and granters can revoke access" ON public.user_cliente_access
          FOR DELETE USING (
            public.is_admin() OR 
            auth.uid() = granted_by
          );
    END IF;
END $$;

-- Atualizar policies da tabela clientes
DROP POLICY IF EXISTS "Users can view their clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can create clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update accessible clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete accessible clients" ON public.clientes;

CREATE POLICY "Users can view accessible clients" ON public.clientes
  FOR SELECT USING (public.has_client_access(id));

CREATE POLICY "Users can create clients" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update accessible clients" ON public.clientes
  FOR UPDATE USING (public.has_client_access(id));

CREATE POLICY "Users can delete accessible clients" ON public.clientes
  FOR DELETE USING (public.has_client_access(id));