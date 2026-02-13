-- Adicionar foreign key de faturas -> clientes
ALTER TABLE faturas
ADD CONSTRAINT fk_faturas_cliente
FOREIGN KEY (cliente_id) REFERENCES clientes(id)
ON DELETE RESTRICT;

-- Adicionar foreign key de faturas -> contratos  
ALTER TABLE faturas
ADD CONSTRAINT fk_faturas_contrato
FOREIGN KEY (contrato_id) REFERENCES contratos(id)
ON DELETE SET NULL;

-- Adicionar foreign key de faturas -> lojas
ALTER TABLE faturas
ADD CONSTRAINT fk_faturas_loja
FOREIGN KEY (loja_id) REFERENCES lojas(id)
ON DELETE RESTRICT;