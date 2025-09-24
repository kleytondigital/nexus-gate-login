-- Recriar funções com search_path definido
DROP FUNCTION IF EXISTS public.create_cliente_with_cnpj;
DROP FUNCTION IF EXISTS public.update_cliente_with_cnpj;

-- Criar função RPC para criar cliente e CNPJ em uma transação
CREATE OR REPLACE FUNCTION public.create_cliente_with_cnpj(
  p_nome TEXT,
  p_cnpj_principal TEXT,
  p_email TEXT,
  p_telefone TEXT,
  p_endereco TEXT,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cliente_id UUID;
BEGIN
  -- Inserir cliente
  INSERT INTO clientes (nome, cnpj_principal, email, telefone, endereco, created_by)
  VALUES (p_nome, p_cnpj_principal, p_email, p_telefone, p_endereco, p_created_by)
  RETURNING id INTO cliente_id;
  
  -- Inserir CNPJ automaticamente
  INSERT INTO cnpjs (cliente_id, cnpj, razao_social, nome_fantasia, endereco)
  VALUES (cliente_id, p_cnpj_principal, p_nome, p_nome, p_endereco);
  
  RETURN cliente_id;
END;
$$;

-- Criar função RPC para atualizar cliente e sincronizar CNPJ principal
CREATE OR REPLACE FUNCTION public.update_cliente_with_cnpj(
  p_cliente_id UUID,
  p_nome TEXT,
  p_cnpj_principal TEXT,
  p_email TEXT,
  p_telefone TEXT,
  p_endereco TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_cnpj TEXT;
BEGIN
  -- Buscar CNPJ principal atual
  SELECT cnpj_principal INTO old_cnpj 
  FROM clientes 
  WHERE id = p_cliente_id;
  
  -- Atualizar cliente
  UPDATE clientes 
  SET nome = p_nome,
      cnpj_principal = p_cnpj_principal,
      email = p_email,
      telefone = p_telefone,
      endereco = p_endereco,
      updated_at = now()
  WHERE id = p_cliente_id;
  
  -- Atualizar o CNPJ principal na tabela cnpjs
  UPDATE cnpjs 
  SET cnpj = p_cnpj_principal,
      razao_social = p_nome,
      nome_fantasia = p_nome,
      endereco = p_endereco,
      updated_at = now()
  WHERE cliente_id = p_cliente_id AND cnpj = old_cnpj;
END;
$$;