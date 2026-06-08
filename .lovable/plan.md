## Opção B — Permitir e-mail completo no cadastro de usuário

Alterar o `CriarUsuarioModal.tsx` para aceitar o e-mail **completo** digitado pelo RH/Admin, mantendo retrocompatibilidade quando ele digitar só o "primeironome.sobrenome".

### Comportamento

1. Campo "E-mail" passa a aceitar:
   - **E-mail completo** (contém `@`): usa exatamente o que foi digitado (ex.: `aguasdelindoia@locaacao.com.br`).
   - **Só o usuário** (sem `@`): aplica o domínio padrão `@locacaoerp.com` (comportamento atual, sem quebrar nada).

2. Validação client-side antes de enviar:
   - Trim + lowercase no valor final.
   - Regex de e-mail (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) → toast "E-mail inválido" se falhar.
   - Bloqueia duplo `@` (ex.: `nome@x.com` + sufixo) já naturalmente por não concatenar mais quando houver `@`.

3. UI:
   - Placeholder muda para `nome@dominio.com.br ou primeironome.sobrenome`.
   - Texto auxiliar dinâmico:
     - Se contém `@`: mostra "Será usado: `{email}`".
     - Se não: mostra "Será usado: `{email}@locacaoerp.com`".

4. Log de auditoria (`logAction USER_CREATED`) registra o e-mail final efetivamente enviado.

### Arquivos alterados

- `src/modules/rh/components/CriarUsuarioModal.tsx`
  - Adicionar helper `montarEmailFinal(input)` que retorna o e-mail completo.
  - Trocar as duas ocorrências de ``${email}@locacaoerp.com`` (linhas ~192 e ~210) pelo resultado de `montarEmailFinal`.
  - Atualizar legenda (linha ~385) para a versão dinâmica.
  - Atualizar placeholder do `Input` de e-mail.
  - Adicionar validação de formato antes do `supabase.functions.invoke('create-user', ...)`.

### Fora de escopo

- Sem mudanças na edge function `create-user` (ela já valida o e-mail no Supabase Auth).
- Sem mudanças no fluxo de senha, roles, lojas ou 2FA.
- Sem migrar usuários já criados.

### Teste manual depois

- Criar usuário com `aguasdelindoia@locaacao.com.br` → deve gravar exatamente esse e-mail.
- Criar usuário digitando só `joao.silva` → deve virar `joao.silva@locacaoerp.com`.
- Digitar `foo@bar` (inválido) → toast de erro, sem chamada à edge function.
