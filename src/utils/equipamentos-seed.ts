import { useEquipamentosStore } from '@/stores/equipamentosStore';
import { TipoItem } from '@/types/equipamentos';
import { getAppConfig, setAppConfig } from '@/lib/storage';

export function seedEquipamentosData() {
  const store = useEquipamentosStore.getState();
  
  console.log('📋 Iniciando seed de equipamentos...');
  
  // Sincronizar lojas se o store estiver vazio
  if (store.lojas.length === 0) {
    console.log('🏢 Sincronizando lojas...');
    store.syncLojas();
  }

  // Verificar se já existem dados suficientes
  const hasGrupos = store.grupos.length > 0;
  const hasModelos = store.modelos.length > 0;
  const hasEquipamentos = store.equipamentos.length > 0;
  
  if (hasGrupos && hasModelos && hasEquipamentos) {
    console.log('📋 Equipamentos já existem:', {
      grupos: store.grupos.length,
      modelos: store.modelos.length, 
      equipamentos: store.equipamentos.length
    });
    return;
  }
  
  console.log('📋 Criando dados mock de equipamentos...');
  
  // Declarar todas as variáveis de modelos
  let grupoBetoneira, grupoAndaime, grupoCompressor, grupoEscavadeira, grupoRompedor, grupoSerra;
  let modeloBet350, modeloBet400, modeloAnd4m, modeloAnd6m, modeloComp10hp, modeloComp15hp, 
      modeloEscMini, modeloEscMedia, modeloRompPeq, modeloRompGrande;
  
  // Criar grupos se não existem
  if (!hasGrupos) {
    grupoBetoneira = store.addGrupo({ nome: 'Betoneiras', ativo: true });
    grupoAndaime = store.addGrupo({ nome: 'Andaimes', ativo: true });
    grupoCompressor = store.addGrupo({ nome: 'Compressores', ativo: true });
    grupoEscavadeira = store.addGrupo({ nome: 'Escavadeiras', ativo: true });
    grupoRompedor = store.addGrupo({ nome: 'Rompedores', ativo: true });
    grupoSerra = store.addGrupo({ nome: 'Serras', ativo: false }); // Um grupo inativo para teste
  } else {
    // Usar grupos existentes
    const grupos = store.grupos;
    grupoBetoneira = grupos.find(g => g.nome === 'Betoneiras')?.id || grupos[0]?.id || '';
    grupoAndaime = grupos.find(g => g.nome === 'Andaimes')?.id || grupos[1]?.id || '';
    grupoCompressor = grupos.find(g => g.nome === 'Compressores')?.id || grupos[2]?.id || '';
    grupoEscavadeira = grupos.find(g => g.nome === 'Escavadeiras')?.id || grupos[3]?.id || '';
    grupoRompedor = grupos.find(g => g.nome === 'Rompedores')?.id || grupos[4]?.id || '';
    grupoSerra = grupos.find(g => g.nome === 'Serras')?.id || grupos[5]?.id || '';
  }
  
  // Criar modelos se não existem
  if (!hasModelos) {
    // Betoneiras
    modeloBet350 = store.addModelo({
      grupoId: grupoBetoneira,
      fabricante: 'Menegotti',
      nomeComercial: 'Betoneira 350L',
      tabelaPorLoja: {
        '1': { DIARIA: 85, SEMANA: 450, QUINZENA: 800, D21: 1100, MES: 1500 },
        '2': { DIARIA: 90, SEMANA: 480, QUINZENA: 850, D21: 1150, MES: 1600 },
      },
      fotos: ['https://via.placeholder.com/300x200?text=Betoneira+350L'],
      links: {
        manual: 'https://menegotti.com.br/manual-bet350',
        video: 'https://youtube.com/watch?v=demo'
      }
    });

    modeloBet400 = store.addModelo({
      grupoId: grupoBetoneira,
      fabricante: 'Menegotti',
      nomeComercial: 'Betoneira 400L Industrial',
      tabelaPorLoja: {
        '1': { DIARIA: 95, SEMANA: 520, QUINZENA: 950, D21: 1300, MES: 1800 },
        '2': { DIARIA: 100, SEMANA: 550, QUINZENA: 1000, D21: 1350, MES: 1900 },
      },
      fotos: ['https://via.placeholder.com/300x200?text=Betoneira+400L'],
      links: { manual: 'https://menegotti.com.br/manual-bti400' }
    });
    
    // Andaimes
    modeloAnd4m = store.addModelo({
      grupoId: grupoAndaime,
      fabricante: 'Mills',
      nomeComercial: 'Andaime Fachadeiro 4m',
      tabelaPorLoja: {
        '1': { DIARIA: 12, SEMANA: 65, QUINZENA: 120, D21: 160, MES: 220 },
        '2': { DIARIA: 15, SEMANA: 70, QUINZENA: 130, D21: 170, MES: 240 },
      },
      fotos: [],
      links: {}
    });

    modeloAnd6m = store.addModelo({
      grupoId: grupoAndaime,
      fabricante: 'Mills',
      nomeComercial: 'Andaime Fachadeiro 6m',
      tabelaPorLoja: {
        '1': { DIARIA: 18, SEMANA: 95, QUINZENA: 180, D21: 240, MES: 330 },
        '2': { DIARIA: 20, SEMANA: 100, QUINZENA: 190, D21: 250, MES: 350 },
      },
      fotos: [],
      links: {}
    });
    
    // Compressores
    modeloComp10hp = store.addModelo({
      grupoId: grupoCompressor,
      fabricante: 'Schulz',
      nomeComercial: 'Compressor 10HP',
      tabelaPorLoja: {
        '1': { DIARIA: 45, SEMANA: 240, QUINZENA: 430, D21: 580, MES: 800 },
        '2': { DIARIA: 50, SEMANA: 260, QUINZENA: 460, D21: 620, MES: 850 },
      },
      fotos: ['https://via.placeholder.com/300x200?text=Compressor+10HP'],
      links: { manual: 'https://schulz.com.br/manual-com10' }
    });

    modeloComp15hp = store.addModelo({
      grupoId: grupoCompressor,
      fabricante: 'Schulz',
      nomeComercial: 'Compressor 15HP Industrial',
      tabelaPorLoja: {
        '1': { DIARIA: 65, SEMANA: 350, QUINZENA: 630, D21: 850, MES: 1200 },
        '2': { DIARIA: 70, SEMANA: 380, QUINZENA: 680, D21: 920, MES: 1300 },
      },
      fotos: [],
      links: {}
    });

    // Escavadeiras
    modeloEscMini = store.addModelo({
      grupoId: grupoEscavadeira,
      fabricante: 'Caterpillar',
      nomeComercial: 'Mini Escavadeira CAT 302.7',
      tabelaPorLoja: {
        '1': { DIARIA: 280, SEMANA: 1500, QUINZENA: 2800, D21: 3800, MES: 5200 },
        '2': { DIARIA: 300, SEMANA: 1600, QUINZENA: 3000, D21: 4100, MES: 5600 },
      },
      fotos: ['https://via.placeholder.com/300x200?text=Mini+Escavadeira'],
      links: { 
        manual: 'https://caterpillar.com/manual-302-7',
        video: 'https://youtube.com/watch?v=esc-demo'
      }
    });

    modeloEscMedia = store.addModelo({
      grupoId: grupoEscavadeira,
      fabricante: 'Volvo',
      nomeComercial: 'Escavadeira EC140E',
      tabelaPorLoja: {
        '1': { DIARIA: 450, SEMANA: 2400, QUINZENA: 4500, D21: 6100, MES: 8500 },
        '2': { DIARIA: 480, SEMANA: 2600, QUINZENA: 4800, D21: 6500, MES: 9200 },
      },
      fotos: [],
      links: {}
    });

    // Rompedores
    modeloRompPeq = store.addModelo({
      grupoId: grupoRompedor,
      fabricante: 'Makita',
      nomeComercial: 'Rompedor HM1317C',
      tabelaPorLoja: {
        '1': { DIARIA: 35, SEMANA: 185, QUINZENA: 340, D21: 460, MES: 640 },
        '2': { DIARIA: 38, SEMANA: 200, QUINZENA: 370, D21: 500, MES: 700 },
      },
      fotos: [],
      links: { manual: 'https://makita.com.br/manual-hm1317c' }
    });

    modeloRompGrande = store.addModelo({
      grupoId: grupoRompedor,
      fabricante: 'Bosch',
      nomeComercial: 'Rompedor GSH 27 VC',
      tabelaPorLoja: {
        '1': { DIARIA: 65, SEMANA: 350, QUINZENA: 640, D21: 870, MES: 1200 },
        '2': { DIARIA: 70, SEMANA: 380, QUINZENA: 690, D21: 940, MES: 1350 },
      },
      fotos: [],
      links: {}
    });

  } else {
    // Usar modelos existentes (prefixoCodigo removido)
    const modelos = store.modelos;
    modeloBet350 = modelos.find(m => m.nomeComercial.includes('Betoneira'))?.id || modelos[0]?.id || '';
    modeloBet400 = modelos.find(m => m.nomeComercial.includes('400L'))?.id || modelos[0]?.id || '';
    modeloAnd4m = modelos.find(m => m.nomeComercial.includes('Andaime'))?.id || modelos[1]?.id || '';
    modeloAnd6m = modelos.find(m => m.nomeComercial.includes('6m'))?.id || modelos[1]?.id || '';
    modeloComp10hp = modelos.find(m => m.nomeComercial.includes('Compressor'))?.id || modelos[2]?.id || '';
    modeloComp15hp = modelos.find(m => m.nomeComercial.includes('15HP'))?.id || modelos[2]?.id || '';
    modeloEscMini = modelos.find(m => m.nomeComercial.includes('Mini'))?.id || modelos[3]?.id || '';
    modeloEscMedia = modelos.find(m => m.nomeComercial.includes('EC140E'))?.id || modelos[3]?.id || '';
    modeloRompPeq = modelos.find(m => m.nomeComercial.includes('HM1317C'))?.id || modelos[4]?.id || '';
    modeloRompGrande = modelos.find(m => m.nomeComercial.includes('GSH'))?.id || modelos[4]?.id || '';
  }
  
  // Criar equipamentos apenas se não existem
  if (store.equipamentos.length === 0) {
    // Criar equipamentos SERIALIZADO com mais variedade
    const equipamentos = [
      // Betoneiras
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloBet350,
        grupoId: grupoBetoneira,
        numeroSerie: 'BET014',
        valorIndenizacao: 8500,
        saldosPorLoja: {},
        lojaAtualId: '1',
        statusGlobal: 'DISPONIVEL' as const,
        observacoes: 'Betoneira em ótimo estado'
      },
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloBet350,
        grupoId: grupoBetoneira,
        numeroSerie: 'BET015',
        valorIndenizacao: 8500,
        saldosPorLoja: {},
        lojaAtualId: '2',
        statusGlobal: 'LOCADO' as const,
        observacoes: 'Locada para Construtora ABC'
      },
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloBet400,
        grupoId: grupoBetoneira,
        numeroSerie: 'BTI004',
        valorIndenizacao: 12000,
        saldosPorLoja: {},
        lojaAtualId: '1',
        statusGlobal: 'DISPONIVEL' as const,
        observacoes: 'Modelo industrial - alta capacidade'
      },
      
      // Compressores
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloComp10hp,
        grupoId: grupoCompressor,
        numeroSerie: 'COM007',
        valorIndenizacao: 4200,
        saldosPorLoja: {},
        lojaAtualId: '1',
        statusGlobal: 'MANUTENCAO' as const,
        observacoes: 'Aguardando peça - válvula de pressão'
      },
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloComp15hp,
        grupoId: grupoCompressor,
        numeroSerie: 'CO2002',
        valorIndenizacao: 7800,
        saldosPorLoja: {},
        lojaAtualId: '2',
        statusGlobal: 'RESERVADO' as const,
        observacoes: 'Reservado p/ contrato LOC-2024-0789'
      },
      
      // Escavadeiras
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloEscMini,
        grupoId: grupoEscavadeira,
        numeroSerie: 'ESC001',
        valorIndenizacao: 85000,
        saldosPorLoja: {},
        lojaAtualId: '1',
        statusGlobal: 'DISPONIVEL' as const,
        observacoes: 'Mini escavadeira - ideal para espaços pequenos'
      },
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloEscMedia,
        grupoId: grupoEscavadeira,
        numeroSerie: 'ECV001',
        valorIndenizacao: 180000,
        saldosPorLoja: {},
        lojaAtualId: '1',
        statusGlobal: 'LOCADO' as const,
        observacoes: 'Em obra - Construtora XYZ'
      },
      
      // Rompedores
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloRompPeq,
        grupoId: grupoRompedor,
        numeroSerie: 'ROM011',
        valorIndenizacao: 1800,
        saldosPorLoja: {},
        lojaAtualId: '2',
        statusGlobal: 'DISPONIVEL' as const,
        observacoes: 'Rompedor leve - ideal para acabamentos'
      },
      {
        tipo: 'SERIALIZADO' as TipoItem,
        modeloId: modeloRompGrande,
        grupoId: grupoRompedor,
        numeroSerie: 'RMG005',
        valorIndenizacao: 3200,
        saldosPorLoja: {},
        lojaAtualId: '1',
        statusGlobal: 'EM_REVISAO' as const,
        observacoes: 'Retornando de locação - revisão preventiva'
      },
    ];
    
    // Criar equipamentos SALDO (controlados por quantidade)
    const equipamentosSaldo = [
      {
        tipo: 'SALDO' as TipoItem,
        modeloId: modeloAnd4m,
        grupoId: grupoAndaime,
        numeroSerie: [], // Array vazio para SALDO
        valorIndenizacao: 280,
        saldosPorLoja: {
          '1': { qtd: 45 }, // 45 peças na loja 1
          '2': { qtd: 28 }, // 28 peças na loja 2
        },
        statusGlobal: 'DISPONIVEL' as const,
        observacoes: 'Andaimes fachadeiro 4m - conjunto completo'
      },
      {
        tipo: 'SALDO' as TipoItem,
        modeloId: modeloAnd6m,
        grupoId: grupoAndaime,
        numeroSerie: [],
        valorIndenizacao: 420,
        saldosPorLoja: {
          '1': { qtd: 22 },
          '2': { qtd: 18 },
        },
        statusGlobal: 'DISPONIVEL' as const,
        observacoes: 'Andaimes fachadeiro 6m - para obras altas'
      },
    ];
    
    // Adicionar todos os equipamentos
    [...equipamentos, ...equipamentosSaldo].forEach(eq => {
      store.addEquipamento(eq);
    });
    
    // Gerar algumas entradas no histórico de preços (mock)
    const historicoEntries = [
      {
        modeloId: modeloBet350,
        lojaId: '1',
        periodo: 'DIARIA',
        valorAnterior: 80,
        valorNovo: 85,
        descricao: 'Ajuste inflação - Betoneira 350L - Loja SP',
        usuario: 'Admin Sistema',
      },
      {
        modeloId: modeloComp10hp,
        lojaId: '2',
        periodo: 'MES',
        valorAnterior: 800,
        valorNovo: 850,
        descricao: 'Reajuste mensal - Compressor 10HP - Loja RJ',
        usuario: 'Gestor Comercial',
      },
      {
        modeloId: modeloEscMini,
        lojaId: '1',
        periodo: 'SEMANA',
        valorAnterior: 1400,
        valorNovo: 1500,
        descricao: 'Ajuste por demanda - Mini Escavadeira - Loja SP',
        usuario: 'Gerente Regional',
      },
    ];
    
    historicoEntries.forEach(entry => {
      store.addHistoricoPreco(entry);
    });
  }
  
  console.log('✅ Equipamentos seed concluído:', {
    grupos: store.grupos.length,
    modelos: store.modelos.length,
    equipamentos: store.equipamentos.length,
    historicoPrecos: store.historicoPrecos.length,
    lojas: store.lojas.length
  });
  
  // Forçar atualização do localStorage para garantir persistência
  window.dispatchEvent(new Event('storage'));
}