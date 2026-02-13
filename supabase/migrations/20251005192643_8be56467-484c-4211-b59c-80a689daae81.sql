-- Remover constraints temporariamente
ALTER TABLE grupos_equipamentos DROP CONSTRAINT IF EXISTS grupos_equipamentos_codigo_numerico_check;
ALTER TABLE grupos_equipamentos DROP CONSTRAINT IF EXISTS grupos_equipamentos_codigo_numerico_unique;
ALTER TABLE grupos_equipamentos DROP CONSTRAINT IF EXISTS grupos_equipamentos_codigo_numerico_key;

-- Criar tabela temporária com os grupos padrão
CREATE TEMP TABLE temp_grupos_padrao (
  nome TEXT PRIMARY KEY,
  codigo_numerico INTEGER,
  descricao TEXT
);

INSERT INTO temp_grupos_padrao (nome, codigo_numerico, descricao) VALUES
  ('Marteletes', 1, 'Marteletes e perfuradores'),
  ('Rompedores', 2, 'Rompedores e britadeiras'),
  ('Ferramentas Elétricas', 3, 'Ferramentas elétricas diversas'),
  ('Ferramentas a Bateria', 4, 'Ferramentas sem fio a bateria'),
  ('Vibradores', 5, 'Vibradores de concreto'),
  ('Paineis Metálicos', 6, 'Painéis e estruturas metálicas'),
  ('Betoneiras', 7, 'Betoneiras e misturadores'),
  ('Compactadores', 8, 'Compactadores e placas vibratórias'),
  ('Escoramento', 9, 'Escoras e sistemas de escoramento'),
  ('Jardinagem', 10, 'Equipamentos para jardinagem'),
  ('Limpeza', 11, 'Equipamentos de limpeza'),
  ('Elevação e Carga', 12, 'Equipamentos de elevação e carga'),
  ('Eletricidade', 13, 'Equipamentos elétricos'),
  ('Containers', 14, 'Containers e armazenagem'),
  ('Geradores e Iluminação', 15, 'Geradores e equipamentos de iluminação'),
  ('Piso e Revestimento', 16, 'Equipamentos para piso e revestimento'),
  ('Soldas', 17, 'Equipamentos de solda'),
  ('Bombas', 18, 'Bombas hidráulicas'),
  ('Compressores', 19, 'Compressores de ar'),
  ('Escadas', 20, 'Escadas e plataformas'),
  ('Ferramentas Manuais', 21, 'Ferramentas manuais'),
  ('Andaime Fachadeiro', 22, 'Andaimes e estruturas para fachada'),
  ('Canteiro de Obra', 23, 'Equipamentos para canteiro de obra'),
  ('Pneumáticos', 24, 'Equipamentos pneumáticos'),
  ('Ferramentas Industriais', 25, 'Ferramentas industriais'),
  ('Escavadeira', 26, 'Escavadeiras e retroescavadeiras');

-- Mover códigos existentes temporariamente para faixa 1000+ para evitar conflitos
UPDATE grupos_equipamentos 
SET codigo_numerico = codigo_numerico + 1000
WHERE codigo_numerico < 1000;

-- Atualizar grupos que já existem pelo nome
UPDATE grupos_equipamentos g
SET 
  codigo_numerico = t.codigo_numerico,
  descricao = COALESCE(t.descricao, g.descricao),
  ativo = true,
  updated_at = now()
FROM temp_grupos_padrao t
WHERE g.nome = t.nome;

-- Inserir novos grupos que não existem
INSERT INTO grupos_equipamentos (nome, codigo_numerico, ativo, descricao)
SELECT t.nome, t.codigo_numerico, true, t.descricao
FROM temp_grupos_padrao t
WHERE NOT EXISTS (
  SELECT 1 FROM grupos_equipamentos g 
  WHERE g.nome = t.nome
);

-- Grupos que não estão na lista padrão mantêm seus códigos originais (ajustar para faixa 100+)
UPDATE grupos_equipamentos
SET codigo_numerico = (codigo_numerico - 1000) + 100
WHERE codigo_numerico >= 1000;

DROP TABLE temp_grupos_padrao;

-- Recriar constraints
ALTER TABLE grupos_equipamentos ADD CONSTRAINT grupos_equipamentos_codigo_numerico_unique UNIQUE (codigo_numerico);
ALTER TABLE grupos_equipamentos ADD CONSTRAINT grupos_equipamentos_codigo_numerico_check CHECK (codigo_numerico >= 1 AND codigo_numerico <= 199);