

## Plano: Corrigir Visibilidade Master + Integração Banco Inter Multi-Tenant

### Parte 1 — Bug de Visibilidade do Master

**Problema**: Em `useMultiunidade.ts`, a função `getLojasPermitidas()` (linha 125) retorna apenas as lojas da tabela `user_lojas_permitidas` se houver registros. Se o Master tiver 1 registro nessa tabela, ele so ve 1 loja — mesmo sendo Master.

**Correção**: Verificar `canViewAllLojas()` antes de filtrar. Se for master/admin, retornar todas as lojas independente de `user_lojas_permitidas`.

```text
getLojasPermitidas():
  SE master/admin → retorna TODAS as lojas
  SE tem registros em user_lojas_permitidas → retorna apenas essas
  SE não tem registros → retorna todas (fallback atual)
```

1 arquivo alterado: `src/hooks/useMultiunidade.ts`

---

### Parte 2 — Integração Banco Inter (PIX + Boleto) Multi-Tenant

**Conceito**: Cada empresa/loja tem suas proprias credenciais do Inter. As credenciais ficam no Supabase (criptografadas). Uma Edge Function faz o proxy seguro para a API do Inter.

#### O que o Banco Inter exige para integração:

1. **Client ID** e **Client Secret** (obtidos no Internet Banking do Inter, area de APIs)
2. **Certificado digital** (.crt) e **Chave privada** (.key) — gerados no portal Inter para autenticação mTLS
3. **Escopo**: `boleto-cobranca.write`, `boleto-cobranca.read`, `pix.write`, `pix.read`
4. **OAuth2**: Token obtido via `POST https://cdpj.partners.bancointer.com.br/oauth/v2/token`

#### Arquitetura proposta:

```text
Frontend (Config)          Supabase DB              Edge Function           Banco Inter
┌──────────────┐    ┌─────────────────────┐    ┌──────────────────┐    ┌──────────────┐
│ Admin salva  │───>│ inter_credentials   │    │ inter-proxy      │    │ API Inter    │
│ credenciais  │    │ (por loja_id)       │<───│                  │───>│ OAuth + mTLS │
│ por loja     │    │ client_id           │    │ 1. Busca creds   │    │              │
│              │    │ client_secret (enc) │    │ 2. Gera token    │    │ /boletos     │
│ Emitir boleto│───>│ certificado (enc)   │    │ 3. Proxy request │<───│ /pix         │
│              │    │ chave_privada (enc) │    │ 4. Retorna resp  │    │ /webhooks    │
└──────────────┘    └─────────────────────┘    └──────────────────┘    └──────────────┘
```

#### Implementação (5 itens):

**1. Tabela `inter_credentials`** (migration)
- `id`, `loja_id` (FK lojas), `client_id`, `client_secret_encrypted`, `certificado_encrypted`, `chave_privada_encrypted`, `ambiente` (sandbox/producao), `escopos`, `webhook_url`, `ativo`, `created_by`, timestamps
- RLS: apenas master/admin da loja pode ler/escrever
- Criptografia via `pgcrypto` usando secret do Vault

**2. Edge Function `inter-proxy`**
- Recebe ações: `emitir-boleto`, `consultar-boleto`, `cancelar-boleto`, `gerar-pix`, `consultar-pix`
- Busca credenciais da loja do usuário autenticado
- Faz OAuth2 token exchange com o Inter
- Proxy da requisição com mTLS (certificado da loja)
- Retorna resposta ao frontend

**3. Edge Function `inter-webhook`** (verify_jwt = false)
- Recebe callbacks do Inter (pagamento confirmado, boleto vencido, etc.)
- Identifica a loja pelo `codigoSolicitacao` ou metadata
- Atualiza status do título no Supabase
- Registra evento na tabela `webhook_events`

**4. Frontend — InterConfigForm por loja**
- Formulario salva credenciais na tabela `inter_credentials` (não mais no zustand/localStorage)
- Upload de certificado .crt e .key (enviados para Edge Function que criptografa e salva)
- Seletor de loja no topo (cada loja tem suas credenciais)
- Botão "Testar Conexão" chama a Edge Function para validar as credenciais

**5. BackendInterAdapter → Edge Function**
- Substituir o stub atual para chamar a Edge Function `inter-proxy`
- Passar `loja_id` em cada request
- Remover mock adapter do fluxo de produção

#### Segurança
- Credenciais **nunca** trafegam em texto puro no frontend — são criptografadas na Edge Function antes de salvar
- Certificados mTLS armazenados criptografados no banco
- RLS garante que cada admin so ve as credenciais das suas lojas
- Tokens OAuth2 com cache curto (5min) na Edge Function

#### Passo a passo para o admin configurar:
1. Acessar o Internet Banking do Inter → API → Criar aplicação
2. Gerar certificado e chave privada
3. Copiar Client ID e Client Secret
4. No sistema: Configurações → Integrações → Banco Inter → Selecionar loja → Colar credenciais + upload certificado
5. Testar conexão → Pronto

---

### Resumo

| Item | Tipo | Escopo |
|------|------|--------|
| Fix visibilidade Master | Bug fix | 1 arquivo frontend |
| Tabela `inter_credentials` | Migration | 1 migration SQL |
| Edge Function `inter-proxy` | Backend | 1 edge function |
| Edge Function `inter-webhook` | Backend | 1 edge function |
| InterConfigForm multi-loja | Frontend | 2 componentes |
| BackendInterAdapter real | Frontend | 1 service |

