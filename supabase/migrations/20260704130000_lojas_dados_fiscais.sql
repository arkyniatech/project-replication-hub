-- ============================================================
-- Dados fiscais/contato por loja (usados no cabeçalho do
-- contrato de locação e na nota promissória)
-- ============================================================

ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS horario_funcionamento text;

-- Seed: dados da loja Ouro Fino (conforme contrato-modelo 922).
-- As demais lojas devem ser preenchidas em Configurações > Lojas.
UPDATE public.lojas
SET
  razao_social = COALESCE(razao_social, 'LOCAACAO OURO FINO ALUGUEL DE EQUIPAMENTOS E MAQUINAS LTDA'),
  cnpj = COALESCE(cnpj, '55.013.407/0001-45'),
  endereco = COALESCE(endereco, 'AVENIDA DELFIM MOREIRA, 466 - OURO FINO/MG'),
  cidade = COALESCE(cidade, 'Ouro Fino'),
  telefone = COALESCE(telefone, '(19) 93300-5870'),
  email = COALESCE(email, 'ourofino@locaacao.com.br'),
  horario_funcionamento = COALESCE(horario_funcionamento, 'Segunda a Sexta das 07:15 as 17:30')
WHERE nome ILIKE '%ouro fino%';
