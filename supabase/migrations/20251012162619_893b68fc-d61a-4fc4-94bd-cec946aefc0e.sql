-- Adicionar foreign keys para relacionamentos entre tabelas

-- Adicionar foreign key de titulos para clientes
ALTER TABLE titulos 
ADD CONSTRAINT fk_titulos_cliente 
FOREIGN KEY (cliente_id) 
REFERENCES clientes(id) 
ON DELETE RESTRICT;

-- Adicionar foreign key de titulos para contratos
ALTER TABLE titulos 
ADD CONSTRAINT fk_titulos_contrato 
FOREIGN KEY (contrato_id) 
REFERENCES contratos(id) 
ON DELETE SET NULL;

-- Adicionar foreign key de titulos para faturas
ALTER TABLE titulos 
ADD CONSTRAINT fk_titulos_fatura 
FOREIGN KEY (fatura_id) 
REFERENCES faturas(id) 
ON DELETE SET NULL;

-- Adicionar foreign key de recebimentos para titulos
ALTER TABLE recebimentos 
ADD CONSTRAINT fk_recebimentos_titulo 
FOREIGN KEY (titulo_id) 
REFERENCES titulos(id) 
ON DELETE CASCADE;

-- Criar índices para melhorar performance das queries
CREATE INDEX IF NOT EXISTS idx_titulos_cliente_id ON titulos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_titulos_contrato_id ON titulos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_titulos_fatura_id ON titulos(fatura_id);
CREATE INDEX IF NOT EXISTS idx_titulos_loja_status ON titulos(loja_id, status);
CREATE INDEX IF NOT EXISTS idx_recebimentos_titulo_id ON recebimentos(titulo_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_loja_data ON recebimentos(loja_id, data);