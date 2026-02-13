-- Seed modelos_equipamentos com modelos iniciais
-- Distribuindo pelos 6 grupos existentes

DO $$
DECLARE
  v_grupo_betoneiras UUID;
  v_grupo_andaimes UUID;
  v_grupo_escoras UUID;
  v_grupo_compactadores UUID;
  v_grupo_geradores UUID;
  v_grupo_ferramentas UUID;
BEGIN
  -- Buscar IDs dos grupos
  SELECT id INTO v_grupo_betoneiras FROM grupos_equipamentos WHERE nome = 'Betoneiras';
  SELECT id INTO v_grupo_andaimes FROM grupos_equipamentos WHERE nome = 'Andaimes';
  SELECT id INTO v_grupo_escoras FROM grupos_equipamentos WHERE nome = 'Escoras';
  SELECT id INTO v_grupo_compactadores FROM grupos_equipamentos WHERE nome = 'Compactadores';
  SELECT id INTO v_grupo_geradores FROM grupos_equipamentos WHERE nome = 'Geradores';
  SELECT id INTO v_grupo_ferramentas FROM grupos_equipamentos WHERE nome = 'Ferramentas Elétricas';

  -- Inserir modelos de Betoneiras
  INSERT INTO modelos_equipamentos (grupo_id, nome_comercial, prefixo_codigo, proximo_sequencial, tabela_por_loja, especificacoes, ativo)
  VALUES
    (v_grupo_betoneiras, 'Betoneira 150L', 'BET', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_betoneiras, 'Betoneira 400L', 'BET400', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_betoneiras, 'Betoneira 600L', 'BET600', 1, '{}'::jsonb, '{}'::jsonb, true);

  -- Inserir modelos de Andaimes
  INSERT INTO modelos_equipamentos (grupo_id, nome_comercial, prefixo_codigo, proximo_sequencial, tabela_por_loja, especificacoes, ativo)
  VALUES
    (v_grupo_andaimes, 'Andaime Tubular 1,5m', 'AND15', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_andaimes, 'Andaime Tubular 2,0m', 'AND20', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_andaimes, 'Andaime Fachadeiro', 'ANDFAC', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_andaimes, 'Torre de Andaime', 'ANDTOR', 1, '{}'::jsonb, '{}'::jsonb, true);

  -- Inserir modelos de Escoras
  INSERT INTO modelos_equipamentos (grupo_id, nome_comercial, prefixo_codigo, proximo_sequencial, tabela_por_loja, especificacoes, ativo)
  VALUES
    (v_grupo_escoras, 'Escora Metálica 3m', 'ESC3', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_escoras, 'Escora Metálica 4m', 'ESC4', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_escoras, 'Escora Regulável', 'ESCREG', 1, '{}'::jsonb, '{}'::jsonb, true);

  -- Inserir modelos de Compactadores
  INSERT INTO modelos_equipamentos (grupo_id, nome_comercial, prefixo_codigo, proximo_sequencial, tabela_por_loja, especificacoes, ativo)
  VALUES
    (v_grupo_compactadores, 'Compactador de Solo', 'CSOLO', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_compactadores, 'Placa Vibratória', 'PVIB', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_compactadores, 'Rolo Compactador', 'RCOMP', 1, '{}'::jsonb, '{}'::jsonb, true);

  -- Inserir modelos de Geradores
  INSERT INTO modelos_equipamentos (grupo_id, nome_comercial, prefixo_codigo, proximo_sequencial, tabela_por_loja, especificacoes, ativo)
  VALUES
    (v_grupo_geradores, 'Gerador 5 KVA', 'GER5', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_geradores, 'Gerador 10 KVA', 'GER10', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_geradores, 'Gerador 15 KVA', 'GER15', 1, '{}'::jsonb, '{}'::jsonb, true);

  -- Inserir modelos de Ferramentas Elétricas
  INSERT INTO modelos_equipamentos (grupo_id, nome_comercial, prefixo_codigo, proximo_sequencial, tabela_por_loja, especificacoes, ativo)
  VALUES
    (v_grupo_ferramentas, 'Martelete Perfurador', 'MART', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_ferramentas, 'Furadeira de Impacto', 'FUR', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_ferramentas, 'Serra Circular', 'SERR', 1, '{}'::jsonb, '{}'::jsonb, true),
    (v_grupo_ferramentas, 'Esmerilhadeira', 'ESM', 1, '{}'::jsonb, '{}'::jsonb, true);

END $$;