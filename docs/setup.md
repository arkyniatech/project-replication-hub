# ⚙️ Configuração do Ambiente

Este guia detalha todas as configurações necessárias para instalar e configurar o **Locação ERP** em diferentes ambientes.

## 📋 Pré-requisitos

### Requisitos de Sistema
- **Node.js**: 18.0.0 ou superior
- **npm**: 8.0.0 ou superior (ou yarn/pnpm)
- **Git**: 2.30.0 ou superior
- **Conta Supabase**: [supabase.com](https://supabase.com)

### Dependências de Desenvolvimento
```bash
# Verificar versões instaladas
node --version    # v18+
npm --version     # 8.0+
git --version     # 2.30+
```

## 🚀 Instalação

### 1. Clonagem do Repositório

```bash
git clone https://github.com/seu-usuario/locacao-erp.git
cd locacao-erp
```

### 2. Instalação de Dependências

```bash
# Instalar todas as dependências
npm install

# Verificar instalação
npm list --depth=0
```

### 3. Configuração das Variáveis de Ambiente

#### Arquivo `.env`

Crie o arquivo `.env` na raiz do projeto:

```env
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ===========================================
# AUTHENTICATION CONFIGURATION
# ===========================================
# Provider: 'supabase' ou 'auth0' (padrão: auth0)
VITE_AUTH_PROVIDER=supabase

# Credenciais admin para desenvolvimento
VITE_ADMIN_EMAIL=your-admin-email@example.com
VITE_ADMIN_PASSWORD=your-secure-password

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
VITE_APP_NAME=Locação ERP
VITE_APP_VERSION=0.0.0
VITE_APP_ENV=development

# ===========================================
# OPTIONAL CONFIGURATIONS
# ===========================================
# Logging level: 'debug', 'info', 'warn', 'error'
VITE_LOG_LEVEL=info

# API timeouts (em ms)
VITE_API_TIMEOUT=30000

# Upload limits
VITE_MAX_FILE_SIZE=10485760
VITE_MAX_FILES_COUNT=10
```

#### Como Obter as Chaves do Supabase

1. **Acesse o Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Selecione o Projeto**: Clique no seu projeto
3. **Settings > API**:
   - **URL**: `https://your-project-ref.supabase.co`
   - **anon/public key**: Chave pública para o frontend
   - **service_role key**: Chave secreta (nunca exponha no frontend!)

## 🗄️ Configuração do Supabase

### 1. Criar Projeto

```bash
# Via Supabase CLI (recomendado)
npm install -g supabase
supabase init
supabase start

# Ou via Dashboard
# Acesse https://supabase.com e crie um novo projeto
```

### 2. Configurar Autenticação

#### Habilitar Email/Password Auth
```sql
-- No SQL Editor do Supabase
-- Verificar configurações de auth
SELECT * FROM auth.settings;
```

#### Configurar SMTP (Opcional)
```sql
-- Para emails de confirmação/reset
-- Configure via Dashboard: Authentication > Email Templates
```

### 3. Criar Tabelas e Políticas

Execute os seguintes scripts SQL no painel do Supabase:

#### Tabela de Perfis de Usuário
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  pessoa_id UUID,
  two_fa_enabled BOOLEAN DEFAULT false,
  exige_troca_senha BOOLEAN DEFAULT true,
  loja_padrao_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE USING (auth.uid() = id);
```

#### Tabela de Roles
```sql
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT USING (auth.uid() = user_id);
```

#### Tabela de Lojas Permitidas
```sql
CREATE TABLE IF NOT EXISTS user_lojas_permitidas (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, loja_id)
);

-- RLS
ALTER TABLE user_lojas_permitidas ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own lojas" ON user_lojas_permitidas
FOR SELECT USING (auth.uid() = user_id);
```

### 4. Configurar Edge Functions

#### Estrutura das Funções
```
supabase/
├── functions/
│   ├── seed-admin/
│   │   ├── index.ts
│   │   └── import_map.json
│   ├── create-user/
│   │   ├── index.ts
│   │   └── import_map.json
│   └── migrate-user/
│       ├── index.ts
│       └── import_map.json
```

#### Deploy das Funções
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link do projeto
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy seed-admin
supabase functions deploy create-user
supabase functions deploy migrate-user
```

## 🔧 Configurações Adicionais

### 1. Configurações de RBAC

#### Claims e Permissões
```sql
-- Inserir claims iniciais (opcional)
INSERT INTO rbac_claims (name, description) VALUES
('clientes:view', 'Visualizar clientes'),
('clientes:create', 'Criar clientes'),
('contratos:edit', 'Editar contratos'),
('financeiro.cr:view', 'Visualizar contas a receber'),
('rh:users', 'Gerenciar usuários')
ON CONFLICT (name) DO NOTHING;
```

### 2. Configurações de Organização

#### Dados Iniciais
```sql
-- Inserir loja padrão
INSERT INTO lojas (id, nome, endereco) VALUES
(gen_random_uuid(), 'Matriz', 'Endereço da Matriz')
ON CONFLICT DO NOTHING;
```

### 3. Configurações de Segurança

#### Políticas RLS Adicionais
```sql
-- Exemplo: Políticas para contratos
CREATE POLICY "Users can view contracts in allowed stores" ON contratos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_lojas_permitidas ulp
    WHERE ulp.user_id = auth.uid()
    AND ulp.loja_id = contratos.loja_id
  )
);
```

## 🏃‍♂️ Executando a Aplicação

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Com hot reload
npm run dev -- --host 0.0.0.0 --port 5173
```

### Produção
```bash
# Build
npm run build

# Preview do build
npm run preview

# Ou servir com servidor estático
npm install -g serve
serve -s dist -l 3000
```

## 🧪 Executando Testes

### Todos os Testes
```bash
npm test
```

### Testes Específicos
```bash
# Testes do AuthContext
npm test -- src/contexts/__tests__/AuthContext.test.tsx

# Testes do LoginForm
npm test -- src/components/auth/__tests__/LoginForm.test.tsx

# Testes do Seed Admin
npm test -- src/utils/__tests__/seed-admin-user.test.ts
```

### Cobertura de Testes
```bash
npm run test:coverage
```

## 🔍 Verificação da Instalação

### Checklist de Verificação

- [ ] Node.js e npm instalados corretamente
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` criado com variáveis corretas
- [ ] Projeto Supabase criado e configurado
- [ ] Tabelas criadas no banco de dados
- [ ] Edge Functions deployadas
- [ ] Aplicação inicia sem erros (`npm run dev`)
- [ ] Testes passam (`npm test`)
- [ ] Login admin funciona
- [ ] Seed admin executa com sucesso

### Comandos de Verificação

```bash
# Verificar versões
node --version && npm --version

# Verificar dependências
npm list react supabase

# Verificar variáveis de ambiente
echo $VITE_SUPABASE_URL

# Testar conexão com Supabase
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" $VITE_SUPABASE_URL/rest/v1/
```

## 🐛 Troubleshooting

### Problemas Comuns

#### Erro: "Cannot resolve dependency"
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

#### Erro: "Supabase connection failed"
- Verificar `VITE_SUPABASE_URL`
- Confirmar chaves da API
- Verificar CORS no Supabase Dashboard

#### Erro: "Auth provider not configured"
- Definir `VITE_AUTH_PROVIDER=supabase`
- Ou manter padrão `auth0` para compatibilidade

#### Erro no Seed Admin
```bash
# Verificar se está em ambiente de desenvolvimento
echo $NODE_ENV  # deve ser 'development'

# Verificar função Edge Function
supabase functions logs seed-admin
```

### Logs Úteis

```bash
# Logs da aplicação
npm run dev  # Ver console do navegador

# Logs do Supabase
supabase logs

# Logs das Edge Functions
supabase functions logs <function-name>
```

## 📞 Suporte

Para problemas específicos:

1. **Verificar documentação**: [`docs/index.md`](index.md)
2. **Consultar issues**: Verifique issues similares no repositório
3. **Criar issue**: Descreva o problema com logs e passos para reproduzir

---

**Próximos passos**: Após configurar o ambiente, consulte [Sistema de Autenticação](authentication.md) para configurar usuários e permissões.