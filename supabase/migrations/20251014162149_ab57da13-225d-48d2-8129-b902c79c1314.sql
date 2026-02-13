-- Adicionar campo CPF na tabela fornecedores
ALTER TABLE public.fornecedores
ADD COLUMN cpf TEXT;

-- Adicionar constraint para garantir que pelo menos CPF ou CNPJ seja preenchido
ALTER TABLE public.fornecedores
ADD CONSTRAINT fornecedor_documento_required 
CHECK (cpf IS NOT NULL OR cnpj IS NOT NULL);

-- Criar função para gerar fornecedor automaticamente a partir de pessoa
CREATE OR REPLACE FUNCTION public.criar_fornecedor_automatico_por_pessoa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
  v_fornecedor_existente UUID;
BEGIN
  -- Só processa se a pessoa está ativa e tem CPF
  IF NEW.situacao = 'ativo' AND NEW.cpf IS NOT NULL THEN
    
    -- Verificar se já existe fornecedor com este CPF
    SELECT id INTO v_fornecedor_existente
    FROM fornecedores
    WHERE cpf = NEW.cpf
    LIMIT 1;
    
    -- Se não existir, criar novo fornecedor
    IF v_fornecedor_existente IS NULL THEN
      -- Gerar código automaticamente
      v_codigo := gerar_codigo_fornecedor();
      
      -- Inserir novo fornecedor
      INSERT INTO fornecedores (
        codigo,
        nome,
        cpf,
        observacoes,
        ativo,
        created_by
      ) VALUES (
        v_codigo,
        NEW.nome_completo,
        NEW.cpf,
        'Criado automaticamente via RH em ' || to_char(now(), 'DD/MM/YYYY HH24:MI'),
        true,
        NEW.created_by
      );
      
      RAISE NOTICE 'Fornecedor % criado automaticamente para pessoa %', v_codigo, NEW.nome_completo;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela pessoas
CREATE TRIGGER on_pessoa_created_or_updated
AFTER INSERT OR UPDATE ON public.pessoas
FOR EACH ROW
EXECUTE FUNCTION public.criar_fornecedor_automatico_por_pessoa();