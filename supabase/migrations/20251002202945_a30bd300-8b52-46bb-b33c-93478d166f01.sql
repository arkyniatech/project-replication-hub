-- TEMPORÁRIO: Desabilitar RLS na tabela pessoas para desenvolvimento/testes
-- Isso será revertido quando a autenticação for implementada
ALTER TABLE pessoas DISABLE ROW LEVEL SECURITY;

-- Comentário: As políticas RLS ainda existem, apenas não são aplicadas até reabilitarmos o RLS