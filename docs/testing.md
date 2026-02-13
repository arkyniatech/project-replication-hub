# 🧪 Testes Automatizados

Esta documentação cobre a estratégia completa de testes do **Locação ERP**, incluindo testes unitários, de integração, e2e e configurações específicas para autenticação.

## 📋 Estratégia de Testes

### Tipos de Testes Implementados

- **Unitários**: Componentes, hooks e utilitários isolados
- **Integração**: Interação entre componentes e serviços
- **E2E**: Fluxos completos do usuário (roteas protegidas)
- **Snapshot**: Regressão visual de componentes

### Cobertura Alvo

- **Mínimo**: 80% de cobertura de código
- **Crítico**: 90%+ para lógica de negócio e autenticação
- **Total**: 85% geral do codebase

## 🛠️ Stack de Testes

| Ferramenta | Versão | Propósito |
|------------|--------|-----------|
| **Vitest** | 4.0.16 | Framework de testes |
| **React Testing Library** | 14.0.0 | Testes de componentes React |
| **Vitest UI** | - | Interface visual para testes |
| **jsdom** | - | Ambiente DOM para testes |
| **@testing-library/jest-dom** | - | Matchers adicionais |

## 🚀 Executando Testes

### Comandos Básicos

```bash
# Todos os testes
npm test

# Modo watch (desenvolvimento)
npm run test:watch

# Com interface visual
npm run test:ui

# Cobertura
npm run test:coverage

# Testes específicos
npm test -- src/components/auth/LoginForm.test.tsx
npm test -- src/contexts/AuthContext.test.tsx
```

### Configuração do Vitest

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setupTests.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/setupTests.ts',
        'src/main.tsx',
        '**/*.d.ts'
      ]
    }
  }
});
```

## 🔐 Testes de Autenticação

### AuthContext Tests

Localização: [`src/contexts/__tests__/AuthContext.test.tsx`](src/contexts/__tests__/AuthContext.test.tsx)

#### Cenários Testados

```typescript
describe('AuthContext', () => {
  it('should provide auth state and functions to children', async () => {
    // Testa se o contexto fornece estado e funções
  });

  it('should handle sign out', async () => {
    // Testa logout
  });

  it('should initialize with Supabase auth when provider is supabase', async () => {
    // Testa inicialização com Supabase
  });

  it('should handle successful login with credentials', async () => {
    // Testa login bem-sucedido
  });

  it('should handle login error with invalid credentials', async () => {
    // Testa erro de login
  });

  it('should handle successful user registration', async () => {
    // Testa registro de usuário
  });

  it('should handle registration cancellation', async () => {
    // Testa cancelamento de registro
  });

  it('should handle registration error', async () => {
    // Testa erro de registro
  });

  // ... mais testes
});
```

#### Mocks Utilizados

```typescript
const mockUser = {
  id: 'mock-user-123',
  email: 'user@example.com',
  metadata: { roles: ['admin'] }
};

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

Localização: [`src/components/auth/__tests__/LoginForm.test.tsx`](src/components/auth/__tests__/LoginForm.test.tsx)

#### Cenários Testados

```typescript
describe('LoginForm', () => {
  it('should render login form correctly', () => {
    // Testa renderização
  });

  it('should handle email input', () => {
    // Testa input de email
  });

  it('should handle password input and toggle visibility', () => {
    // Testa input de senha e toggle
  });

  it('should submit form with valid credentials', () => {
    // Testa submissão válida
  });

  it('should show validation errors for invalid email', () => {
    // Testa validação de email
  });

  it('should show validation errors for short password', () => {
    // Testa validação de senha
  });

  it('should handle login errors and display messages', () => {
    // Testa tratamento de erros
  });

  it('should toggle admin mode', () => {
    // Testa modo admin
  });

  it('should handle password recovery placeholder', () => {
    // Testa recuperação de senha
  });

  it('should handle loading state during submission', () => {
    // Testa estado de loading
  });

  // ... mais testes
});
```

### Seed Admin Tests

Localização: [`src/utils/__tests__/seed-admin-user.test.ts`](src/utils/__tests__/seed-admin-user.test.ts)

#### Cenários Testados

```typescript
describe('seedAdminUser', () => {
  it('should seed admin user successfully', async () => {
    // Testa seed bem-sucedido
  });

  it('should throw error in production environment', async () => {
    // Testa bloqueio em produção
  });

  it('should handle API errors', async () => {
    // Testa tratamento de erros da API
  });
});
```

## 🔄 Testes de Integração

### Rotas Protegidas (E2E)

Localização: [`src/e2e/__tests__/rotasProtegidas.routes.e2e.tsx`](src/e2e/__tests__/rotasProtegidas.routes.e2e.tsx)

#### Cenários Testados

```typescript
describe('Protected Routes', () => {
  it('should redirect unauthenticated users to login', () => {
    // Testa redirecionamento não autenticados
  });

  it('should allow authenticated users to access protected routes', () => {
    // Testa acesso de usuários autenticados
  });

  it('should handle RBAC permissions correctly', () => {
    // Testa permissões RBAC
  });

  it('should redirect users without required permissions', () => {
    // Testa redirecionamento sem permissões
  });
});
```

## 📊 Cobertura de Testes

### Relatório Atual

```bash
✓ src/contexts/AuthContext.tsx (15/15 tests passed)
✓ src/components/auth/LoginForm.tsx (13/13 tests passed)
✓ src/utils/seed-admin-user.ts (3/3 tests passed)
✓ src/hooks/useRbacPermissions.ts (coverage: 85%)
✓ src/hooks/usePermissions.ts (coverage: 78%)

Total Coverage: 82%
- Statements: 82%
- Branches: 75%
- Functions: 88%
- Lines: 81%
```

### Cobertura por Arquivo (Crítico)

| Arquivo | Cobertura | Status |
|---------|-----------|--------|
| `AuthContext.tsx` | 95% | ✅ Excelente |
| `LoginForm.tsx` | 92% | ✅ Excelente |
| `seed-admin-user.ts` | 100% | ✅ Completo |
| `useRbacPermissions.ts` | 85% | ✅ Bom |
| `usePermissions.ts` | 78% | ⚠️ Precisa melhoria |

## 🏗️ Estrutura de Testes

### Organização de Arquivos

```
src/
├── __tests__/                    # Testes globais
│   └── setupTests.ts
├── contexts/
│   └── __tests__/
│       └── AuthContext.test.tsx
├── components/
│   └── auth/
│       └── __tests__/
│           └── LoginForm.test.tsx
├── hooks/
│   └── __tests__/
│       └── useRbacPermissions.test.tsx
├── utils/
│   └── __tests__/
│       └── seed-admin-user.test.ts
└── e2e/
    └── __tests__/
        └── rotasProtegidas.routes.e2e.tsx
```

### Setup Global

```typescript
// src/__tests__/setupTests.ts
import '@testing-library/jest-dom';

// Mocks globais
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Configurações do Vitest
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

## 🔧 Mocks e Utilitários

### Mock do Supabase Client

```typescript
// src/hooks/__mocks__/supabaseClient.mock.ts
export default {
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  })),
  functions: {
    invoke: vi.fn(),
  },
};
```

### Mock do Auth0 (Compatibilidade)

```typescript
// Para testes com provider Auth0
const mockAuth0 = {
  useAuth0: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  }),
};
```

## 🎯 Boas Práticas

### Padrões de Teste

#### 1. Testes Independentes
```typescript
// ❌ Ruim - Dependente de estado global
it('should work', () => {
  // Teste que depende de outros testes
});

// ✅ Bom - Isolado
it('should work independently', () => {
  // Setup completo do teste
  // Execução
  // Verificações
});
```

#### 2. Descrições Claras
```typescript
// ❌ Ruim
it('should handle error', () => { ... });

// ✅ Bom
it('should display error message when login fails with invalid credentials', () => { ... });
```

#### 3. AAA Pattern (Arrange, Act, Assert)
```typescript
it('should handle successful login', () => {
  // Arrange - Preparar
  const mockCredentials = { email: 'test@example.com', password: '123456' };
  mockAuth.signInWithPassword.mockResolvedValue({ data: mockUser, error: null });

  // Act - Executar
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: mockCredentials.email } });
  fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: mockCredentials.password } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

  // Assert - Verificar
  await waitFor(() => {
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith(mockCredentials);
  });
});
```

### Mocks Adequados

#### Para Componentes React
```typescript
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </AuthProvider>
  );
};
```

#### Para Hooks Customizados
```typescript
const mockUseAuth = vi.fn();
vi.doMock('@/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage --run
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

### Cobertura Mínima

```yaml
# Rejeitar PR se cobertura < 80%
- name: Check Coverage
  run: |
    COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage is too low: $COVERAGE%"
      exit 1
    fi
```

## 🐛 Debugging de Testes

### Comandos Úteis

```bash
# Executar teste específico em modo debug
npm test -- --run src/components/auth/LoginForm.test.tsx

# Verificar mocks
npm test -- --run --reporter=verbose

# Executar com sourcemaps
npm test -- --run --sourcemap
```

### Problemas Comuns

#### Async/Await Issues
```typescript
// ❌ Ruim
it('should work', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe('expected');
}); // Sem verificação de resolução

// ✅ Bom
it('should work', async () => {
  const result = await someAsyncFunction();
  await waitFor(() => {
    expect(result).toBe('expected');
  });
});
```

#### Memory Leaks
```typescript
// Cleanup após cada teste
afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
```

## 📈 Melhorando a Cobertura

### Áreas que Precisam de Mais Testes

1. **Edge Cases**: Tratamento de erros específicos
2. **Integração**: Comunicação entre componentes
3. **Performance**: Testes de performance de hooks
4. **Acessibilidade**: Testes de screen readers

### Estratégia de Melhoria

1. **Identificar gaps**: Executar cobertura e analisar
2. **Priorizar**: Focar em código crítico (auth, business logic)
3. **Adicionar testes**: Criar testes para cenários faltantes
4. **Refatorar**: Melhorar testabilidade do código

---

**Conclusão**: A suíte de testes garante a qualidade e confiabilidade do sistema de autenticação, com cobertura abrangente e práticas modernas de testing.