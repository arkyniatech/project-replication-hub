-- Exclusão definitiva de grupos legados (102, 103, 105) e equipamentos vinculados

-- 1. Deletar equipamentos vinculados ao grupo "Andaimes" (102)
DELETE FROM public.equipamentos 
WHERE grupo_id IN (
  SELECT id FROM public.grupos_equipamentos 
  WHERE codigo_numerico IN (102, 103, 105)
);

-- 2. Deletar histórico de preços dos modelos desses grupos (se existir)
DELETE FROM public.historico_precos 
WHERE modelo_id IN (
  SELECT id FROM public.modelos_equipamentos 
  WHERE grupo_id IN (
    SELECT id FROM public.grupos_equipamentos 
    WHERE codigo_numerico IN (102, 103, 105)
  )
);

-- 3. Deletar sequenciais de equipamentos desses grupos
DELETE FROM public.sequenciais_equipamentos 
WHERE grupo_id IN (
  SELECT id FROM public.grupos_equipamentos 
  WHERE codigo_numerico IN (102, 103, 105)
);

-- 4. Deletar modelos vinculados a esses grupos
DELETE FROM public.modelos_equipamentos 
WHERE grupo_id IN (
  SELECT id FROM public.grupos_equipamentos 
  WHERE codigo_numerico IN (102, 103, 105)
);

-- 5. Deletar os 3 grupos definitivamente
DELETE FROM public.grupos_equipamentos 
WHERE codigo_numerico IN (102, 103, 105);

-- Comentário: Grupos "Andaimes" (102), "Escoras" (103) e "Geradores" (105) 
-- foram removidos permanentemente junto com seus equipamentos vinculados.