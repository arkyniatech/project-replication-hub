// Dados mockados para inicializar o sistema (LocaHub)
import { Cliente, Equipamento, Contrato, Fatura, GrupoEquipamento, Titulo, Recebimento } from '@/types';
import { clienteStorage, equipamentoStorage, contratoStorage, faturaStorage, grupoStorage, tituloStorage, recebimentoStorage, getAppConfig, setAppConfig } from './storage';
import { APP_CONFIG } from '@/config/app';

export function initializeMockData() {
  // Verifica se já existem dados
  if (clienteStorage.getAll().length > 0) return;

  // Inicializar dados de Contas a Pagar
  initializeContasPagarData();

  // Grupos de equipamentos
  const grupos: GrupoEquipamento[] = [
    { id: '1', nome: 'Escavadeiras', descricao: 'Equipamentos de escavação e movimentação de terra' },
    { id: '2', nome: 'Compactadores', descricao: 'Equipamentos para compactação de solo' },
    { id: '3', nome: 'Betoneiras', descricao: 'Equipamentos para preparo de concreto' },
    { id: '4', nome: 'Geradores', descricao: 'Equipamentos de geração de energia elétrica' },
    { id: '5', nome: 'Andaimes', descricao: 'Estruturas de apoio para trabalho em altura' },
  ];

  grupos.forEach(grupo => grupoStorage.add(grupo));

  // Clientes mockados
  const clientes: Cliente[] = [
    {
      id: '1',
      tipo: 'PJ',
      lojaId: 'loja-1',
      status: 'ATIVO' as const,
      inadimplente: false,
      nome: 'Construtora Lima & Silva Ltda',
      nomeRazao: 'Construtora Lima & Silva Ltda',
      documento: '12.345.678/0001-90',
      contatos: [
        { id: '1', tipo: 'Email', valor: 'contato@limasilva.com.br', principal: true },
        { id: '2', tipo: 'Telefone', valor: '(11) 98765-4321', principal: false }
      ],
      email: 'contato@limasilva.com.br',
      telefone: '(11) 98765-4321',
      endereco: {
        cep: '01310-100',
        logradouro: 'Av. Paulista',
        numero: '1000',
        complemento: 'Sala 101',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
        pais: 'Brasil'
      },
      statusCredito: 'Ativo',
      observacoes: 'Cliente VIP - pagamento sempre em dia',
      anexos: [],
      lgpdAceito: true,
      auditoria: {
        criadoPor: 'Admin',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      tipo: 'PF',
      lojaId: 'loja-1',
      status: 'ATIVO' as const,
      inadimplente: false,
      nome: 'João Carlos Pereira',
      nomeRazao: 'João Carlos Pereira',
      documento: '123.456.789-10',
      contatos: [
        { id: '1', tipo: 'Email', valor: 'joao.pereira@email.com', principal: true },
        { id: '2', tipo: 'Telefone', valor: '(11) 91234-5678', principal: false }
      ],
      email: 'joao.pereira@email.com',
      telefone: '(11) 91234-5678',
      endereco: {
        cep: '04567-890',
        logradouro: 'Rua das Flores',
        numero: '250',
        bairro: 'Vila Madalena',
        cidade: 'São Paulo',
        uf: 'SP',
        pais: 'Brasil'
      },
      statusCredito: 'Ativo',
      anexos: [],
      lgpdAceito: true,
      auditoria: {
        criadoPor: 'Admin',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      tipo: 'PJ',
      lojaId: 'loja-1', 
      status: 'ATIVO' as const,
      inadimplente: false,
      nome: 'Reformas Rápidas ME',
      nomeRazao: 'Reformas Rápidas ME',
      documento: '98.765.432/0001-10',
      contatos: [
        { id: '1', tipo: 'Email', valor: 'reformas@rapidas.com.br', principal: true },
        { id: '2', tipo: 'Telefone', valor: '(11) 94567-8901', principal: false }
      ],
      email: 'reformas@rapidas.com.br',
      telefone: '(11) 94567-8901',
      endereco: {
        cep: '02345-678',
        logradouro: 'Rua do Comércio',
        numero: '89',
        bairro: 'Centro',
        cidade: 'Guarulhos',
        uf: 'SP',
        pais: 'Brasil'
      },
      statusCredito: 'Em análise',
      observacoes: 'Cliente novo - verificar histórico creditício',
      anexos: [],
      lgpdAceito: true,
      auditoria: {
        criadoPor: 'Admin',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  clientes.forEach(cliente => clienteStorage.add(cliente));

  // Equipamentos mockados
  const equipamentos: Equipamento[] = [
    {
      id: '1',
      codigo: 'ESC001',
      nome: 'Escavadeira Hidráulica 20t',
      descricao: 'Escavadeira hidráulica sobre esteiras, 20 toneladas',
      grupoId: '1',
      grupo: grupos[0],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 350,
        SEMANA: 2100,
        QUINZENA: 3800,
        D21: 5200,
        MES: 7000
      },
      status: 'DISPONIVEL' as const,
      controle: 'SERIALIZADO' as const,
      precos: {
        diaria: 800,
        semana: 4500,
        mes: 15000
      },
      situacao: 'Disponível',
      localizacao: 'Depósito Central',
      tipoControle: 'SERIALIZADO',
      checklists: ['Entrega', 'Devolução'],
      anexos: [],
      ativo: true,
      precos_old: {
        diario: 800,
        semanal: 4500,
        mensal: 15000
      },
      observacoes: 'Equipamento revisado em Janeiro/2024',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      codigo: 'COMP001',
      nome: 'Compactador de Solo Vibratório',
      descricao: 'Compactador vibratório duplo, largura 120cm',
      grupoId: '2',
      grupo: grupos[1],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 180,
        SEMANA: 1080,
        QUINZENA: 1940,
        D21: 2660,
        MES: 3600
      },
      status: 'DISPONIVEL' as const,
      controle: 'SERIALIZADO' as const,
      precos: {
        diaria: 250,
        semana: 1400,
        mes: 4500
      },
      situacao: 'Disponível',
      localizacao: 'Depósito Central',
      tipoControle: 'SERIALIZADO',
      checklists: ['Entrega', 'Devolução', 'Manutenção'],
      anexos: [],
      ativo: true,
      // Para compatibilidade
      precos_old: {
        diario: 250,
        semanal: 1400,
        mensal: 4500
      },
      observacoes: 'Em locação até 15/03/2024',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      codigo: 'BET001',
      nome: 'Betoneira 400L',
      descricao: 'Betoneira basculante 400 litros, motor elétrico',
      grupoId: '3',
      grupo: grupos[2],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 85,
        SEMANA: 510,
        QUINZENA: 918,
        D21: 1258,
        MES: 1700
      },
      status: 'DISPONIVEL' as const,
      controle: 'GRUPO' as const,
      quantidade: 5,
      qtdDisponivel: 4,
      precos: {
        diaria: 120,
        semana: 650,
        mes: 2000
      },
      situacao: 'Disponível',
      localizacao: 'Depósito Central',
      tipoControle: 'GRUPO',
      checklists: ['Entrega', 'Devolução'],
      anexos: [],
      ativo: true,
      // Para compatibilidade
      precos_old: {
        diario: 120,
        semanal: 650,
        mensal: 2000
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '4',
      codigo: 'GER001',
      nome: 'Gerador 15kVA Diesel',
      descricao: 'Gerador diesel trifásico 15kVA, silenciado',
      grupoId: '4',
      grupo: grupos[3],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 125,
        SEMANA: 750,
        QUINZENA: 1350,
        D21: 1850,
        MES: 2500
      },
      status: 'MANUTENCAO' as const,
      controle: 'SERIALIZADO' as const,
      precos: {
        diaria: 180,
        semana: 950,
        mes: 3200
      },
      situacao: 'Manutenção',
      localizacao: 'Oficina',
      tipoControle: 'SERIALIZADO',
      checklists: ['Entrega', 'Devolução', 'Manutenção'],
      anexos: [],
      ativo: true,
      // Para compatibilidade
      precos_old: {
        diario: 180,
        semanal: 950,
        mensal: 3200
      },
      observacoes: 'Revisão geral programada - volta dia 20/03',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '5',
      codigo: 'AND001',
      nome: 'Kit Andaime Tubular 100m²',
      descricao: 'Kit completo de andaime tubular para 100m²',
      grupoId: '5',
      grupo: grupos[4],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 55,
        SEMANA: 330,
        QUINZENA: 594,
        D21: 814,
        MES: 1100
      },
      status: 'DISPONIVEL' as const,
      controle: 'GRUPO' as const,
      quantidade: 10,
      qtdDisponivel: 8,
      precos: {
        diaria: 80,
        semana: 450,
        mes: 1500
      },
      situacao: 'Disponível',
      localizacao: 'Depósito Central',
      tipoControle: 'GRUPO',
      checklists: ['Entrega', 'Devolução'],
      anexos: [],
      ativo: true,
      // Para compatibilidade
      precos_old: {
        diario: 80,
        semanal: 450,
        mensal: 1500
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    // Adicionando mais equipamentos para testes
    {
      id: '6',
      codigo: 'MART001',
      nome: 'Martelete Rompedor Elétrico',
      descricao: 'Martelete rompedor elétrico 1500W',
      grupoId: '1',
      grupo: grupos[0],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 45,
        SEMANA: 270,
        QUINZENA: 486,
        D21: 666,
        MES: 900
      },
      status: 'DISPONIVEL' as const,
      controle: 'SERIALIZADO' as const,
      precos: {
        diaria: 65,
        semana: 350,
        mes: 1200
      },
      situacao: 'Disponível',
      localizacao: 'Depósito Central',
      tipoControle: 'SERIALIZADO',
      checklists: ['Entrega', 'Devolução'],
      anexos: [],
      ativo: true,
      precos_old: {
        diario: 65,
        semanal: 350,
        mensal: 1200
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '7',
      codigo: 'TAPE001',
      nome: 'Kit Tapume Metálico',
      descricao: 'Kit tapume metálico 2,0m altura por painel',
      grupoId: '5',
      grupo: grupos[4],
      lojaId: 'loja-1',
      unidadeLocacao: 'DIARIA' as const,
      tabela: {
        DIARIA: 12,
        SEMANA: 72,
        QUINZENA: 130,
        D21: 178,
        MES: 240
      },
      status: 'DISPONIVEL' as const,
      controle: 'GRUPO' as const,
      quantidade: 25,
      qtdDisponivel: 20,
      precos: {
        diaria: 18,
        semana: 95,
        mes: 320
      },
      situacao: 'Disponível',
      localizacao: 'Depósito Central',
      tipoControle: 'GRUPO',
      checklists: ['Entrega', 'Devolução'],
      anexos: [],
      ativo: true,
      precos_old: {
        diario: 18,
        semanal: 95,
        mensal: 320
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  equipamentos.forEach(equipamento => equipamentoStorage.add(equipamento));

  // Contratos mockados
  const contratos: Contrato[] = [
    {
      id: 1,
      lojaId: 'loja-1',
      numero: 'LOC-2024-001',
      clienteId: '1',
      cliente: clientes[0],
      itens: [
        {
          id: '1',
          equipamentoId: '2',
          equipamento: equipamentos[1],
          quantidade: 1,
          valorUnitario: 1400,
          valorTotal: 1400,
          periodo: 'semanal',
          controle: 'SERIALIZADO' as const,
          periodoEscolhido: 'SEMANA' as const,
          subtotal: 1400
        }
      ],
      entrega: {
        data: '2024-03-01',
        janela: 'MANHA' as const,
        observacoes: 'Entrega no canteiro de obras da Av. Paulista'
      },
      condicoes: {
        confirmacoes: ['Acesso ao local confirmado', 'Área de descarga adequada'],
        observacoes: ''
      },
      pagamento: {
        forma: 'BOLETO' as const,
        vencimentoISO: '2024-03-01'
      },
      valorTotal: 1400,
      status: 'ATIVO' as const,
      rascunho: false,
      timeline: [],
      dataInicio: '2024-03-01',
      dataFim: '2024-03-15',
      formaPagamento: 'À vista',
      observacoes: 'Entrega no canteiro de obras da Av. Paulista',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  contratos.forEach(contrato => contratoStorage.add(contrato));

  // Títulos mockados
  const titulos: Titulo[] = [
    {
      id: '1',
      numero: 'FAT-2024-001',
      contratoId: '1',
      contrato: contratos[0],
      clienteId: '1',
      cliente: clientes[0],
      lojaId: '1',
      categoria: 'Locação',
      subcategoria: 'Locação Principal',
      origem: 'CONTRATO',
      emissao: '2024-03-01',
      vencimento: '2024-03-10',
      valor: 1400,
      pago: 0,
      saldo: 1400,
      forma: 'Boleto',
      status: 'Vencido',
      timeline: [
        {
          id: '1',
          timestamp: '2024-03-01T10:00:00.000Z',
          tipo: 'criacao',
          descricao: 'Título criado a partir do contrato LOC-2024-001',
          usuario: 'Admin'
        }
      ],
      observacoes: 'Primeira fatura do contrato LOC-2024-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      numero: 'FAT-2024-002',
      contratoId: '1',
      contrato: contratos[0],
      clienteId: '2',
      cliente: clientes[1],
      lojaId: '1',
      categoria: 'Locação',
      subcategoria: 'Locação Principal',
      origem: 'CONTRATO',
      emissao: '2024-03-15',
      vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias a partir de hoje
      valor: 800,
      pago: 200,
      saldo: 600,
      forma: 'PIX',
      status: 'Parcial',
      timeline: [
        {
          id: '2',
          timestamp: '2024-03-15T10:00:00.000Z',
          tipo: 'criacao',
          descricao: 'Título criado',
          usuario: 'Admin'
        },
        {
          id: '3',
          timestamp: '2024-03-16T14:30:00.000Z',
          tipo: 'recebimento',
          descricao: 'Recebimento parcial via PIX',
          usuario: 'Admin',
          meta: {
            valor: 200,
            forma: 'PIX',
            valorLiquido: 200
          }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      numero: 'FAT-2024-003',
      contratoId: '1',
      contrato: contratos[0],
      clienteId: '3',
      cliente: clientes[2],
      lojaId: '1',
      categoria: 'Locação',
      subcategoria: 'Locação Principal',
      origem: 'CONTRATO',
      emissao: new Date().toISOString().split('T')[0],
      vencimento: new Date().toISOString().split('T')[0], // Vence hoje
      valor: 1200,
      pago: 0,
      saldo: 1200,
      forma: 'Boleto',
      status: 'Em aberto',
      timeline: [
        {
          id: '4',
          timestamp: new Date().toISOString(),
          tipo: 'criacao',
          descricao: 'Título criado',
          usuario: 'Admin'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  titulos.forEach(titulo => tituloStorage.add(titulo));

  // Recebimentos mockados
  const recebimentos: Recebimento[] = [
    {
      id: '1',
      tituloId: '2',
      titulo: titulos[1],
      data: '2024-03-16',
      forma: 'PIX',
      valorBruto: 200,
      desconto: 0,
      jurosMulta: 0,
      valorLiquido: 200,
      observacoes: 'Recebimento parcial via PIX',
      usuario: 'Admin',
      createdAt: '2024-03-16T14:30:00.000Z'
    }
  ];

  recebimentos.forEach(recebimento => recebimentoStorage.add(recebimento));

  // Faturas mockadas (para compatibilidade)
  const faturas: Fatura[] = [
    {
      id: '1',
      numero: 'FAT-2024-001',
      contratoId: '1',
      contrato: contratos[0],
      clienteId: '1',
      cliente: clientes[0],
      emissao: '2024-03-01',
      vencimento: '2024-03-10',
      itens: [
        {
          id: '1',
          descricao: 'Locação de Compactador de Solo Vibratório',
          quantidade: 1,
          periodo: 'Semanal',
          preco: 1400,
          subtotal: 1400
        }
      ],
      subtotal: 1400,
      acrescimos: 0,
      descontos: 0,
      valor: 1400,
      valorFiscalMock: false,
      formaPreferida: 'Boleto',
      observacoes: 'Primeira fatura do contrato LOC-2024-001',
      // Compatibilidade
      dataVencimento: '2024-03-10',
      status: 'Em aberto',
      valorPago: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  faturas.forEach(fatura => faturaStorage.add(fatura));

  // Contratos migrados para Supabase - títulos vencidos para teste
  const titulosVencidos = [
    {
      id: 'titulo-vencido-1',
      numero: 'TIT-VENC-001',
      contratoId: 'contrato-1',
      contrato: contratos[0],
      clienteId: 'cliente-1',
      cliente: clientes[0],
      lojaId: '1',
      categoria: 'Locação',
      subcategoria: 'Vencido',
      origem: 'CONTRATO' as const,
      emissao: '2024-08-01',
      vencimento: '2024-11-15',
      valor: 1500,
      pago: 0,
      saldo: 1500,
      forma: 'Boleto' as const,
      status: 'Vencido' as const,
      timeline: [],
      createdAt: '2024-08-01T10:00:00Z',
      updatedAt: '2024-08-01T10:00:00Z'
    }
  ];

  titulosVencidos.forEach(titulo => tituloStorage.add(titulo));
}

// Initialize admin configuration for full access during development
function initializeAdminConfig() {
  try {
    const stored = localStorage.getItem('erp-config');
    if (!stored) {
      const adminConfig = {
        perfis: {
          admin: {
            id: "admin",
            nome: "Administrador",
            descricao: "Acesso total ao sistema",
            permissoes: {
              clientes: { ver: true, criar: true, editar: true, excluir: true },
              equipamentos: { ver: true, criar: true, editar: true, excluir: true },
              contratos: { ver: true, criar: true, editar: true, excluir: true, renovar: true, devolverSubstituir: true },
              financeiro: { ver: true, criar: true, editar: true, excluir: true, emitirFatura: true, receberPagamento: true },
              inadimplencia: { ver: true, criar: true, editar: true, excluir: true, enviarMensagens: true },
              manutencaoOS: { ver: true, criar: true, editar: true, excluir: true },
              logistica: { ver: true, criar: true, editar: true, excluir: true },
              caixa: { ver: true, gerirCaixa: true },
              configuracoes: { gerirConfiguracoes: true }
            }
          }
        },
        organizacao: {
          razaoSocial: APP_CONFIG.company.fullName,
          nomeFantasia: APP_CONFIG.company.name,
          cnpj: APP_CONFIG.company.cnpj,
          endereco: {
            cep: APP_CONFIG.company.address.cep,
            logradouro: APP_CONFIG.company.address.street,
            numero: "1000",
            bairro: APP_CONFIG.company.address.district,
            cidade: APP_CONFIG.company.address.city,
            uf: APP_CONFIG.company.address.state,
            pais: "Brasil"
          }
        }
      };
      localStorage.setItem('erp-config', JSON.stringify(adminConfig));
    }
  } catch (error) {
    console.error('Erro ao inicializar configuração admin:', error);
  }
}

// Função para inicializar dados de Contas a Pagar
function initializeContasPagarData() {
  const config = getAppConfig();

  // Fornecedores
  const fornecedores = [
    { id: '1', nome: 'Posto Petrobras Ltda', cnpj: '12.345.678/0001-90', contato: 'comercial@petrobras.com.br' },
    { id: '2', nome: 'Oficina do João', cnpj: '98.765.432/0001-10', contato: '(11) 99999-9999' },
    { id: '3', nome: 'Distribuidora ABC', cnpj: '11.222.333/0001-44', contato: 'vendas@abcdist.com.br' },
    { id: '4', nome: 'Consultoria Tech', cnpj: '55.666.777/0001-88', contato: 'contato@consultech.com.br' },
    { id: '5', nome: 'Transportadora Sul', cnpj: '44.333.222/0001-99', contato: 'logistica@transul.com.br' }
  ];

  // Contas
  const contas = [
    { id: '1', nome: 'Banco do Brasil - CC', tipo: 'Banco', saldoInicial: 50000 },
    { id: '2', nome: 'Caixa Econômica - CC', tipo: 'Banco', saldoInicial: 25000 },
    { id: '3', nome: 'Caixa Físico', tipo: 'Caixa', saldoInicial: 5000 },
    { id: '4', nome: 'Cartão Empresarial', tipo: 'Cartão', saldoInicial: 15000 }
  ];

  // Plano de Contas Nível 2
  const planoContasN2 = [
    { codigo: 'A5.01', descricao: 'Combustível' },
    { codigo: 'A5.02', descricao: 'Manutenção e Reparos' },
    { codigo: 'A5.03', descricao: 'Peças e Materiais' },
    { codigo: 'A5.04', descricao: 'Serviços de Terceiros' },
    { codigo: 'A5.05', descricao: 'Logística e Transporte' }
  ];

  // Títulos a Pagar
  const titulosPagar = [
    {
      id: '1',
      fornecedorId: '1',
      unidadeId: '1',
      categoriaCodigo: 'A5.01',
      valorTotal: 2850.00,
      parcelas: 1,
      vencimentoInicial: '2024-01-15',
      observacao: 'Combustível para frota'
    },
    {
      id: '2',
      fornecedorId: '2',
      unidadeId: '2',
      categoriaCodigo: 'A5.02',
      valorTotal: 1200.00,
      parcelas: 1,
      vencimentoInicial: '2024-01-20',
      observacao: 'Manutenção preventiva'
    }
  ];

  // Parcelas a Pagar
  const parcelasPagar = [
    {
      id: '1',
      tituloId: '1',
      fornecedorId: '1',
      unidadeId: '1',
      categoriaCodigo: 'A5.01',
      vencimentoISO: '2024-01-15',
      valor: 2850.00,
      status: 'vencida',
      pago: 0,
      juros: 0,
      multa: 0,
      desconto: 0,
      anexos: []
    },
    {
      id: '2',
      tituloId: '2',
      fornecedorId: '2',
      unidadeId: '2',
      categoriaCodigo: 'A5.02',
      vencimentoISO: '2024-01-20',
      valor: 1200.00,
      status: 'parcial',
      pago: 600.00,
      juros: 0,
      multa: 0,
      desconto: 0,
      anexos: []
    }
  ];

  // Salvar no config
  const updatedConfig = {
    ...config,
    contasPagar: {
      fornecedores,
      contas,
      planoContasN2,
      titulosPagar,
      parcelasPagar,
      movimentosPagar: [],
      transferencias: []
    }
  };

  setAppConfig(updatedConfig);
}