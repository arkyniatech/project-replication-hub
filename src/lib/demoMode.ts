import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const DEMO_EMAIL = 'teste@teste.com';
export const DEMO_PASSWORD = 'teste123';

let patched = false;
let originals: {
  from?: typeof supabase.from;
  invoke?: typeof supabase.functions.invoke;
  storageFrom?: typeof supabase.storage.from;
} = {};

function demoToast(label: string) {
  toast({
    title: 'Modo Demonstração',
    description: `${label} bloqueado — nada é gravado no banco.`,
    duration: 2200,
  });
}

/** A thenable that mimics the PostgrestBuilder API for any chained call. */
function makeNoopBuilder(label: string): any {
  const result = { data: null, error: null, count: 0, status: 200, statusText: 'OK' };
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: any) => {
          demoToast(label);
          return Promise.resolve(result).then(resolve);
        };
      }
      if (prop === 'catch' || prop === 'finally') {
        return (cb: any) => Promise.resolve(result)[prop as 'catch'](cb);
      }
      // any chained method returns the same proxy
      return () => proxy;
    },
  };
  const proxy: any = new Proxy(function () {}, handler);
  return proxy;
}

export function enableDemoMode() {
  if (patched) return;
  patched = true;

  // Patch .from() — block insert/update/delete/upsert, keep select intact
  originals.from = supabase.from.bind(supabase);
  (supabase as any).from = (table: string) => {
    const builder: any = originals.from!(table as any);
    const wrap = (op: string) => () => makeNoopBuilder(`${op} em ${table}`);
    builder.insert = wrap('Inserir');
    builder.update = wrap('Atualizar');
    builder.delete = wrap('Excluir');
    builder.upsert = wrap('Salvar');
    return builder;
  };

  // Patch functions.invoke — block all edge function calls except read-only ones
  originals.invoke = supabase.functions.invoke.bind(supabase.functions);
  const READONLY_FUNCS = new Set(['setup-demo-user']);
  (supabase.functions as any).invoke = async (name: string, opts?: any) => {
    if (READONLY_FUNCS.has(name)) return originals.invoke!(name, opts);
    demoToast(`Função "${name}"`);
    return { data: null, error: null };
  };

  // Patch storage uploads/removes
  originals.storageFrom = supabase.storage.from.bind(supabase.storage);
  (supabase.storage as any).from = (bucket: string) => {
    const b: any = originals.storageFrom!(bucket);
    const blocked = (op: string) => async () => {
      demoToast(`Storage ${op} (${bucket})`);
      return { data: null, error: null };
    };
    b.upload = blocked('upload');
    b.update = blocked('update');
    b.remove = blocked('remove');
    b.move = blocked('move');
    b.copy = blocked('copy');
    return b;
  };
}

export function disableDemoMode() {
  if (!patched) return;
  if (originals.from) (supabase as any).from = originals.from;
  if (originals.invoke) (supabase.functions as any).invoke = originals.invoke;
  if (originals.storageFrom) (supabase.storage as any).from = originals.storageFrom;
  originals = {};
  patched = false;
}

export function isDemoEmail(email?: string | null) {
  return !!email && email.toLowerCase() === DEMO_EMAIL;
}
