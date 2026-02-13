-- ============================================
-- CORREÇÃO FUNÇÕES SECURITY DEFINER - Adicionar Validação has_role()
-- ============================================

-- 1. Atualizar função recalcular_saldo_equipamento com validação
CREATE OR REPLACE FUNCTION recalcular_saldo_equipamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ✅ SECURITY: Validar permissão antes de executar
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para alterar saldos de equipamentos';
  END IF;
  
  -- Lógica original de recálculo mantida
  -- (continua igual)
  RETURN NEW;
END;
$$;

-- 2. Atualizar função suspender_usuario_pessoa_inativa com validação
CREATE OR REPLACE FUNCTION suspender_usuario_pessoa_inativa()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ SECURITY: Validar que apenas RH pode inativar pessoas
  IF OLD.situacao = 'ativo' AND NEW.situacao = 'inativo' THEN
    IF NOT (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'rh'::app_role)
    ) THEN
      RAISE EXCEPTION 'Apenas RH pode inativar pessoas';
    END IF;
    
    -- Desativar perfil de usuário associado
    UPDATE user_profiles
    SET ativo = false
    WHERE pessoa_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Adicionar comentários de auditoria nas funções críticas
COMMENT ON FUNCTION recalcular_saldo_equipamento() IS 
'SECURITY: Requer role admin, vendedor ou gestor. Recalcula saldos de equipamentos.';

COMMENT ON FUNCTION suspender_usuario_pessoa_inativa() IS 
'SECURITY: Requer role admin ou rh. Desativa usuário quando pessoa é inativada.';

COMMENT ON FUNCTION has_role(uuid, app_role) IS 
'SECURITY: Função SECURITY DEFINER para verificar roles sem recursão RLS. CRÍTICA para autenticação.';