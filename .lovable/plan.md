

# Diagnóstico: Dois problemas bloqueando a criação de contrato

## Problema 1: Loop infinito de re-renders em `NovoContratoV2.tsx`

O `useEffect` na linha 332 escuta `contrato.itens`, `contrato.cliente` e `contrato.taxaDeslocamento` como dependências, mas dentro dele chama `setContrato(prev => ({ ...prev, valorTotal: ... }))`. Isso muda o objeto `contrato`, que por sua vez pode disparar o efeito novamente, causando o loop infinito "Maximum update depth exceeded".

**Correção**: Separar o `valorTotal` em um estado independente (ex: `const [valorTotal, setValorTotal] = useState(0)`) ou usar referências estáveis nas dependências para evitar que o `setContrato` dentro do efeito re-dispare ele mesmo. A abordagem mais simples é calcular `valorTotal` como valor derivado (useMemo) ao invés de armazenar no estado `contrato`.

## Problema 2: RLS bloqueando criação de obra (`42501`)

A policy de INSERT na tabela `obras` exige roles `vendedor`, `gestor` ou `admin`. O usuário logado aparentemente não tem nenhuma dessas roles, ou a `loja_id` enviada não está na lista de lojas permitidas (`user_lojas_permitidas`). Preciso verificar se o `created_by` ou `loja_id` estão sendo passados corretamente na mutação.

**Correção**: Garantir que o objeto enviado ao insert inclui `loja_id` correspondente a uma loja permitida do usuário. Se o problema for de role, o usuário precisa ter uma role válida atribuída.

## Plano de implementação

1. **Corrigir loop infinito**: Refatorar o `useEffect` de cálculo de total (linhas 332-380) para usar `useMemo` ou separar `valorTotal` do estado `contrato`, eliminando a dependência circular.

2. **Corrigir criação de obra**: Verificar o payload sendo enviado na mutação `createObra` e garantir que `loja_id` está presente e válido. Adicionar `is_master` à policy de INSERT se necessário (o `is_master` está na policy de outras tabelas mas falta na de obras).

