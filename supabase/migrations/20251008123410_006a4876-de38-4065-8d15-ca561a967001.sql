-- Corrigir saldos da transferência #18480 (PAINEL METALICO 1,50M)
-- Transferir 5 unidades de Águas de Lindóia para Socorro
UPDATE equipamentos
SET saldos_por_loja = jsonb_build_object(
  '8ee16ae1-cbbe-46f5-ad64-cbfb455b58ba', jsonb_build_object('qtd', 0),
  '368bb334-f3ee-4a52-ac67-b624fee6d415', jsonb_build_object('qtd', 5)
)
WHERE id = '69400ec9-f8f3-445d-91c4-ca8dee66334c';