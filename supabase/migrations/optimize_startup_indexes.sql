-- Migration: Optimize Startup Indexes
-- Description: Adds indexes to improve pre-loading query performance found in AppInitializer logic.

-- 1. Index for checking equipment status (used in fixEquipamentosSemOS)
CREATE INDEX IF NOT EXISTS idx_equipamentos_status_ativo 
ON public.equipamentos (status_global, ativo)
WHERE ativo = true;

-- 2. Index for checking existing active OS (used in fixEquipamentosSemOS)
-- Supporting the query: .eq('equipamento_id', equip.id).in('status', ['EM_ANALISE', ...])
CREATE INDEX IF NOT EXISTS idx_ordens_servico_equip_status 
ON public.ordens_servico (equipamento_id, status);

-- 3. Index for finding latest contract item logic
-- Supporting the query: .eq('equipamento_id', equip.id).order('created_at', descending)
CREATE INDEX IF NOT EXISTS idx_contrato_itens_equip_created 
ON public.contrato_itens (equipamento_id, created_at DESC);

