# Sistema de Autenticação - Migração Auth0 para Supabase Auth

## 📋 Visão Geral

Este documento descreve a migração do sistema de autenticação de Auth0 para Supabase Auth, incluindo todas as mudanças implementadas, configurações necessárias e guias de uso.

## 🔄 Migração de Auth0 para Supabase Auth

### Fluxos de Autenticação

O sistema mantém compatibilidade com ambos os provedores através de uma configuração dinâmica:

- **Provider Padrão**: Auth0 (para transição suave)
- **Novo Provider**: Supabase Auth (recomendado)

#### Configuração do Provider

```typescript
// Em .env ou variáveis de ambiente
VITE_AUTH_PROVIDER=supabase  // ou 'auth0'
```

### Compatibilidade

- **RBAC Mantido**: Sistema de controle de acesso baseado em roles permanece funcional
- **Sessões**: Gerenciamento de sessão adaptado para ambos os providers
- **Logs**: Auditoria de login/logout mantida
- **UI**: Interface de login compatível com ambos os sistemas

#### Mapeamento de Usuários Auth0 → Supabase

```typescript
// AuthContext.tsx - Compatibilidade Auth0
const mappedUser: any = {
  id: auth0User.sub,  // 'sub' → 'id'
  email: auth0User.email,
  app_metadata: {},
  user_metadata: {
    nome: auth0User.name,
    picture: auth0User.picture,
  },
  aud: 'authenticated',
  created_at: auth0User.updated_at || new Date().toISOString(),
};
```

## 🔐 Novo Sistema de Login/Registro

### Componente LoginForm

Localização: [`src/components/auth/LoginForm.tsx`](src/components/auth/LoginForm.tsx:1)

#### Funcionalidades

- **Modo Usuário**: Login com email/senha
- **Modo Admin**: Acesso administrativo com credenciais específicas
- **Validação**: Zod schema com regras de validação
- **Tratamento de Erros**: Mensagens específicas por tipo de erro
- **Recuperação de Senha**: Placeholder para funcionalidade futura

#### Validação de Dados

```typescript
const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});
```

#### Modos de Acesso

1. **Modo Usuário Padrão**:
   - Login com credenciais Supabase
   - Validação de email e senha
   - Tratamento de erros específicos

2. **Modo Administrativo**:
   - Credenciais definidas em variáveis de ambiente
   - Acesso restrito para administradores
   - Validação adicional de segurança

#### Tratamento de Erros

- `Invalid login credentials`: "Email ou senha incorretos"
- `network`: "Erro de conexão. Verifique sua internet."
- `already registered`: "Este e-mail já está cadastrado"
- Erros genéricos com fallback

### Credenciais Administrativas

```env
VITE_ADMIN_EMAIL=your-admin-email@example.com
VITE_ADMIN_PASSWORD=your-secure-password
```

## 👥 Criação de Usuários Reais

### Componente AdminUserCreate

Localização: [`src/modules/rh/components/CriarUsuarioModal.tsx`](src/modules/rh/components/CriarUsuarioModal.tsx:1)

#### Funcionalidades

- **Geração Automática de Senha**: Senhas seguras de 22 caracteres (16 bytes base64)
- **Sugestão de Roles**: Baseada no cargo do colaborador
- **Validação Completa**: Email, username, roles e lojas obrigatórios
- **Integração com Edge Functions**: Criação segura via Supabase Functions
- **Auditoria**: Logs completos de criação de usuário

#### Geração de Username

```typescript
function gerarUsername(nomeCompleto: string): string {
  const partes = nomeCompleto.toLowerCase().trim().split(' ');
  return partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;
}
```

#### Geração de Senha Segura

```typescript
function gerarSenhaSegura(): string {
  const senhaAleatoria = crypto.randomBytes(16).toString('base64');
  return senhaAleatoria; // 22 caracteres
}
```

#### Roles Disponíveis

```typescript
const ROLES_DISPONIVEIS = [
  'admin', 'gerente', 'rh', 'financeiro',
  'vendedor', 'operacao', 'motorista', 'mecanico', 'user'
];
```

#### Mapeamento Cargo → Role

```typescript
const CARGO_TO_ROLE = {
  'motorista': 'motorista',
  'vendedor': 'vendedor',
  'mecânico': 'mecanico',
  'gerente': 'gerente',
  'financeiro': 'financeiro',
};
```

#### Processo de Criação

1. **Validações**: Email, username, roles e lojas
2. **Geração de Senha**: Automática e segura
3. **Criação via Edge Function**: `create-user`
4. **Perfil do Usuário**: Criado automaticamente na função
5. **Roles**: Adicionadas via `addRoles`
6. **Lojas**: Permissões configuradas via `addLojas`
7. **Auditoria**: Log completo da operação

### Edge Function: create-user

```typescript
// Chamada da função
const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
  body: {
    email: `${email}@empresa.com`,
    password: senhaGerada,
    username: username,
    pessoa_id: pessoa.id,
    two_fa_enabled: twoFA,
    exige_troca_senha: exigeTrocaSenha,
    loja_padrao_id: lojaPadrao || null,
  },
});
```

## 🌱 Seed do Usuário Admin

### Script de Seed

Localização: [`src/utils/seed-admin-user.ts`](src/utils/seed-admin-user.ts:1)

#### Funcionalidades

- **Ambiente de Desenvolvimento**: Só executa em modo dev
- **Edge Function**: `seed-admin`
- **Credenciais Padrão**:
  - Email: `admin@locacaoerp.com`
  - Senha: `Admin123!@#`
  - Role: `admin`

#### Processo de Seed

```typescript
export const seedAdminUser = async () => {
  // Verifica ambiente de desenvolvimento
  if (import.meta.env.PROD) {
    throw new Error("Seed do admin só pode ser executado em ambiente de desenvolvimento");
  }

  // Chama Edge Function
  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/seed-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (data.success) {
    console.log(`👤 User ID: ${data.user_id}`);
    console.log(`📧 Email: ${data.email}`);
    console.log(`🔑 Role: ${data.role}`);
    console.log("🔒 Senha: your-secure-admin-password");
  }
};
```

### Execução do Seed

```bash
# Via script npm (se configurado)
npm run seed:admin

# Ou diretamente no código
import { seedAdminUser } from '@/utils/seed-admin-user';
await seedAdminUser();
```

## 🔒 Sistema RBAC Mantido

### Hooks de Permissões

#### useRbacPermissions

Localização: [`src/hooks/useRbacPermissions.ts`](src/hooks/useRbacPermissions.ts:1)

- **Integração com Supabase**: Busca lojas permitidas do usuário
- **Compatibilidade**: Mantém interface existente
- **Verificações Específicas**: Métodos helper para permissões comuns

#### usePermissionChecks

- **Legacy Support**: Compatibilidade com sistema antigo
- **Domain-specific**: Permissões por módulo (clientes, contratos, etc.)
- **Performance**: Cache otimizado com React Query

### Estrutura de Claims

```typescript
// Exemplo de claims ativas
[
  "clientes:view",
  "clientes:create",
  "contratos:edit",
  "financeiro.cr:view",
  "rh:users"
]
```

### Verificações de Permissões

```typescript
const { can, canAny, canAll } = useRbacPermissions();

// Verificações simples
if (can('clientes:create')) {
  // Pode criar clientes
}

// Múltiplas permissões
if (canAny(['admin', 'gerente'])) {
  // É admin ou gerente
}

// Todas as permissões necessárias
if (canAll(['financeiro:view', 'financeiro:edit'])) {
  // Pode ver e editar financeiro
}
```

## 🔄 Migração de Usuários Existentes

### Estratégia de Migração

A migração de usuários Auth0 para Supabase deve ser feita de forma gradual e controlada, especialmente em produção.

#### Pré-requisitos para Migração

1. **Backup completo** dos dados Auth0
2. **Ambiente de staging** para testes
3. **Comunicação** com usuários sobre mudança
4. **Plano de rollback** em caso de problemas

### Processo de Migração

#### 1. Exportar Dados Auth0

```bash
# Script para exportar usuários Auth0
# (Implementar via Management API do Auth0)
const exportAuth0Users = async () => {
  const users = await auth0.management.users.getAll();
  return users.map(user => ({
    email: user.email,
    name: user.name,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
    created_at: user.created_at,
    last_login: user.last_login,
  }));
};
```

#### 2. Mapeamento de Dados

```typescript
// Função de mapeamento Auth0 → Supabase
const mapAuth0ToSupabase = (auth0User: any) => ({
  email: auth0User.email,
  password: null, // Usuários precisarão resetar senha
  user_metadata: {
    nome: auth0User.name,
    auth0_id: auth0User.user_id,
    migrated_at: new Date().toISOString(),
  },
  app_metadata: {
    roles: auth0User.app_metadata?.roles || ['user'],
    lojas: auth0User.app_metadata?.lojas || [],
  },
});
```

#### 3. Migração em Lotes

```typescript
// Script de migração
const migrateUsers = async () => {
  const auth0Users = await exportAuth0Users();
  const supabaseUsers = auth0Users.map(mapAuth0ToSupabase);

  console.log(`Migrating ${supabaseUsers.length} users...`);

  for (const user of supabaseUsers) {
    try {
      await supabase.functions.invoke('migrate-user', {
        body: user
      });
      console.log(`✅ Migrated: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate: ${user.email}`, error);
    }
  }
};
```

#### 4. Edge Function: migrate-user

```typescript
// supabase/functions/migrate-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { email, password, user_metadata, app_metadata } = await req.json();

  // Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(), // Senha temporária
    user_metadata,
    app_metadata,
  });

  if (authError) throw authError;

  // Criar perfil
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      username: email.split('@')[0],
      exige_troca_senha: true,
    });

  if (profileError) throw profileError;

  // Adicionar roles
  if (app_metadata.roles) {
    const roles = app_metadata.roles.map((role: string) => ({
      user_id: authData.user.id,
      role,
    }));

    const { error: rolesError } = await supabase
      .from('user_roles')
      .insert(roles);

    if (rolesError) throw rolesError;
  }

  return new Response(JSON.stringify({
    success: true,
    user_id: authData.user.id,
    email: authData.user.email,
  }), { status: 200 });
});
```

### Comunicação com Usuários

#### Template de Email

```html
Assunto: Atualização do Sistema de Login - Ação Necessária

Prezado(a) [Nome],

Informamos que o sistema de autenticação do Locação ERP foi atualizado para uma plataforma mais segura.

**O que mudou:**
- Novo sistema de login via Supabase
- Senhas foram resetadas por segurança
- Mesmo email, nova senha necessária

**Como proceder:**
1. Acesse: https://app.locacaoerp.com
2. Clique em "Esqueci minha senha"
3. Siga as instruções por email
4. Defina uma nova senha segura

**Prazo:** Você tem 30 dias para atualizar sua senha.

Atenciosamente,
Equipe Locação ERP
```

### Plano de Contingência

#### Rollback Strategy

1. **Manter Auth0 ativo** durante período de transição
2. **Variável de ambiente** para voltar ao provider antigo:
   ```env
   VITE_AUTH_PROVIDER=auth0  # Temporário
   ```
3. **Script de rollback** se necessário

#### Monitoramento Pós-Migração

```sql
-- Queries de monitoramento
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN raw_user_meta_data->>'migrated_at' IS NOT NULL THEN 1 END) as migrated_users,
  COUNT(CASE WHEN last_sign_in_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_week
FROM auth.users;

-- Usuários com problemas de login
SELECT email, last_sign_in_at, raw_user_meta_data
FROM auth.users
WHERE last_sign_in_at IS NULL
  AND created_at < NOW() - INTERVAL '1 day';
```

### Timeline Sugerida

- **Dia 0**: Backup completo, comunicação inicial
- **Dia 1-7**: Migração em staging, testes
- **Dia 8-14**: Migração gradual em produção (10% por dia)
- **Dia 15**: Migração completa, Auth0 desabilitado
- **Dia 16-30**: Suporte e monitoramento
- **Dia 31**: Cleanup e finalização

### Considerações Especiais

#### Usuários Inativos
- Usuários sem login nos últimos 6 meses podem ser migrados por último
- Ou notificados separadamente

#### Usuários com 2FA
- 2FA do Auth0 será desabilitado
- Novo 2FA via Supabase deve ser reconfigurado

#### Integrações Externas
- Verificar APIs que usam tokens Auth0
- Atualizar webhooks e integrações

## 🧪 Testes Automatizados

### AuthContext Tests

Localização: [`src/contexts/__tests__/AuthContext.test.tsx`](src/contexts/__tests__/AuthContext.test.tsx:1)

#### Cenários Testados

- **Provider Supabase**: Inicialização e sessão
- **Login com Credenciais**: Sucesso e erro
- **Registro de Usuário**: Fluxo completo
- **Logout**: Limpeza de sessão
- **Estado de Autenticação**: Reatividade

#### Mocks Utilizados

```typescript
const mockAuth = {
  getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } } }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: () => {} } }
  })
};
```

### LoginForm Tests

Localização: [`src/components/auth/__tests__/LoginForm.test.tsx`](src/components/auth/__tests__/LoginForm.test.tsx:1)

#### Cenários Testados

- **Renderização**: Componente renderiza corretamente
- **Validação**: Campos obrigatórios e formatos
- **Login Sucesso**: Fluxo normal de login
- **Login Erro**: Tratamento de erros diversos
- **Modo Admin**: Toggle e validação
- **Recuperação de Senha**: Placeholder funcional
- **Loading States**: Estados de carregamento

### Seed Admin Tests

Localização: [`src/utils/__tests__/seed-admin-user.test.ts`](src/utils/__tests__/seed-admin-user.test.ts:1)

#### Cenários Testados

- **Ambiente de Produção**: Bloqueio em prod
- **Chamada da Edge Function**: Request correto
- **Sucesso**: Logs e retorno adequado
- **Erro**: Tratamento de falhas

## 🔄 Migração de Usuários Existentes

### Estratégia de Migração

1. **Backup**: Exportar usuários Auth0
2. **Mapeamento**: Converter dados para formato Supabase
3. **Criação em Lote**: Usar Edge Functions para bulk insert
4. **Validação**: Verificar integridade dos dados
5. **Rollback**: Plano de contingência

### Script de Migração (Conceitual)

```typescript
// migrate-users.ts
const migrateUsers = async () => {
  // 1. Buscar usuários Auth0
  const auth0Users = await getAuth0Users();

  // 2. Mapear para formato Supabase
  const supabaseUsers = auth0Users.map(mapAuth0ToSupabase);

  // 3. Criar usuários via Edge Function
  for (const user of supabaseUsers) {
    await supabase.functions.invoke('migrate-user', {
      body: user
    });
  }

  // 4. Migrar roles e permissões
  await migrateRolesAndPermissions(auth0Users, supabaseUsers);
};
```

### Considerações

- **Senhas**: Usuários precisarão resetar senhas
- **Tokens**: Invalidar tokens Auth0 após migração
- **Sessões**: Forçar logout durante migração
- **Comunicação**: Notificar usuários sobre mudança

## ⚙️ Configurações Necessárias

### Variáveis de Ambiente (.env)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth Provider (opcional)
VITE_AUTH_PROVIDER=supabase

# Admin Credentials (opcional)
VITE_ADMIN_EMAIL=your-admin-email@example.com
VITE_ADMIN_PASSWORD=your-secure-password
```

### Supabase Setup

#### 1. Criar Projeto
```bash
# Via CLI ou dashboard
supabase init
supabase start
```

#### 2. Configurar Autenticação
```sql
-- Habilitar RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Políticas de exemplo
CREATE POLICY "Users can view own profile"
ON auth.users FOR SELECT
USING (auth.uid() = id);
```

#### 3. Edge Functions

Criar funções em `supabase/functions/`:

- `seed-admin`: Cria usuário admin inicial
- `create-user`: Cria usuários regulares
- `migrate-user`: Migração de usuários Auth0

#### 4. Tabelas Customizadas

```sql
-- Perfis de usuário
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  pessoa_id UUID,
  two_fa_enabled BOOLEAN DEFAULT false,
  exige_troca_senha BOOLEAN DEFAULT true,
  loja_padrao_id UUID
);

-- Roles do usuário
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, role)
);

-- Lojas permitidas
CREATE TABLE user_lojas_permitidas (
  user_id UUID REFERENCES auth.users(id),
  loja_id UUID NOT NULL,
  PRIMARY KEY (user_id, loja_id)
);
```

## 👨‍💼 Guia de Uso para Administradores

### Primeiro Acesso

1. **Configurar Ambiente**:
   ```bash
   cp .env.example .env
   # Editar .env com credenciais Supabase
   ```

2. **Executar Seed Admin**:
   ```bash
   npm run dev
   # No console do navegador ou via script
   await seedAdminUser();
   ```

3. **Login Administrativo**:
   - Email: `your-admin-email@example.com`
   - Senha: `your-secure-admin-password`

### Gerenciamento de Usuários

1. **Acessar Módulo RH**:
   - Navegar para "RH" > "Pessoas"
   - Selecionar colaborador

2. **Criar Acesso**:
   - Clicar "Criar Acesso ao Sistema"
   - Preencher dados (gerados automaticamente)
   - Selecionar roles e lojas
   - Confirmar criação

3. **Gerenciar Permissões**:
   - Roles: admin, gerente, rh, financeiro, etc.
   - Lojas: Definir acesso por filial
   - Segurança: 2FA e troca obrigatória de senha

### Monitoramento

1. **Logs de Auditoria**:
   ```sql
   SELECT * FROM audit_logs
   WHERE action IN ('USER_CREATED', 'LOGIN', 'LOGOUT')
   ORDER BY created_at DESC;
   ```

2. **Usuários Ativos**:
   ```sql
   SELECT
     up.username,
     au.email,
     array_agg(ur.role) as roles,
     au.last_sign_in_at
   FROM user_profiles up
   JOIN auth.users au ON up.id = au.id
   LEFT JOIN user_roles ur ON up.id = ur.user_id
   GROUP BY up.id, au.email, au.last_sign_in_at;
   ```

### Troubleshooting

#### Problemas Comuns

1. **Login falha**:
   - Verificar credenciais
   - Confirmar provider (VITE_AUTH_PROVIDER)
   - Verificar Edge Functions

2. **Permissões não funcionam**:
   - Verificar roles do usuário
   - Confirmar RLS policies
   - Limpar cache do navegador

3. **Seed admin falha**:
   - Ambiente deve ser desenvolvimento
   - Verificar Edge Function `seed-admin`
   - Logs no console do navegador

#### Suporte

- **Logs**: Verificar console do navegador
- **Network**: Inspeccionar requests para Supabase
- **Database**: Consultar tabelas diretamente no Supabase Dashboard

---

## 📝 Conclusão

A migração para Supabase Auth moderniza o sistema de autenticação, mantendo compatibilidade com o RBAC existente e oferecendo melhor controle sobre usuários e permissões. O sistema é escalável, seguro e preparado para futuras expansões.