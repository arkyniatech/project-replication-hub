import { describe, it, expect } from 'vitest';
import { resolverClientePersistido, isUuid } from '@/lib/cliente-adapter';
import type { Cliente } from '@/types';
import type { Database } from '@/integrations/supabase/types';

type LinhaCliente = Database['public']['Tables']['clientes']['Row'];

/**
 * RELAY 32 — item 6.1
 *
 * O ClienteForm montava o objeto local com `id: Date.now().toString()` e, no
 * onSuccess do insert, devolvia ESSE objeto ao chamador — descartando o UUID
 * que o banco gerou. O wizard de contrato guardava o timestamp em `clienteId`
 * e o insert em `contratos.cliente_id uuid` explodia com:
 *
 *   invalid input syntax for type uuid: "1786986034281" [22P02]
 *
 * Invariante: o cliente devolvido após a criação SEMPRE carrega o id do banco.
 */

const linhaDoBanco = {
  id: '2acb9e68-5c7e-4ef6-bbe2-731ab79edb75',
  loja_id: 'cc51b7f2-79c5-4f46-adf5-86c891b1e01a',
  tipo: 'PF',
  nome: 'QA Contrato Wizard',
  cpf: '111.444.777-35',
  razao_social: null,
  cnpj: null,
  rg: null,
  data_nascimento: '1990-01-01',
  contatos: [{ tipo: 'WhatsApp', valor: '(19) 99999-0001', principal: true }],
  endereco: { logradouro: 'Rua QA Teste', numero: '100', cidade: 'Aguas de Lindoia', uf: 'SP' },
  anexos: [],
  status: 'EM_ANALISE',
  created_at: '2026-08-17T16:00:00.000Z',
  updated_at: '2026-08-17T16:00:00.000Z',
} as unknown as LinhaCliente;

const clienteLocalComTimestamp: Cliente = {
  id: '1786986034281',
  lojaId: 'cc51b7f2-79c5-4f46-adf5-86c891b1e01a',
  tipo: 'PF',
  nomeRazao: 'QA Contrato Wizard',
  documento: '111.444.777-35',
  // Campos que só existem em memória: não há coluna em `clientes` para eles.
  politicaComercial: 'P2',
  aplicarPoliticaAuto: true,
} as Cliente;

describe('isUuid', () => {
  it('aceita uuid v4 do banco', () => {
    expect(isUuid('2acb9e68-5c7e-4ef6-bbe2-731ab79edb75')).toBe(true);
  });

  it('rejeita timestamp de Date.now()', () => {
    expect(isUuid('1786986034281')).toBe(false);
    expect(isUuid(String(Date.now()))).toBe(false);
  });

  it('rejeita vazio, nulo e indefinido', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it('rejeita quase-uuid malformado', () => {
    // hífens fora de posição
    expect(isUuid('2acb9e68-5c7e-4ef6-bbe2731ab79edb75-')).toBe(false);
    // curto e longo demais
    expect(isUuid('2acb9e68-5c7e-4ef6-bbe2-731ab79edb7')).toBe(false);
    expect(isUuid('2acb9e68-5c7e-4ef6-bbe2-731ab79edb755')).toBe(false);
    // caractere não-hex
    expect(isUuid('gacb9e68-5c7e-4ef6-bbe2-731ab79edb75')).toBe(false);
  });
});

describe('resolverClientePersistido', () => {
  it('usa o id do banco, não o timestamp local', () => {
    const resolvido = resolverClientePersistido(clienteLocalComTimestamp, linhaDoBanco);

    expect(resolvido.id).toBe('2acb9e68-5c7e-4ef6-bbe2-731ab79edb75');
    expect(resolvido.id).not.toBe(clienteLocalComTimestamp.id);
  });

  it('devolve id que passa na validação de uuid (o que o Postgres exige)', () => {
    const resolvido = resolverClientePersistido(clienteLocalComTimestamp, linhaDoBanco);

    expect(isUuid(resolvido.id)).toBe(true);
  });

  it('preserva o cliente local quando o banco não devolve linha', () => {
    const resolvido = resolverClientePersistido(clienteLocalComTimestamp, null);

    expect(resolvido).toEqual(clienteLocalComTimestamp);
  });

  // Regressão: trocar o objeto local pela projeção do banco apagava a política
  // comercial (sem coluna em `clientes`) e o contrato saía sem o desconto.
  it('preserva campos que só existem em memória, como a política comercial', () => {
    const resolvido = resolverClientePersistido(clienteLocalComTimestamp, linhaDoBanco);

    expect(resolvido.politicaComercial).toBe('P2');
    expect(resolvido.aplicarPoliticaAuto).toBe(true);
  });

  it('deixa o banco vencer nos campos que ele é dono', () => {
    const resolvido = resolverClientePersistido(clienteLocalComTimestamp, linhaDoBanco);

    expect(resolvido.id).toBe('2acb9e68-5c7e-4ef6-bbe2-731ab79edb75');
    expect(resolvido.lojaId).toBe('cc51b7f2-79c5-4f46-adf5-86c891b1e01a');
  });
});
