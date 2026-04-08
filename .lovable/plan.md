

## Plano: Fluxo Completo de Onboarding (Master → Admin → Loja → Sub-usuários)

### Problema Atual

1. **AdminUserCreate.tsx** — componente morto, simula criação sem chamar nenhuma API
2. **LojasForm.tsx** — cria loja mas não vincula o criador em `user_lojas_permitidas`
3. **Edge Function `create-user`** — só permite roles `admin` e `rh`, ignora `master`; não aceita roles/lojas no body (delega ao frontend, que pode falhar parcialmente)
4. **Sem fluxo Master → Admin** — Master não tem UI dedicada para criar franqueado (admin) com loja vinculada

### Solução

#### 1. Atualizar Edge Function `create-user`

Aceitar campos opcionais `roles` e `lojas_permitidas` no body. Se fornecidos, inserir diretamente no banco (atomicamente, dentro da mesma transação server-side). Adicionar `master` à lista de roles que podem chamar a função.

```
Body aceita: { email, password, username, pessoa_id, roles?, lojas_permitidas?, loja_padrao_id?, ... }
```

Permissão: `master`, `admin`, ou `rh`.

#### 2. Remover `AdminUserCreate.tsx`

Este componente é uma simulação sem funcionalidade real. A tela de criação de usuários já existe funcional em `CriarUsuarioModal.tsx` (chamada a partir de `UsuariosPerfilForm`). Remover o componente e qualquer rota que o referencia.

#### 3. Auto-link na criação de loja (`LojasForm.tsx`)

Após criar a loja com sucesso, inserir automaticamente um registro em `user_lojas_permitidas` vinculando o `auth.uid()` à nova loja. Isso garante que o admin que criou a loja possa vê-la imediatamente.

#### 4. Atualizar `CriarUsuarioModal` — aceitar role `master`

Atualmente a lista `ROLES_DISPONIVEIS` não inclui `master`. Adicionar `master` como opção visível apenas se o usuário logado for master (para que admins não possam criar outros masters).

#### 5. Ajustar RLS da tabela `lojas` para INSERT

Atualmente apenas `admin` pode inserir lojas. Adicionar `master` à policy de INSERT para que o Master possa criar lojas para franqueados.

---

### Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/create-user/index.ts` | Aceitar `roles` + `lojas_permitidas`, permitir `master` |
| `src/components/configuracoes/LojasForm.tsx` | Auto-link `user_lojas_permitidas` após criar loja |
| `src/modules/rh/components/CriarUsuarioModal.tsx` | Adicionar role `master` condicional |
| `src/components/admin/AdminUserCreate.tsx` | Deletar |
| Migration SQL | Atualizar policy INSERT em `lojas` para incluir `master` |

### Detalhes Técnicos

**Edge Function — mudanças no `create-user`:**
- Verificar roles do chamador: `['master', 'admin', 'rh']`
- Após criar user_profile, se `roles` array presente: inserir em `user_roles`
- Se `lojas_permitidas` array presente: inserir em `user_lojas_permitidas`
- Retornar `{ success: true, user_id }` como já faz

**LojasForm — auto-link:**
```ts
// No onSuccess do createMutation:
const { data: { user } } = await supabase.auth.getUser();
if (user && data.id) {
  await supabase.from('user_lojas_permitidas').insert({
    user_id: user.id, loja_id: data.id
  });
}
```

**Migration SQL:**
```sql
DROP POLICY IF EXISTS "Admin pode inserir lojas" ON public.lojas;
CREATE POLICY "Admin e Master podem inserir lojas" ON public.lojas
  FOR INSERT TO authenticated
  WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'));
```

