-- Popular grupos iniciais para equipamentos
INSERT INTO public.grupos_equipamentos (nome, descricao, ativo) VALUES
  ('Betoneiras', 'Equipamentos para mistura de concreto e argamassa', true),
  ('Andaimes', 'Estruturas de acesso e trabalho em altura', true),
  ('Escoras', 'Escoras metálicas e acessórios de escoramento', true),
  ('Compactadores', 'Equipamentos para compactação de solo', true),
  ('Geradores', 'Geradores de energia elétrica', true),
  ('Ferramentas Elétricas', 'Ferramentas e equipamentos elétricos diversos', true)
ON CONFLICT DO NOTHING;