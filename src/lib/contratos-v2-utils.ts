// Utilitários para Contratos v2 - Regras de Negócio
import { Cliente, Equipamento, Contrato, Reserva, OSLogistica, TituloReceber, Aditivo, AgregadorCobranca, Loja } from '@/types';
import { getStorageData, setStorageData } from './storage';

// Storage keys específicos para v2
const V2_STORAGE_KEYS = {
  LOJAS: 'locacao_lojas',
  RESERVAS: 'locacao_reservas',
  OS_LOGISTICA: 'locacao_os_logistica',
  CONFIG_LOJAS: 'locacao_config_lojas',
  AGRUPADORES: 'locacao_agrupadores',
  CONTRATOS_COUNTER: 'locacao_contratos_counter',
};

// Auto-increment por loja
export function autoIncrementContrato(lojaId: string): number {
  const counters = getStorageData<{[lojaId: string]: number}>(V2_STORAGE_KEYS.CONTRATOS_COUNTER)[0] || {};
  const currentNumber = (counters[lojaId] || 0) + 1;
  counters[lojaId] = currentNumber;
  setStorageData(V2_STORAGE_KEYS.CONTRATOS_COUNTER, [counters]);
  return currentNumber;
}

// Validação de bloqueio de cliente (multi-loja)
export function validarBloqueioCliente(cliente: Cliente): {
  ok: boolean;
  motivo?: string;
  origemLoja?: string;
  valor?: number;
} {
  if (cliente.status === 'SUSPENSO') {
    return {
      ok: false,
      motivo: 'Cliente com status SUSPENSO',
      origemLoja: cliente.lojaId,
    };
  }

  if (cliente.inadimplente) {
    return {
      ok: false,
      motivo: 'Cliente inadimplente',
      origemLoja: cliente.inadimplenteOrigem?.lojaId,
      valor: cliente.inadimplenteOrigem?.valor,
    };
  }

  return { ok: true };
}

// Preço da tabela por período
export function precoTabela(equipamento: Equipamento, periodo: 'DIARIA' | 'SEMANA' | 'QUINZENA' | '21DIAS' | 'MES'): number {
  // Verificação de segurança para tabela
  if (!equipamento.tabela) {
    console.warn('Equipamento sem tabela de preços:', equipamento.codigo, equipamento.nome);
    // Fallback para precos antigos
    switch (periodo) {
      case 'DIARIA': return equipamento.precos?.diaria || 0;
      case 'SEMANA': return equipamento.precos?.semana || 0;
      case 'MES': return equipamento.precos?.mes || 0;
      default: return 0;
    }
  }

  switch (periodo) {
    case 'DIARIA': return equipamento.tabela.DIARIA;
    case 'SEMANA': return equipamento.tabela.SEMANA;
    case 'QUINZENA': return equipamento.tabela.QUINZENA;
    case '21DIAS': return equipamento.tabela.D21;
    case 'MES': return equipamento.tabela.MES;
    default: return 0;
  }
}

// Calcular encerramento sem pró-rata (simulação)
export function calcularEncerramentoSemProrata(
  inicioISO: string,
  devolucaoISO: string,
  periodoInicial: 'DIARIA' | 'SEMANA' | 'QUINZENA' | '21DIAS' | 'MES',
  tabela: Equipamento['tabela']
): { melhorCombinacao: string; valorTotal: number } {
  const inicio = new Date(inicioISO);
  const devolucao = new Date(devolucaoISO);
  const diasTotais = Math.ceil((devolucao.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

  // Simular combinações (mock - lógica simplificada)
  const opcoes = [
    { tipo: 'MES', dias: 28, preco: tabela.MES },
    { tipo: '21DIAS', dias: 21, preco: tabela.D21 },
    { tipo: 'QUINZENA', dias: 14, preco: tabela.QUINZENA },
    { tipo: 'SEMANA', dias: 7, preco: tabela.SEMANA },
    { tipo: 'DIARIA', dias: 1, preco: tabela.DIARIA },
  ];

  // Algoritmo guloso simples para encontrar menor custo
  let diasRestantes = diasTotais;
  let valorTotal = 0;
  const combinacao: string[] = [];

  for (const opcao of opcoes) {
    const quantidade = Math.floor(diasRestantes / opcao.dias);
    if (quantidade > 0) {
      valorTotal += quantidade * opcao.preco;
      combinacao.push(`${quantidade}x ${opcao.tipo}`);
      diasRestantes -= quantidade * opcao.dias;
    }
  }

  return {
    melhorCombinacao: combinacao.join(' + '),
    valorTotal,
  };
}

// Reservar itens do contrato
export function reservarItens(contratoRascunho: {
  id?: string;
  lojaId: string;
  itens: Array<{
    equipamentoId: string;
    controle: 'SERIALIZADO' | 'GRUPO';
    quantidade: number;
  }>;
}): string {
  const reserva: Reserva = {
    id: crypto.randomUUID(),
    lojaId: contratoRascunho.lojaId,
    contratoRascunhoId: contratoRascunho.id,
    itens: contratoRascunho.itens,
    status: 'ATIVA',
    criadoEm: new Date().toISOString(),
  };

  const reservas = getStorageData<Reserva>(V2_STORAGE_KEYS.RESERVAS);
  reservas.push(reserva);
  setStorageData(V2_STORAGE_KEYS.RESERVAS, reservas);

  return reserva.id;
}

// Liberar reserva
export function liberarReserva(reservaId: string): void {
  const reservas = getStorageData<Reserva>(V2_STORAGE_KEYS.RESERVAS);
  const index = reservas.findIndex(r => r.id === reservaId);
  if (index !== -1) {
    reservas[index].status = 'CANCELADA';
    setStorageData(V2_STORAGE_KEYS.RESERVAS, reservas);
  }
}

// Verificar disponibilidade de equipamento
export function verificarDisponibilidade(equipamento: Equipamento, quantidadeDesejada: number): boolean {
  if (equipamento.controle === 'SERIALIZADO') {
    // Para controle por série, verifica se não está reservado ou locado
    return equipamento.status === 'DISPONIVEL';
  } else {
    // Para controle por grupo, verifica quantidade disponível
    const qtdDisp = equipamento.qtdDisponivel || equipamento.quantidade || 0;
    return qtdDisp >= quantidadeDesejada;
  }
}

// Gerar OS de Entrega
export function gerarOSEntrega(contrato: Contrato): OSLogistica {
  const os: OSLogistica = {
    id: crypto.randomUUID(),
    lojaId: contrato.lojaId,
    contratoId: contrato.id,
    tipo: 'ENTREGA',
    data: contrato.entrega.data,
    janela: contrato.entrega.janela,
    horaSugestao: contrato.entrega.horaSugestao,
    status: 'PLANEJADO',
    observacoes: contrato.entrega.observacoes,
    criadoEm: new Date().toISOString(),
  };

  const osLogistica = getStorageData<OSLogistica>(V2_STORAGE_KEYS.OS_LOGISTICA);
  osLogistica.push(os);
  setStorageData(V2_STORAGE_KEYS.OS_LOGISTICA, osLogistica);

  // Sincronizar OS com Itinerário
  sincronizarOSComItinerario(os, contrato);

  return os;
}

// Gerar títulos de fechamento
export function gerarTitulosFechamento(contrato: Contrato): TituloReceber[] {
  // Demo - implementação simplificada
  const titulo: any = {
    id: crypto.randomUUID(),
    lojaId: contrato.lojaId,
    clienteId: contrato.clienteId,
    contratoId: contrato.id,
    descricao: `Locação - Contrato ${contrato.numero}`,
    valor: contrato.valorTotal,
    vencimentoISO: contrato.pagamento.vencimentoISO,
    status: 'ABERTO',
    createdAt: new Date().toISOString(),
  };

  // Salvar no storage dos títulos
  const titulos = getStorageData<any>('erp-titulos');
  titulos.push(titulo);
  setStorageData('erp-titulos', titulos);

  return [titulo];
}

// Agrupar cobrança por cliente
export function agruparCobrancaCliente(clienteId: string): AgregadorCobranca | null {
  // Demo - coleta títulos em aberto do cliente
  const titulos = getStorageData<any>('erp-titulos').filter((t: any) => 
    t.clienteId === clienteId && t.status === 'ABERTO'
  );

  if (titulos.length === 0) return null;

  const agrupador: AgregadorCobranca = {
    id: crypto.randomUUID(),
    clienteId,
    titulosIds: titulos.map((t: any) => t.id),
    valorTotal: titulos.reduce((sum: number, t: any) => sum + t.valor, 0),
    criadoEm: new Date().toISOString(),
  };

  const agrupadores = getStorageData<AgregadorCobranca>(V2_STORAGE_KEYS.AGRUPADORES);
  agrupadores.push(agrupador);
  setStorageData(V2_STORAGE_KEYS.AGRUPADORES, agrupadores);

  return agrupador;
}

// Assistente de horários com filtro por hora atual
export function sugerirHorarios(janela: 'MANHA' | 'TARDE', dataEntrega?: string): string {
  const horarios = {
    'MANHA': ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00'],
    'TARDE': ['13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  };

  const agora = new Date();
  const horaAtual = agora.getHours();
  const minutoAtual = agora.getMinutes();
  const minutosAtual = horaAtual * 60 + minutoAtual + 30; // + 30 min de margem

  // Se a entrega é para hoje, filtrar horários futuros
  const dataHoje = agora.toISOString().split('T')[0];
  const ehHoje = !dataEntrega || dataEntrega === dataHoje;

  let horariosDisponiveis = horarios[janela];

  if (ehHoje) {
    horariosDisponiveis = horariosDisponiveis.filter(h => {
      const [hora, minuto] = h.split(':').map(Number);
      const minutosHorario = hora * 60 + minuto;
      return minutosHorario > minutosAtual;
    });

    // Se não há horários disponíveis nesta janela, sugerir a próxima
    if (horariosDisponiveis.length === 0) {
      if (janela === 'MANHA') {
        return '13:30'; // Primeira da tarde
      } else {
        return '08:30'; // Primeira da manhã (próximo dia)
      }
    }
  }

  const indiceAleatorio = Math.floor(Math.random() * horariosDisponiveis.length);
  return horariosDisponiveis[indiceAleatorio];
}

// Seed dados para testes
export function seedContratosV2(): void {
  // Criar lojas mock
  const lojas: Loja[] = [
    {
      id: 'loja-1',
      nome: 'Matriz São Paulo',
      apelido: 'SP',
      cnpj: '12.345.678/0001-90',
      endereco: {
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        numero: '1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
      },
      ativo: true,
    },
    {
      id: 'loja-2',
      nome: 'Filial Rio de Janeiro',
      apelido: 'RJ',
      cnpj: '12.345.678/0002-71',
      endereco: {
        cep: '22071-900',
        logradouro: 'Avenida Atlântica',
        numero: '500',
        bairro: 'Copacabana',
        cidade: 'Rio de Janeiro',
        uf: 'RJ',
      },
      ativo: true,
    },
  ];

  setStorageData(V2_STORAGE_KEYS.LOJAS, lojas);

  // Criar configurações por loja
  const configLojas = lojas.map(loja => ({
    lojaId: loja.id,
    cabecalhoDocumento: {
      logoUrl: undefined,
      razao: loja.nome,
      cnpj: loja.cnpj,
      ie: '123.456.789.012',
      endereco: `${loja.endereco.logradouro}, ${loja.endereco.numero} - ${loja.endereco.bairro}, ${loja.endereco.cidade}/${loja.endereco.uf}`,
      whatsapp: '(11) 99999-9999',
    },
    taxaDeslocamentoPadrao: 150,
    templateContratoResumo: {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1 style="text-align: center; color: #F97316;">Contrato de Locação - Resumo</h1>
          <div style="margin: 20px 0;">
            <h3>Dados do Cliente:</h3>
            <p><strong>{{cliente.nome}}</strong> - {{cliente.documento}}</p>
            <p>{{cliente.endereco}}</p>
          </div>
          <div style="margin: 20px 0;">
            <h3>Período:</h3>
            <p>De {{contrato.dataInicio}} até {{contrato.dataFim}}</p>
          </div>
          <div style="margin: 20px 0;">
            <h3>Equipamentos:</h3>
            {{itens}}
          </div>
          <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #F97316;">
            <h3>Valor Total: R$ {{contrato.valorTotal}}</h3>
            <p>Forma de Pagamento: {{contrato.pagamento.forma}}</p>
            <p>Vencimento: {{contrato.pagamento.vencimento}}</p>
          </div>
        </div>
      `,
    },
  }));

  setStorageData(V2_STORAGE_KEYS.CONFIG_LOJAS, configLojas);

  console.log('✅ Dados Contratos v2 seedados com sucesso!');
}

// Exportar storage functions
export const lojaStorage = {
  getAll: () => getStorageData<Loja>(V2_STORAGE_KEYS.LOJAS),
  save: (lojas: Loja[]) => setStorageData(V2_STORAGE_KEYS.LOJAS, lojas),
  getById: (id: string) => lojaStorage.getAll().find(l => l.id === id),
};

export const reservaStorage = {
  getAll: () => getStorageData<Reserva>(V2_STORAGE_KEYS.RESERVAS),
  save: (reservas: Reserva[]) => setStorageData(V2_STORAGE_KEYS.RESERVAS, reservas),
  getAtivas: () => reservaStorage.getAll().filter(r => r.status === 'ATIVA'),
};

export const osLogisticaStorage = {
  getAll: () => getStorageData<OSLogistica>(V2_STORAGE_KEYS.OS_LOGISTICA),
  save: (os: OSLogistica[]) => setStorageData(V2_STORAGE_KEYS.OS_LOGISTICA, os),
};

// Sincronização OS → Itinerário
export function sincronizarOSComItinerario(os: OSLogistica, contrato: Contrato) {
  // Importação dinâmica para evitar circular dependency
  import('@/modules/logistica/store/itinerarioStore').then(({ useItinerarioStore }) => {
    const store = useItinerarioStore.getState();
    
    // Buscar cliente para pegar nome e telefone
    const clientes = getStorageData<Cliente>('erp-clientes');
    const cliente = clientes.find(c => c.id === contrato.clienteId);
    
    if (!cliente) {
      console.warn('[sincronizarOSComItinerario] Cliente não encontrado:', contrato.clienteId);
      return;
    }

    // Converter janela (MANHA/TARDE) para horários
    const janela = contrato.entrega?.janela || 'MANHA';
    const horarios = janela === 'MANHA' 
      ? { inicio: '08:00', fim: '12:00' }
      : { inicio: '13:00', fim: '18:00' };

    // Buscar endereço da obra ou do cliente
    const endereco = contrato.obra?.endereco 
      ? `${contrato.obra.endereco.logradouro}, ${contrato.obra.endereco.numero} - ${contrato.obra.endereco.bairro}, ${contrato.obra.endereco.cidade}/${contrato.obra.endereco.uf}`
      : contrato.cliente?.endereco
        ? `${contrato.cliente.endereco.logradouro}, ${contrato.cliente.endereco.numero} - ${contrato.cliente.endereco.bairro}, ${contrato.cliente.endereco.cidade}/${contrato.cliente.endereco.uf}`
        : 'Endereço não informado';

    // Buscar telefone do cliente
    const contatoTelefone = cliente.contatos?.find(c => c.tipo === 'Telefone' || c.tipo === 'WhatsApp');
    const telefone = contatoTelefone?.valor || '';

    // Criar tarefa para o itinerário
    const tarefa = {
      id: `os-${os.id}`,
      tipo: 'ENTREGA' as const,
      contratoNumero: contrato.numero,
      cliente: {
        nome: cliente.tipo === 'PJ' ? cliente.razaoSocial || cliente.nomeFantasia || '' : cliente.nome || '',
        fone: telefone,
      },
      endereco,
      telefone,
      janela: horarios,
      status: 'PENDENTE' as const,
      prioridade: 'NORMAL' as const,
      duracao: 120, // 2 horas estimadas
      previstoISO: contrato.entrega?.data ? `${contrato.entrega.data}T${contrato.entrega.horaSugestao || '09:00'}:00` : contrato.dataInicio,
      observacoes: `Contrato ${contrato.numero} - ${contrato.itens?.length || 0} item(ns)`,
    };

    // Buscar ou criar itinerário para a data
    const dataISO = contrato.entrega?.data || contrato.dataInicio.split('T')[0];
    const itinerarios = store.itinerarios;
    let itinerario = itinerarios.find(
      it => it.dataISO === dataISO && it.lojaId === contrato.lojaId
    );

    if (!itinerario) {
      // Criar novo itinerário
      itinerario = {
        id: crypto.randomUUID(),
        dataISO,
        lojaId: contrato.lojaId,
        motoristaId: '',
        motoristaInfo: { id: '', nome: 'A definir', telefone: '' },
        veiculoId: '',
        veiculoInfo: { id: '', placa: '', modelo: '' },
        tarefas: [tarefa],
        status: 'PLANEJADO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.addItinerario(itinerario);
      console.log('[sincronizarOSComItinerario] Novo itinerário criado:', itinerario.id, 'data:', dataISO);
    } else {
      // Verificar se a tarefa já existe
      const tarefaExiste = itinerario.tarefas.some(t => t.id === tarefa.id);
      if (!tarefaExiste) {
        store.addTarefa(itinerario.id, tarefa);
        console.log('[sincronizarOSComItinerario] Tarefa adicionada ao itinerário:', itinerario.id);
      } else {
        console.log('[sincronizarOSComItinerario] Tarefa já existe no itinerário');
      }
    }
  });
}

// Sincronização inicial de OSs pendentes
export function sincronizarOSsPendentes() {
  console.log('[sincronizarOSsPendentes] Iniciando sincronização...');
  
  const ossPendentes = getStorageData<OSLogistica>(V2_STORAGE_KEYS.OS_LOGISTICA);
  const contratos = getStorageData<Contrato>('erp-contratos-v2');
  
  if (ossPendentes.length === 0) {
    console.log('[sincronizarOSsPendentes] Nenhuma OS pendente para sincronizar');
    return;
  }

  // Importação dinâmica para evitar circular dependency
  import('@/modules/logistica/store/itinerarioStore').then(({ useItinerarioStore }) => {
    const store = useItinerarioStore.getState();
    const tarefasExistentes = store.itinerarios.flatMap(it => it.tarefas.map(t => t.id));
    
    let sincronizadas = 0;
    ossPendentes.forEach(os => {
      const tarefaId = `os-${os.id}`;
      
      // Verificar se já existe tarefa para esta OS
      if (tarefasExistentes.includes(tarefaId)) {
        return;
      }
      
      // Buscar contrato correspondente
      const contrato = contratos.find(c => c.id === os.contratoId);
      if (!contrato) {
        console.warn('[sincronizarOSsPendentes] Contrato não encontrado para OS:', os.id);
        return;
      }
      
      // Sincronizar
      sincronizarOSComItinerario(os, contrato);
      sincronizadas++;
    });
    
    console.log(`[sincronizarOSsPendentes] Sincronização concluída: ${sincronizadas} OS(s) sincronizada(s)`);
  });
}