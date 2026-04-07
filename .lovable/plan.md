

## Plano: Ajustar valor para teste de emissão

### Situação atual
- Contrato `53882f9f` — status ATIVO, `valor_total = 0`
- 2 títulos vinculados, ambos com `valor = 0`, `saldo = 0`

### O que fazer

**1. Atualizar contrato** — `valor_total = 100`

**2. Atualizar primeiro título** (`506fc807`) — `valor = 100`, `saldo = 100`

Isso permitirá testar a emissão de boleto/PIX com R$100,00 na aba Contas a Receber.

### Arquivos alterados
Nenhum arquivo de código. Apenas 2 updates SQL via migration:
- `UPDATE contratos SET valor_total = 100 WHERE id = '53882f9f-...'`
- `UPDATE titulos SET valor = 100, saldo = 100 WHERE id = '506fc807-...'`

