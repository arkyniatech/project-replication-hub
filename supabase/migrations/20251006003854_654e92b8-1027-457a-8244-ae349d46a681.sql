-- Limpar dados de teste dos contratos
-- Primeiro deletar os itens (devido à foreign key)
DELETE FROM contrato_itens;

-- Depois deletar os contratos
DELETE FROM contratos;