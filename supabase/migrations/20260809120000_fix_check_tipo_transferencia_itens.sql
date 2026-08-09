-- ============================================================================
-- transferencia_itens.tipo: o schema legado tinha CHECK (tipo IN
-- ('SERIALIZADO','SALDO')), mas TODO o frontend grava e compara 'SERIAL'
-- (NovaTransferenciaModal, DetalheTransferenciaModal, DespachoPDF,
-- HistoricoTransferenciasModal). Com o CHECK antigo, transferir um
-- equipamento serializado falharia no insert dos itens — deixando a
-- transferência-pai órfã (o fluxo não é transacional).
-- Verificado em produção (2026-08-09): a tabela está VAZIA — nenhum dado a
-- migrar. Realinha o CHECK ao contrato real do front: ('SERIAL','SALDO').
-- ============================================================================

DO $$
DECLARE c record;
BEGIN
  -- remove apenas os CHECKs que mencionam a coluna tipo (preserva os demais)
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.transferencia_itens'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.transferencia_itens DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- normalização defensiva (tabela está vazia hoje, mas custa nada)
UPDATE public.transferencia_itens SET tipo = 'SERIAL' WHERE tipo = 'SERIALIZADO';

ALTER TABLE public.transferencia_itens
  ADD CONSTRAINT transferencia_itens_tipo_check CHECK (tipo IN ('SERIAL', 'SALDO'));
