import { useVeiculosStore } from '@/stores/veiculosStore';

export const seedVeiculosData = () => {
  const store = useVeiculosStore.getState();
  
  // Check if data already exists
  if (store.veiculos.length > 0) {
    console.log('✅ Dados de veículos já existem, pulando seed');
    return;
  }

  console.log('🔄 Iniciando seed de dados de veículos...');

  // Seed Óleos
  const oleos = [
    {
      tipo_especificacao: '15W-40 Mineral',
      intervalo_km: 10000,
      intervalo_meses: 6,
      obs: 'Óleo mineral para uso geral'
    },
    {
      tipo_especificacao: '5W-30 Sintético',
      intervalo_km: 15000,
      intervalo_meses: 12,
      obs: 'Óleo sintético premium'
    },
    {
      tipo_especificacao: '20W-50 Heavy Duty',
      intervalo_km: 8000,
      intervalo_meses: 4,
      obs: 'Para equipamentos pesados'
    }
  ];

  oleos.forEach(oleo => store.addOleo(oleo));

  // Seed Postos
  const postos = [
    {
      nome: 'Posto Shell Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cnpj: '12.345.678/0001-90',
      obs: 'Posto principal do centro'
    },
    {
      nome: 'Ipiranga Norte',
      cidade: 'São Paulo',
      uf: 'SP',
      cnpj: '98.765.432/0001-10',
      obs: 'Posto da zona norte'
    },
    {
      nome: 'BR Distribuidora',
      cidade: 'Rio de Janeiro',
      uf: 'RJ'
    }
  ];

  postos.forEach(posto => store.addPosto(posto));

  // Seed Serviços
  const servicos = [
    {
      grupo: 'Motor',
      servico_especifico: 'Troca de óleo',
      criticidade: 'MEDIA' as const
    },
    {
      grupo: 'Motor',
      servico_especifico: 'Revisão completa',
      criticidade: 'ALTA' as const
    },
    {
      grupo: 'Suspensão',
      servico_especifico: 'Troca de amortecedores',
      criticidade: 'ALTA' as const
    },
    {
      grupo: 'Freios',
      servico_especifico: 'Troca de pastilhas',
      criticidade: 'ALTA' as const
    },
    {
      grupo: 'Elétrica',
      servico_especifico: 'Revisão sistema elétrico',
      criticidade: 'MEDIA' as const
    }
  ];

  servicos.forEach(servico => store.addServico(servico));

  // Get current state after adding services
  const currentState = store;
  const servicosAdicionados = currentState.servicos;

  // Seed Oficinas
  const oficinas = [
    {
      nome: 'Auto Mecânica Silva',
      cidade: 'São Paulo',
      uf: 'SP',
      contato: '(11) 1234-5678',
      obs: 'Especializada em motores',
      servicos_ids: servicosAdicionados.length >= 2 ? [servicosAdicionados[0]?.id, servicosAdicionados[1]?.id].filter(Boolean) : []
    },
    {
      nome: 'Oficina do João',
      cidade: 'São Paulo',
      uf: 'SP',
      contato: '(11) 9876-5432',
      servicos_ids: servicosAdicionados.length >= 4 ? [servicosAdicionados[2]?.id, servicosAdicionados[3]?.id].filter(Boolean) : []
    },
    {
      nome: 'Multi Serviços RJ',
      cidade: 'Rio de Janeiro',
      uf: 'RJ',
      contato: '(21) 5555-0000',
      servicos_ids: servicosAdicionados.map(s => s?.id).filter(Boolean)
    }
  ];

  oficinas.forEach(oficina => store.addOficina(oficina));

  // Seed Veículos
  const lojas = ['loja-1', 'loja-2', 'loja-3'];
  const veiculos = [
    {
      placa: 'ABC-1234',
      codigo_interno: 'VEI001',
      fabricante: 'Volkswagen',
      modelo: 'Amarok',
      tipo: 'carro' as const,
      ano_fab: 2020,
      ano_mod: 2021,
      combustivel: 'D' as const,
      cap_tanque_l: 80,
      odometro_atual: 45000,
      loja_id: lojas[0],
      status: 'OPERANDO' as const
    },
    {
      placa: 'DEF-5678',
      codigo_interno: 'VEI002',
      fabricante: 'Ford',
      modelo: 'Ranger',
      tipo: 'caminhão' as const,
      ano_fab: 2019,
      ano_mod: 2019,
      combustivel: 'D' as const,
      cap_tanque_l: 100,
      odometro_atual: 62000,
      loja_id: lojas[0],
      status: 'OPERANDO' as const
    },
    {
      placa: 'GHI-9012',
      codigo_interno: 'VEI003',
      fabricante: 'Honda',
      modelo: 'CG 160',
      tipo: 'moto' as const,
      ano_fab: 2022,
      ano_mod: 2022,
      combustivel: 'G' as const,
      cap_tanque_l: 16,
      odometro_atual: 8500,
      loja_id: lojas[1],
      status: 'OPERANDO' as const
    },
    {
      placa: 'JKL-3456',
      codigo_interno: 'VEI004',
      fabricante: 'Mercedes-Benz',
      modelo: 'Sprinter',
      tipo: 'furgão' as const,
      ano_fab: 2021,
      ano_mod: 2021,
      combustivel: 'D' as const,
      cap_tanque_l: 75,
      odometro_atual: 28000,
      loja_id: lojas[1],
      status: 'OFICINA' as const,
      observacao: 'Em manutenção preventiva'
    },
    {
      placa: 'MNO-7890',
      codigo_interno: 'VEI005',
      fabricante: 'Chevrolet',
      modelo: 'S10',
      tipo: 'carro' as const,
      ano_fab: 2018,
      ano_mod: 2018,
      combustivel: 'Flex' as const,
      cap_tanque_l: 70,
      odometro_atual: 85000,
      loja_id: lojas[2],
      status: 'OPERANDO' as const
    }
  ];

  veiculos.forEach(veiculo => {
    store.addVeiculo(veiculo);
    // Configurar óleo padrão para cada veículo
    const veiculoId = store.veiculos[store.veiculos.length - 1]?.id;
    const oleoIndex = veiculo.tipo === 'moto' ? 0 : veiculo.tipo === 'caminhão' ? 2 : 1;
    const oleoId = store.oleos[oleoIndex]?.id;
    
    if (veiculoId && oleoId) {
      store.setVeiculoOleo(veiculoId, oleoId);
    }
  });

  // Seed some maintenance and fuel data
  const veiculosCreated = store.veiculos;
  
  // Add some fuel records
  veiculosCreated.slice(0, 3).forEach((veiculo, index) => {
    const postoId = store.postos[index % store.postos.length]?.id;
    
    if (!postoId) return;
    
    // Add 3 fuel records per vehicle with different dates
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const dataAbastecimento = new Date(today.getTime() - (i * 15 + 5) * 24 * 60 * 60 * 1000);
      const kmAnterior = veiculo.odometro_atual - (3 - i) * 500;
      
      store.addAbastecimento({
        veiculo_id: veiculo.id,
        data: dataAbastecimento.toISOString().split('T')[0],
        posto_id: postoId,
        preco_litro: 5.5 + Math.random() * 1,
        litros: veiculo.cap_tanque_l * (0.8 + Math.random() * 0.2),
        km_atual: kmAnterior + 500
      });
    }
  });

  // Add some oil changes
  veiculosCreated.slice(0, 2).forEach((veiculo) => {
    const oleo = store.getVeiculoOleoAtual(veiculo.id);
    if (oleo) {
      const dataUltimaTroca = new Date();
      dataUltimaTroca.setDate(dataUltimaTroca.getDate() - 60);
      
      store.addTrocaOleo({
        veiculo_id: veiculo.id,
        data: dataUltimaTroca.toISOString().split('T')[0],
        oleo_id: oleo.id,
        trocou_filtro: true,
        trocou_filtro_combustivel: Math.random() > 0.5,
        custo_total: 150 + Math.random() * 100,
        km_atual: veiculo.odometro_atual - 8000
      });
    }
  });

  // Add some maintenance records
  const oficinaPrincipal = store.oficinas[0];
  const servicoPrincipal = store.servicos[1]; // Revisão completa
  
  // Create maintenance for the vehicle in OFICINA status
  const veiculoOficina = veiculosCreated.find(v => v.status === 'OFICINA');
  if (veiculoOficina && oficinaPrincipal && servicoPrincipal) {
    const osId = store.abrirOS({
      veiculo_id: veiculoOficina.id,
      oficina_id: oficinaPrincipal.id,
      grupo_id: 'motor',
      servico_id: servicoPrincipal.id,
      descricao: 'Revisão preventiva programada',
      km_entrada: veiculoOficina.odometro_atual,
      dt_entradaISO: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });

    console.log(`📝 OS criada: ${osId}`);
  }

  console.log(`✅ Seed completo:
  - ${store.veiculos.length} veículos
  - ${store.postos.length} postos  
  - ${store.oleos.length} tipos de óleo
  - ${store.oficinas.length} oficinas
  - ${store.servicos.length} serviços
  - ${store.abastecimentos.length} abastecimentos
  - ${store.trocas_oleo.length} trocas de óleo
  - ${store.manutencoes.length} ordens de serviço`);
};