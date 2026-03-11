

## Plano: Corrigir Download PDF + Adicionar "Ver Contrato"

### Problema
O botão "Baixar Contrato" no header apenas mostra um toast — não tem lógica de download. A linha 570 é literalmente:
```
onContratoPDF={() => toast({ title: "Baixando contrato PDF..." })}
```

### Alterações

**`src/pages/ContratoDetalhes.tsx`**
1. Implementar `handleBaixarContratoPDF` que monta o objeto `ContratoPDFData` a partir dos dados do contrato carregado (cliente, itens, entrega, pagamento) e chama `downloadContratoPDF()`
2. Implementar `handleVerContrato` que abre o `ContratoResumoPreview` (já existe o componente) com os dados do contrato
3. Adicionar state `showContratoPreview` para controlar o dialog
4. Passar `handleBaixarContratoPDF` no `onContratoPDF` em vez do toast
5. Renderizar o `ContratoResumoPreview` no final do JSX

**`src/components/contratos/ContratoHeader.tsx`**
- Adicionar botão "Ver Contrato" (ícone `Eye`) ao lado do botão de download, com prop `onVerContrato`

### Mapeamento de dados para o PDF
O contrato carregado já tem `contrato.itens`, `contrato.cliente`, `contrato.formaPagamento`, `contrato.dataInicio`, `contrato.dataFim` e `contrato.logistica`. A função `downloadContratoPDF` espera:
- `cliente.nomeRazao`, `cliente.documento`, `cliente.endereco`
- `itens[].equipamento.nome/codigo`, `quantidade`, `periodoEscolhido`, `valorUnitario`, `subtotal`
- `entrega.data`, `entrega.janela`
- `pagamento.forma`, `pagamento.vencimentoISO`
- `valorTotal`

Tudo disponível — só precisa mapear os nomes dos campos.

