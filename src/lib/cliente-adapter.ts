import type { Database } from '@/integrations/supabase/types';
import type { Cliente } from '@/types';

type SupabaseCliente = Database['public']['Tables']['clientes']['Row'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida se o valor tem forma de uuid — o que as colunas `*_id` do Postgres
 * exigem. Ids locais gerados com `Date.now()` reprovam aqui.
 */
export function isUuid(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && UUID_RE.test(valor);
}

/**
 * Reconcilia o cliente montado no formulário com a linha que o banco gravou.
 *
 * O id local é provisório (o banco gera o definitivo via `gen_random_uuid()`).
 * Devolver o objeto local sem essa reconciliação vaza um id não-uuid para quem
 * chamou — e o próximo insert que usar esse id como FK falha com 22P02.
 *
 * O merge (local primeiro, banco por cima) é proposital: campos que existem
 * só em memória — `politicaComercial` e `aplicarPoliticaAuto` não têm coluna
 * em `clientes` — precisam sobreviver, senão o wizard perde o desconto da
 * política ao calcular o total (NovoContratoV2 ~l.357). O que vem do banco
 * vence nos campos que ele é dono (id, timestamps).
 */
export function resolverClientePersistido(
  clienteLocal: Cliente,
  linhaSalva: SupabaseCliente | null | undefined
): Cliente {
  if (!linhaSalva) return clienteLocal;
  return { ...clienteLocal, ...supabaseClienteToLegacy(linhaSalva) };
}

/**
 * Converte um cliente do Supabase para o formato legacy esperado pelo ClienteForm
 */
export function supabaseClienteToLegacy(supaCliente: SupabaseCliente): Cliente {
  const contatos = (supaCliente.contatos as any[] | null) || [];
  const endereco = (supaCliente.endereco as any) || {};
  const anexos = (supaCliente.anexos as any[] | null) || [];

  // Campo unificado: nome para PF, razão social para PJ
  const nomeRazao = supaCliente.tipo === 'PF' 
    ? supaCliente.nome || '' 
    : supaCliente.razao_social || '';

  // Documento unificado
  const documento = supaCliente.tipo === 'PF'
    ? supaCliente.cpf || ''
    : supaCliente.cnpj || '';

  // Email e telefone principais dos contatos
  const email = contatos.find((c: any) => c.tipo === 'Email')?.valor || '';
  const telefone = contatos.find((c: any) => c.tipo === 'Telefone' || c.tipo === 'WhatsApp')?.valor || '';

  return {
    id: supaCliente.id,
    lojaId: supaCliente.loja_id,
    tipo: supaCliente.tipo as 'PF' | 'PJ',
    
    // Campos PF
    nome: supaCliente.nome || undefined,
    cpf: supaCliente.cpf || undefined,
    rg: supaCliente.rg || undefined,
    dataNascimento: supaCliente.data_nascimento || undefined,
    responsavel: undefined,
    
    // Campos PJ
    razaoSocial: supaCliente.razao_social || undefined,
    nomeFantasia: supaCliente.nome_fantasia || undefined,
    cnpj: supaCliente.cnpj || undefined,
    inscricaoEstadual: supaCliente.inscricao_estadual || undefined,
    isentoIE: supaCliente.isento_ie || false,
    
    // Campos unificados
    nomeRazao,
    documento,
    email,
    telefone,
    contatos,
    endereco: {
      cep: endereco.cep || '',
      logradouro: endereco.logradouro || '',
      numero: endereco.numero || '',
      complemento: endereco.complemento || '',
      bairro: endereco.bairro || '',
      cidade: endereco.cidade || '',
      uf: endereco.uf || '',
      pais: endereco.pais || 'Brasil',
    },
    
    obras: [],
    status: supaCliente.status_credito === 'ATIVO' ? 'ATIVO' : 
            supaCliente.status_credito === 'SUSPENSO' ? 'SUSPENSO' : 'EM_ANALISE',
    statusCredito: supaCliente.status_credito === 'ATIVO' ? 'Ativo' : 
                   supaCliente.status_credito === 'SUSPENSO' ? 'Suspenso' : 'Em análise',
    inadimplente: supaCliente.inadimplente || false,
    observacoes: supaCliente.observacoes || undefined,
    anexos,
    lgpdAceito: supaCliente.aceite_lgpd || false,
    createdAt: supaCliente.created_at,
    updatedAt: supaCliente.updated_at,

    // Campos novos lidos do banco (não fazem parte do tipo Cliente legado)
    ...({
      diaVencimentoPadrao: (supaCliente as any).dia_vencimento_padrao ?? null,
      negociacaoPontual: (supaCliente as any).negociacao_pontual ?? null,
    } as any),

    auditoria: {
      criadoPor: supaCliente.created_by || 'sistema',
      criadoEm: supaCliente.created_at,
      atualizadoEm: supaCliente.updated_at,
    },
  };
}

/**
 * Converte um cliente do formato legacy para o formato Supabase
 */
export function legacyClienteToSupabase(cliente: Cliente): Database['public']['Tables']['clientes']['Insert'] {
  return {
    loja_id: cliente.lojaId,
    tipo: cliente.tipo,
    
    // Campos PF
    nome: cliente.nome || null,
    cpf: cliente.cpf || null,
    rg: cliente.rg || null,
    data_nascimento: cliente.dataNascimento || null,
    
    // Campos PJ
    razao_social: cliente.razaoSocial || null,
    nome_fantasia: cliente.nomeFantasia || null,
    cnpj: cliente.cnpj || null,
    inscricao_estadual: cliente.inscricaoEstadual || null,
    isento_ie: cliente.isentoIE || false,
    
    // Campos unificados
    contatos: cliente.contatos as any,
    endereco: cliente.endereco as any,
    status_credito: cliente.status === 'ATIVO' ? 'ATIVO' : 
                    cliente.status === 'SUSPENSO' ? 'SUSPENSO' : 'EM_ANALISE',
    inadimplente: cliente.inadimplente || false,
    observacoes: cliente.observacoes || null,
    anexos: cliente.anexos as any,
    aceite_lgpd: cliente.lgpdAceito || false,
    data_aceite_lgpd: cliente.lgpdAceito ? new Date().toISOString() : null,
    contato_principal_id: cliente.contatos.find(c => c.principal)?.id || null,
    // Campos novos: dia de vencimento padrão e negociação pontual
    dia_vencimento_padrao: (cliente as any).diaVencimentoPadrao ?? null,
    negociacao_pontual: (cliente as any).negociacaoPontual ?? null,
    ativo: true,
  };
}
