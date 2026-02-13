-- Remover foreign key duplicada entre faturas e contratos
-- Mantém apenas fk_faturas_contrato (criada na migration anterior)
ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_contrato_id_fkey;