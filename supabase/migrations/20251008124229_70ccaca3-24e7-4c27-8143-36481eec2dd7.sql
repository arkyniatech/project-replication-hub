-- Corrigir ordem e códigos das lojas conforme padrão correto
-- Usando valores temporários negativos para evitar conflito de unique constraint

-- Passo 1: Mover para valores temporários negativos
UPDATE lojas SET codigo_numerico = -2 WHERE id = '368bb334-f3ee-4a52-ac67-b624fee6d415'; -- Socorro-SP
UPDATE lojas SET codigo_numerico = -3 WHERE id = 'ad524172-4485-4987-bcab-2041e335b720'; -- Monte Sião-MG
UPDATE lojas SET codigo_numerico = -4 WHERE id = 'ef5286cd-c1f8-4ffa-a4af-296ab8670445'; -- Ouro Fino-MG

-- Passo 2: Aplicar valores finais corretos
UPDATE lojas 
SET codigo = 'loja-2', codigo_numerico = 2
WHERE id = '368bb334-f3ee-4a52-ac67-b624fee6d415'; -- Socorro-SP (Loja 02)

UPDATE lojas 
SET codigo = 'loja-3', codigo_numerico = 3
WHERE id = 'ad524172-4485-4987-bcab-2041e335b720'; -- Monte Sião-MG (Loja 03)

UPDATE lojas 
SET codigo = 'loja-4', codigo_numerico = 4
WHERE id = 'ef5286cd-c1f8-4ffa-a4af-296ab8670445'; -- Ouro Fino-MG (Loja 04)