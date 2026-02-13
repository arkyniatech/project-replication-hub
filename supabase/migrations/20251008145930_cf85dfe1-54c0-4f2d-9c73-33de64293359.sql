-- Corrigir saldos_por_loja do PAINEL METALICO 1,50M
-- Restaurar 5 unidades em Águas de Lindóia e manter 5 em Socorro
UPDATE equipamentos
SET 
  saldos_por_loja = jsonb_build_object(
    '8ee16ae1-cbbe-46f5-ad64-cbfb455b58ba', jsonb_build_object('qtd', 5),
    '368bb334-f3ee-4a52-ac67-b624fee6d415', jsonb_build_object('qtd', 5)
  ),
  historico = historico || jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'timestamp', '2025-01-08T12:30:00Z',
      'tipo', 'TRANSFERENCIA_ENVIADA',
      'descricao', 'Transferência de 5 unidades enviada para Socorro-SP',
      'usuario', 'Sistema',
      'meta', jsonb_build_object(
        'origemLojaId', '8ee16ae1-cbbe-46f5-ad64-cbfb455b58ba',
        'origemLojaNome', 'Águas de Lindóia-SP',
        'destinoLojaId', '368bb334-f3ee-4a52-ac67-b624fee6d415',
        'destinoLojaNome', 'Socorro-SP',
        'quantidade', 5
      )
    ),
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'timestamp', '2025-01-08T12:35:00Z',
      'tipo', 'TRANSFERENCIA_RECEBIDA',
      'descricao', 'Transferência de 5 unidades recebida em Socorro-SP',
      'usuario', 'Sistema',
      'meta', jsonb_build_object(
        'origemLojaId', '8ee16ae1-cbbe-46f5-ad64-cbfb455b58ba',
        'origemLojaNome', 'Águas de Lindóia-SP',
        'destinoLojaId', '368bb334-f3ee-4a52-ac67-b624fee6d415',
        'destinoLojaNome', 'Socorro-SP',
        'quantidade', 5
      )
    )
  ),
  updated_at = now()
WHERE id = '69400ec9-f8f3-445d-91c4-ca8dee66334c';