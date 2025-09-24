-- Criar enum para tipos de marketplace
CREATE TYPE marketplace_type AS ENUM ('shopee', 'mercado_livre', 'tiktok_shop', 'shein', 'magalu', 'amazon', 'outros');

-- Criar enum para tipos de campanha
CREATE TYPE campaign_type AS ENUM ('organica', 'paga', 'ambas');

-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj_principal TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- Criar tabela de CNPJs
CREATE TABLE public.cnpjs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de lojas
CREATE TABLE public.lojas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj_id UUID NOT NULL REFERENCES public.cnpjs(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  marketplace marketplace_type NOT NULL,
  url TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de dados mensais
CREATE TABLE public.dados_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  faturamento_bruto DECIMAL(15,2) NOT NULL DEFAULT 0,
  investimento_ads DECIMAL(15,2) NOT NULL DEFAULT 0,
  itens_vendidos INTEGER NOT NULL DEFAULT 0,
  tipo_campanha campaign_type NOT NULL DEFAULT 'ambas',
  roas DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE 
      WHEN investimento_ads > 0 THEN faturamento_bruto / investimento_ads 
      ELSE 0 
    END
  ) STORED,
  acos DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE 
      WHEN faturamento_bruto > 0 THEN investimento_ads / faturamento_bruto 
      ELSE 0 
    END
  ) STORED,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(loja_id, mes, ano)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnpjs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para clientes
CREATE POLICY "Users can view their clients" ON public.clientes
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create clients" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their clients" ON public.clientes
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their clients" ON public.clientes
  FOR DELETE USING (auth.uid() = created_by);

-- Políticas RLS para cnpjs
CREATE POLICY "Users can view cnpjs of their clients" ON public.cnpjs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clientes 
      WHERE id = cnpjs.cliente_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create cnpjs for their clients" ON public.cnpjs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clientes 
      WHERE id = cliente_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update cnpjs of their clients" ON public.cnpjs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clientes 
      WHERE id = cnpjs.cliente_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete cnpjs of their clients" ON public.cnpjs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clientes 
      WHERE id = cnpjs.cliente_id AND created_by = auth.uid()
    )
  );

-- Políticas RLS para lojas
CREATE POLICY "Users can view lojas of their cnpjs" ON public.lojas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cnpjs c
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE c.id = lojas.cnpj_id AND cl.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create lojas for their cnpjs" ON public.lojas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cnpjs c
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE c.id = cnpj_id AND cl.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update lojas of their cnpjs" ON public.lojas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cnpjs c
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE c.id = lojas.cnpj_id AND cl.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete lojas of their cnpjs" ON public.lojas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cnpjs c
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE c.id = lojas.cnpj_id AND cl.created_by = auth.uid()
    )
  );

-- Políticas RLS para dados_mensais
CREATE POLICY "Users can view monthly data of their lojas" ON public.dados_mensais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE l.id = dados_mensais.loja_id AND cl.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create monthly data for their lojas" ON public.dados_mensais
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE l.id = loja_id AND cl.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update monthly data of their lojas" ON public.dados_mensais
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE l.id = dados_mensais.loja_id AND cl.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete monthly data of their lojas" ON public.dados_mensais
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lojas l
      JOIN public.cnpjs c ON l.cnpj_id = c.id
      JOIN public.clientes cl ON c.cliente_id = cl.id
      WHERE l.id = dados_mensais.loja_id AND cl.created_by = auth.uid()
    )
  );

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cnpjs_updated_at
  BEFORE UPDATE ON public.cnpjs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lojas_updated_at
  BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dados_mensais_updated_at
  BEFORE UPDATE ON public.dados_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para performance
CREATE INDEX idx_clientes_created_by ON public.clientes(created_by);
CREATE INDEX idx_cnpjs_cliente_id ON public.cnpjs(cliente_id);
CREATE INDEX idx_lojas_cnpj_id ON public.lojas(cnpj_id);
CREATE INDEX idx_dados_mensais_loja_id ON public.dados_mensais(loja_id);
CREATE INDEX idx_dados_mensais_mes_ano ON public.dados_mensais(mes, ano);