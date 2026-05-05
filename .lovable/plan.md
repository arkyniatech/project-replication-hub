## Objetivo

Entregar ao cliente um **template CSV** para importar equipamentos em massa, com layout alinhado à tabela `equipamentos` do Supabase, e a documentação de como preencher cada coluna.

## Etapa 1 — Entregáveis imediatos (sem mexer no código)

Gerar 2 arquivos em `/mnt/documents/`:

1. **`equipamentos_template.csv`** — cabeçalho + 3 linhas de exemplo (1 SERIALIZADO + 1 SALDO + 1 com saldos em múltiplas lojas).
2. **`equipamentos_layout.md`** — guia de preenchimento (descrição de cada coluna, valores aceitos, obrigatoriedade, exemplos), incluindo:
   - Lista das **lojas** existentes (nome → usado no CSV)
   - Lista dos **grupos** existentes
   - Lista dos **modelos** existentes
   - Como referenciar marca (opcional)
   - Regras de tipo (`SERIALIZADO` exige `numero_serie`; `SALDO` exige `quantidade` + `loja`)

### Layout proposto do CSV (separador `;`, encoding UTF-8 BOM)

| Coluna | Obrigatório | Descrição | Exemplo |
|---|---|---|---|
| `codigo_interno` | Sim | Código único do equipamento | `BET015` |
| `tipo` | Sim | `SERIALIZADO` ou `SALDO` | `SERIALIZADO` |
| `grupo` | Sim | Nome do grupo (deve existir) | `Betoneiras` |
| `modelo` | Sim | Nome comercial do modelo (deve existir no grupo) | `Betoneira 400L` |
| `marca` | Não | Nome da marca | `CSM` |
| `loja` | Sim | Nome da loja onde está/abrigado o saldo | `Ouro Fino` |
| `numero_serie` | Cond. | Obrigatório se `tipo=SERIALIZADO` | `SN-2024-001` |
| `quantidade` | Cond. | Obrigatório se `tipo=SALDO` | `10` |
| `valor_indenizacao` | Sim | Decimal com vírgula | `1500,00` |
| `valor_aquisicao` | Não | Decimal com vírgula | `1200,00` |
| `data_aquisicao` | Não | `DD/MM/AAAA` | `15/03/2024` |
| `ano_fabricacao` | Não | Ano (4 dígitos) | `2024` |
| `vida_util_meses` | Não | Inteiro (default 60) | `60` |
| `condicao` | Não | `NOVO`, `BOM`, `REGULAR`, `RUIM` (default `BOM`) | `BOM` |
| `status_global` | Não | Default `DISPONIVEL` | `DISPONIVEL` |
| `observacoes` | Não | Texto livre | `Comprado em leilão` |

## Etapa 2 — (Opcional) Tela de importação no app

Se aprovar, depois construo:

- Botão **"Importar CSV"** em `src/pages/equipamentos/EquipamentosLista.tsx`
- Modal com:
  - Upload do arquivo
  - Pré-validação linha-a-linha (resolve nomes de loja/grupo/modelo → IDs)
  - Tabela mostrando **válidas / com erro** antes de confirmar
  - Insert em lote no Supabase (com `created_by = auth.uid()`)
  - Geração de evento `CRIACAO` no histórico de cada equipamento
- Botão "Baixar template" no próprio modal

## Próximo passo agora

Aprove e eu já gero o `.csv` e o `.md` em `/mnt/documents/` para você enviar ao cliente. Depois conversamos se quer também a tela de importação.