-- Atualizar policies da tabela cnpjs
DROP POLICY IF EXISTS "Users can view cnpjs of their clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can create cnpjs for their clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can update cnpjs of their clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can delete cnpjs of their clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can view cnpjs of accessible clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can create cnpjs for accessible clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can update cnpjs of accessible clients" ON public.cnpjs;
DROP POLICY IF EXISTS "Users can delete cnpjs of accessible clients" ON public.cnpjs;

CREATE POLICY "Users can view cnpjs of accessible clients" ON public.cnpjs
  FOR SELECT USING (public.has_client_access(cliente_id));

CREATE POLICY "Users can create cnpjs for accessible clients" ON public.cnpjs
  FOR INSERT WITH CHECK (public.has_client_access(cliente_id));

CREATE POLICY "Users can update cnpjs of accessible clients" ON public.cnpjs
  FOR UPDATE USING (public.has_client_access(cliente_id));

CREATE POLICY "Users can delete cnpjs of accessible clients" ON public.cnpjs
  FOR DELETE USING (public.has_client_access(cliente_id));

-- Atualizar policies da tabela lojas
DROP POLICY IF EXISTS "Users can view lojas of their cnpjs" ON public.lojas;
DROP POLICY IF EXISTS "Users can create lojas for their cnpjs" ON public.lojas;
DROP POLICY IF EXISTS "Users can update lojas of their cnpjs" ON public.lojas;
DROP POLICY IF EXISTS "Users can delete lojas of their cnpjs" ON public.lojas;
DROP POLICY IF EXISTS "Users can view lojas of accessible clients" ON public.lojas;
DROP POLICY IF EXISTS "Users can create lojas for accessible clients" ON public.lojas;
DROP POLICY IF EXISTS "Users can update lojas of accessible clients" ON public.lojas;
DROP POLICY IF EXISTS "Users can delete lojas of accessible clients" ON public.lojas;

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

-- Atualizar policies da tabela dados_mensais
DROP POLICY IF EXISTS "Users can view monthly data of their lojas" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can create monthly data for their lojas" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can update monthly data of their lojas" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can delete monthly data of their lojas" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can view monthly data of accessible clients" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can create monthly data for accessible clients" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can update monthly data of accessible clients" ON public.dados_mensais;
DROP POLICY IF EXISTS "Users can delete monthly data of accessible clients" ON public.dados_mensais;

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