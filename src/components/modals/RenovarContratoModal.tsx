import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Contrato, Titulo } from "@/types";
import { aplicarPolitica, ResultadoPolitica } from "@/services/politicasEngine";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useNumeracao } from "@/hooks/useNumeracao";
import RegistrarRecebimentoModal from "@/components/contas-receber/RegistrarRecebimentoModal";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";

// Helper para formatar datas sem conversão de timezone
const formatarDataSemTimezone = (dataISO: string): string => {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString('pt-BR');
};

interface RenovarContratoModalProps {
  contrato?: Contrato;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  itensSelecionados?: string[];
  modo?: 'manter' | 'editar';
}

export default function RenovarContratoModal({
  contrato: contratoInicial,
  open,
  onOpenChange,
  onSuccess,
  itensSelecionados = [],
  modo = 'editar',
}: RenovarContratoModalProps) {
  const contrato = contratoInicial; // Usar prop diretamente sem estado local
  const [periodo, setPeriodo] = useState<'1' | '7' | '14' | '21' | '28'>('28');
  const [novaDataInicio, setNovaDataInicio] = useState('');
  const [numPeriodos, setNumPeriodos] = useState(1);
  const [formaCobranca, setFormaCobranca] = useState<'BOLETO' | 'PIX' | 'CARTAO' | 'DINHEIRO'>('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [clienteInadimplente, setClienteInadimplente] = useState(false);
  const [titulosVencidos, setTitulosVencidos] = useState<Titulo[]>([]);
  const [showRecebimentoModal, setShowRecebimentoModal] = useState(false);
  const [renovacaoDadosPreservados, setRenovacaoDadosPreservados] = useState<any>(null);
  const [showAvisoAutomatico, setShowAvisoAutomatico] = useState(false);
  const [politicaAplicada, setPoliticaAplicada] = useState<ResultadoPolitica | null>(null);
  const [isRenovando, setIsRenovando] = useState(false);
  const { toast } = useToast();
  const { updateContrato } = useSupabaseContratos();
  const { createTitulo, titulos } = useSupabaseTitulos(contrato?.lojaId, contrato?.clienteId);
  const { gerarNumero } = useNumeracao();
  const { addHistoricoEvent } = useSupabaseEquipamentos();

  // Calcular nova data de início (mesma data de término - diárias de 24h)
  React.useEffect(() => {
    if (contrato && open) {
      const dataFimOriginal = contrato.dataFim;
      setNovaDataInicio(dataFimOriginal);

      // No modo "manter", preservar período e forma do contrato original
      if (modo === 'manter') {
        // Detectar período dos itens do contrato
        const primeiroItem = contrato.itens?.[0] as any;
        if (primeiroItem) {
          const periodoItem = primeiroItem.periodo || primeiroItem.periodo_base;
          const mapPeriodo: Record<string, '1' | '7' | '14' | '21' | '28'> = {
            'DIARIA': '1', 'D1': '1', '1': '1',
            'SEMANA': '7', 'D7': '7', '7': '7',
            'QUINZENA': '14', 'D14': '14', '14': '14',
            '21DIAS': '21', 'D21': '21', '21': '21',
            'MENSAL': '28', 'D28': '28', '28': '28',
          };
          if (periodoItem && mapPeriodo[periodoItem]) {
            setPeriodo(mapPeriodo[periodoItem]);
          }
        }
        // Preservar forma de cobrança
        const formaOriginal = (contrato as any).formaPagamento || (contrato as any).forma_pagamento;
        if (formaOriginal) {
          const mapForma: Record<string, 'BOLETO' | 'PIX' | 'CARTAO' | 'DINHEIRO'> = {
            'Boleto': 'BOLETO', 'BOLETO': 'BOLETO',
            'PIX': 'PIX', 'Pix': 'PIX',
            'Cartão': 'CARTAO', 'CARTAO': 'CARTAO',
            'Dinheiro': 'DINHEIRO', 'DINHEIRO': 'DINHEIRO',
          };
          if (mapForma[formaOriginal]) {
            setFormaCobranca(mapForma[formaOriginal]);
          }
        }
        setNumPeriodos(1);
      }

      // Verificar se cliente é inadimplente
      const titulosVencidosCliente = titulos?.filter(t => 
        t.clienteId === contrato.clienteId && 
        t.saldo > 0 && 
        new Date(t.vencimento) < new Date()
      ) || [];
      setTitulosVencidos(titulosVencidosCliente);
      setClienteInadimplente(titulosVencidosCliente.length > 0);
    }
  }, [open, titulos, modo]);

  // Preservar dados da renovação quando abrindo modal de recebimento
  const handlePagarERenovar = () => {
    setRenovacaoDadosPreservados({
      periodo,
      novaDataInicio,
      numPeriodos,
      formaCobranca,
      observacoes
    });
    setShowRecebimentoModal(true);
  };

  // Callback após recebimento bem-sucedido
  const handleRecebimentoSuccess = () => {
    setShowRecebimentoModal(false);
    
    // Verificar se cliente ainda é inadimplente
    const titulosVencidosAtualizados = titulos?.filter(t => 
      t.clienteId === contrato!.clienteId && 
      t.saldo > 0 && 
      new Date(t.vencimento) < new Date()
    ) || [];
    
    if (titulosVencidosAtualizados.length === 0) {
      // Cliente regularizado - reabrir modal renovar
      setClienteInadimplente(false);
      setTitulosVencidos([]);
      
      toast({
        title: "Cliente regularizado ✓",
        description: "Agora você pode renovar o contrato.",
        duration: 2000
      });
      
      // Focar no botão confirmar renovação
      setTimeout(() => {
        const btnRenovar = document.querySelector('[data-renovar-focus]') as HTMLElement;
        if (btnRenovar) btnRenovar.focus();
      }, 100);
      
    } else {
      const saldoRestante = titulosVencidosAtualizados.reduce((sum, t) => sum + t.saldo, 0);
      toast({
        title: "Saldo restante",
        description: `Ainda há R$ ${saldoRestante.toLocaleString('pt-BR')} em atraso.`,
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const calcularNovaDataFim = () => {
    if (!novaDataInicio) return null;
    
    console.log('[calcularNovaDataFim] Input:', novaDataInicio);
    
    // Parse da data sem timezone usando Date local
    const [ano, mes, dia] = novaDataInicio.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, dia);
    
    console.log('[calcularNovaDataFim] Data início parseada:', {
      ano, mes, dia,
      dataInicio: dataInicio.toISOString(),
      dataInicioLocal: dataInicio.toLocaleDateString('pt-BR')
    });
    
    const diasPorPeriodo = parseInt(periodo);
    const totalDias = diasPorPeriodo * numPeriodos;
    
    // Adicionar os dias do período (diárias de 24h)
    // Se começa dia 15/10 e aluga por 1 dia, termina dia 16/10 (15 + 1 = 16)
    // Se começa dia 15/10 e aluga por 7 dias, termina dia 22/10 (15 + 7 = 22)
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + totalDias);
    
    console.log('[calcularNovaDataFim] Data fim calculada:', {
      totalDias,
      dataFim: dataFim.toISOString(),
      dataFimLocal: dataFim.toLocaleDateString('pt-BR')
    });
    
    return dataFim;
  };

  // Calcular valor da renovação com políticas comerciais
  const valorRenovacao = useMemo(() => {
    if (!contrato) {
      console.warn('⚠️ Contrato não fornecido');
      return { valor: 0, politica: null };
    }
    
    const itensParaRenovar = itensSelecionados.length > 0 
      ? contrato.itens.filter(item => itensSelecionados.includes(item.id))
      : contrato.itens;

    console.log('📦 Itens para renovar:', itensParaRenovar);
    console.log('📊 Período selecionado:', periodo);
    console.log('🔢 Número de períodos:', numPeriodos);

    let valorTotal = 0;
    const itensComPreco: any[] = [];
    const erros: string[] = [];

    itensParaRenovar.forEach((item: any) => {
      // Usar o preço unitário que já vem do item do contrato
      // Calcular preço proporcional se o período mudou
      const diasPeriodoAtual = 
        item.periodo === 'DIARIA' || item.periodo === 'D1' ? 1 
        : item.periodo === 'SEMANA' || item.periodo === 'D7' ? 7
        : item.periodo === 'QUINZENA' || item.periodo === 'D14' ? 14
        : item.periodo === '21DIAS' || item.periodo === 'D21' ? 21
        : 28;
      
      const precoAtual = item.preco_unitario || item.valorUnitario || 0;
      const precoAtualPorDia = precoAtual / diasPeriodoAtual;
      const diasNovoPeriodo = parseInt(periodo);
      const precoNovoPeriodo = precoAtualPorDia * diasNovoPeriodo;
      
      // Calcular subtotal = preço novo período * quantidade * número de períodos
      const subtotal = precoNovoPeriodo * item.quantidade * numPeriodos;
      valorTotal += subtotal;
      
      const nomeItem = item.equipamento?.nome || item.modelo?.nome || item.equipamento?.codigo || 'Item';
      console.log(`📊 ${nomeItem}: R$ ${precoNovoPeriodo.toFixed(2)} × ${item.quantidade} × ${numPeriodos} = R$ ${subtotal.toFixed(2)}`);
      
      itensComPreco.push({
        modeloId: item.modeloId || item.equipamento?.modeloId,
        grupoId: item.grupoId || item.equipamento?.grupoId,
        qtd: item.quantidade,
        precoTabela: precoNovoPeriodo * numPeriodos,
      });
    });

    console.log(`💰 Valor total calculado (antes da política): R$ ${valorTotal.toFixed(2)}`);

    // Aplicar política se configurada
    if (contrato.cliente?.politicaComercial && contrato.cliente.aplicarPoliticaAuto !== false && itensComPreco.length > 0) {
      try {
        console.log('🎯 Aplicando política comercial:', contrato.cliente.politicaComercial);
        const resultado = aplicarPolitica({
          cliente: {
            id: contrato.cliente.id,
            politica: contrato.cliente.politicaComercial,
            aplicarAuto: contrato.cliente.aplicarPoliticaAuto,
          },
          lojaId: contrato.lojaId || '1',
          periodoDias: parseInt(periodo) as 1 | 7 | 14 | 21 | 28,
          itens: itensComPreco,
          dataEventoISO: novaDataInicio || new Date().toISOString().split('T')[0],
        });
        
        console.log(`🎯 Política aplicada: ${resultado.descontoPctContrato}% de desconto = R$ ${resultado.totalComDesconto}`);
        return { valor: resultado.totalComDesconto, politica: resultado };
      } catch (error) {
        console.error('❌ Erro ao aplicar política:', error);
        return { valor: valorTotal, politica: null };
      }
    }

    console.log(`💰 Valor final (sem política): R$ ${valorTotal}`);
    return { valor: valorTotal, politica: null };
  }, [contrato, periodo, numPeriodos, novaDataInicio, itensSelecionados]);

  // Atualizar estado da política quando o valor mudar
  React.useEffect(() => {
    setPoliticaAplicada(valorRenovacao.politica);
  }, [valorRenovacao.politica]);

  const handleSubmit = async () => {
    if (!contrato) {
      toast({
        title: "Erro",
        description: "Nenhum contrato selecionado.",
        variant: "destructive"
      });
      return;
    }

    // Proteção contra duplo clique
    if (isRenovando) {
      console.log('[RenovarContrato] Renovação já em andamento, ignorando...');
      return;
    }

    if (clienteInadimplente) {
      toast({
        title: "Cliente inadimplente",
        description: "Este cliente possui títulos vencidos. Utilize 'Pagar e Renovar' ou quite as pendências primeiro.",
        variant: "destructive"
      });
      return;
    }

    const novaDataFim = calcularNovaDataFim();
    if (!novaDataFim) {
      toast({
        title: "Erro",
        description: "Data de fim inválida.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setIsRenovando(true);

    try {
      const novaDataFim = calcularNovaDataFim();
      if (!novaDataFim) throw new Error('Data de fim inválida');

      const valorRenovacaoCalculado = valorRenovacao.valor;
      
      // Formatar datas no formato ISO YYYY-MM-DD
      const dataFimFormatada = novaDataFim.toISOString().split('T')[0];
      const dataInicioFormatada = new Date(novaDataInicio).toISOString().split('T')[0];
      
      console.log('[RenovarContrato] Datas formatadas para Supabase:', {
        dataInicioOriginal: novaDataInicio,
        dataInicioFormatada,
        dataFimFormatada,
        // Verificar se está mantendo as datas corretas
        verificacao: {
          inicioMatch: novaDataInicio === dataInicioFormatada,
          fimCorreto: dataFimFormatada
        }
      });

      // Validação de sanidade
      if (novaDataInicio !== dataInicioFormatada) {
        console.warn('⚠️ AVISO: Data de início foi modificada na formatação!', {
          esperado: novaDataInicio,
          obtido: dataInicioFormatada
        });
      }
      
      // Calcular novo valor total do contrato (valor original + renovação)
      const valorOriginal = Number(contrato.valorTotal) || 0;
      const novoValorTotal = valorOriginal + valorRenovacaoCalculado;
      
      // Teste de timezone (apenas para debug)
      console.log('[RenovarContrato] Teste de timezone:', {
        dataFimString: contrato.dataFim,
        novaDataInicioString: novaDataInicio,
        // Conversão direta (pode causar problema)
        conversaoDireta: new Date(novaDataInicio).toLocaleDateString('pt-BR'),
        // Conversão via parse manual (correto)
        conversaoManual: (() => {
          const [a, m, d] = novaDataInicio.split('-').map(Number);
          return new Date(a, m - 1, d).toLocaleDateString('pt-BR');
        })(),
        // ISO string
        isoString: new Date(novaDataInicio).toISOString(),
        // Timezone offset
        timezoneOffset: new Date().getTimezoneOffset()
      });
      
      console.log('[RenovarContrato] Payload da atualização:', {
        id: contrato.id,
        data_inicio_atual: contrato.dataInicio,
        data_fim_atual: contrato.dataFim,
        nova_data_inicio: dataInicioFormatada,
        nova_data_fim: dataFimFormatada,
        valorOriginal,
        valorRenovacao: valorRenovacaoCalculado,
        novoValorTotal
      });

      // Atualizar contrato no Supabase
      const timelineAtualizado = [
        ...(contrato.timeline || []),
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          usuarioId: "1",
          usuarioNome: "Admin",
          tipo: "RENOVACAO",
          resumo: `Renovação: ${numPeriodos}x ${periodo} dias - R$ ${valorRenovacaoCalculado.toLocaleString('pt-BR')} (Total atualizado: R$ ${novoValorTotal.toLocaleString('pt-BR')})`,
        }
      ];

      console.log('[RenovarContrato] Atualizando contrato...');
      const resultado = await updateContrato.mutateAsync({
        id: String(contrato.id),
        data_inicio: dataInicioFormatada, // Atualizar também o início
        data_fim: dataFimFormatada,
        data_prevista_fim: dataFimFormatada,
        valor_total: novoValorTotal,
        status: 'ATIVO',
        timeline: timelineAtualizado as any,
      });

      console.log('[RenovarContrato] Resultado da atualização:', resultado);
      
      // Verificar se a atualização foi bem-sucedida
      const { data: contratoAtualizado, error: verificacaoError } = await supabase
        .from('contratos')
        .select('data_inicio, data_fim, valor_total')
        .eq('id', String(contrato.id))
        .single();

      if (verificacaoError) {
        console.error('[RenovarContrato] Erro ao verificar atualização:', verificacaoError);
        throw new Error('Falha ao verificar atualização do contrato');
      }

      console.log('[RenovarContrato] Contrato após atualização:', contratoAtualizado);

      // Validar que os campos foram atualizados corretamente
      if (!contratoAtualizado.data_fim || contratoAtualizado.data_fim !== dataFimFormatada) {
        console.error('[RenovarContrato] FALHA NA VALIDAÇÃO:', {
          esperado: dataFimFormatada,
          obtido: contratoAtualizado.data_fim
        });
        throw new Error(`Falha na atualização: data_fim esperada ${dataFimFormatada}, obtida ${contratoAtualizado.data_fim}`);
      }

      if (Number(contratoAtualizado.valor_total) !== novoValorTotal) {
        console.error('[RenovarContrato] FALHA NA VALIDAÇÃO:', {
          esperado: novoValorTotal,
          obtido: contratoAtualizado.valor_total
        });
        throw new Error(`Falha na atualização: valor_total esperado ${novoValorTotal}, obtido ${contratoAtualizado.valor_total}`);
      }

      console.log('[RenovarContrato] ✅ Validação pós-atualização OK');

      // Gerar título para renovação no Supabase
      const numeroTitulo = await gerarNumero('titulo');
      console.log('[RenovarContrato] Criando título de renovação:', {
        numeroTitulo,
        valor: valorRenovacaoCalculado,
        subcategoria: 'Renovação'
      });
      
      try {
        await createTitulo.mutateAsync({
          loja_id: contrato.lojaId,
          cliente_id: contrato.clienteId,
          contrato_id: contrato.id,
          numero: numeroTitulo,
          categoria: 'Locação',
          subcategoria: 'Renovação',
          descricao: `Renovação do contrato ${contrato.numero} - ${numPeriodos}x ${periodo} dias`,
          origem: 'CONTRATO',
          emissao: new Date().toISOString(),
          vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          valor: valorRenovacaoCalculado,
          pago: 0,
          saldo: valorRenovacaoCalculado,
          forma: formaCobranca === 'BOLETO' ? 'Boleto' : formaCobranca === 'PIX' ? 'PIX' : formaCobranca === 'CARTAO' ? 'Cartão' : 'Dinheiro',
          status: 'EM_ABERTO',
          timeline: [{
            timestamp: new Date().toISOString(),
            tipo: 'criacao',
            descricao: 'Título criado por renovação de contrato',
            usuario: 'Admin',
          }],
        });
        console.log('[RenovarContrato] Título de renovação criado com sucesso');
      } catch (tituloError) {
        console.error('[RenovarContrato] ERRO ao criar título:', tituloError);
        throw new Error('Falha ao criar título de renovação');
      }

      // Criar aditivo de renovação com número amigável
      try {
        console.log('[RenovarContrato] Gerando número de renovação...');
        
        // Buscar todas as renovações existentes para gerar o próximo número
        const { data: renovacoesExistentes, error: queryError } = await supabase
          .from('aditivos_contratuais')
          .select('numero')
          .eq('contrato_id', String(contrato.id))
          .eq('tipo', 'RENOVACAO')
          .order('criado_em', { ascending: true });

        if (queryError) {
          console.error('[RenovarContrato] Erro ao buscar renovações:', queryError);
        }

        // Calcular próximo sequencial
        const totalRenovacoes = renovacoesExistentes?.length || 0;
        const proximoSequencial = totalRenovacoes + 1;
        const numeroRenovacao = `${contrato.numero}.${proximoSequencial}`;

        console.log('[RenovarContrato] Criando aditivo de renovação com número:', numeroRenovacao);
        
        const { data: aditivo, error: aditivoError } = await supabase
          .from('aditivos_contratuais')
          .insert([{
            contrato_id: String(contrato.id),
            loja_id: String(contrato.lojaId),
            numero: numeroRenovacao,
            tipo: 'RENOVACAO',
            descricao: `Renovação do contrato ${contrato.numero} - ${numPeriodos}x ${periodo} dias`,
            justificativa: observacoes || 'Renovação do período de locação',
            valor: valorRenovacaoCalculado,
            vinculacao: 'CONTRATO',
            status: 'ATIVO',
            criado_por: null,
          }])
          .select()
          .single();

        if (aditivoError) {
          console.error('[RenovarContrato] ERRO ao criar aditivo:', aditivoError);
        } else {
          console.log('[RenovarContrato] Aditivo criado com sucesso:', aditivo);
        }
      } catch (aditivoError) {
        console.error('[RenovarContrato] ERRO ao criar aditivo:', aditivoError);
        // Não bloqueia a renovação se o aditivo falhar
      }

      // Registrar evento no histórico dos equipamentos
      console.log('[RenovarContrato] Registrando eventos nos equipamentos...');
      for (const item of contrato.itens) {
        if (item.equipamentoId) {
          try {
            await addHistoricoEvent.mutateAsync({
              equipamentoId: item.equipamentoId,
              event: {
                tipo: 'CONTRATO_RENOVADO',
                descricao: `Contrato ${contrato.numero} renovado - ${numPeriodos}x ${periodo} dias`,
                usuario: 'Admin',
                meta: {
                  contratoId: String(contrato.id),
                  contratoNumero: contrato.numero,
                  periodoAnterior: `${contrato.dataInicio} até ${contrato.dataFim}`,
                  novaDataFim: dataFimFormatada,
                  valorRenovacao: valorRenovacaoCalculado,
                }
              }
            });
          } catch (eventError) {
            console.error('[RenovarContrato] Erro ao registrar evento no equipamento:', eventError);
            // Não bloquear o fluxo, apenas logar
          }
        }
      }

      toast({
        title: "Contrato renovado",
        description: `Renovação de ${numPeriodos}x ${periodo} dias realizada com sucesso!`,
        duration: 2000
      });

      // Verificar preferência de aviso automático
      const hoje = new Date().toISOString().split('T')[0];
      const naoSugerirHoje = localStorage.getItem(`autoSendAfterRenewal_${hoje}`) === 'false';
      
      if (!naoSugerirHoje) {
        setShowAvisoAutomatico(true);
      }

      onSuccess?.();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('[RenovarContrato] ERRO:', error);
      toast({
        title: "Erro ao renovar contrato",
        description: error.message || "Não foi possível renovar o contrato. Verifique os logs do console.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setLoading(false);
      setIsRenovando(false);
    }
  };

  const novaDataFim = calcularNovaDataFim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔄 Renovar Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {contrato && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Contrato:</p>
                    <p>{contrato.numero}</p>
                  </div>
                  <div>
                    <p className="font-medium">Cliente:</p>
                    <p>{contrato.cliente.nomeRazao}</p>
                  </div>
              <div>
                <p className="font-medium">Período Vigente:</p>
                <p>
                  {formatarDataSemTimezone(contrato.dataInicio)} - {formatarDataSemTimezone(contrato.dataFim)}
                </p>
              </div>
              <div>
                <p className="font-medium">Valor Acumulado:</p>
                <p className="font-bold text-primary">R$ {contrato.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              {contrato.timeline?.some((evt: any) => evt.tipo === 'RENOVACAO') && (
                <div className="col-span-2 text-sm text-muted-foreground border-t pt-2 flex items-center gap-2">
                  <span>💡</span>
                  <span>Este contrato já foi renovado anteriormente</span>
                </div>
              )}
                   {itensSelecionados.length > 0 && (
                     <div className="col-span-2">
                       <p className="font-medium">Itens Selecionados:</p>
                       <p className="text-sm text-muted-foreground">{itensSelecionados.length} de {contrato.itens.length} itens</p>
                     </div>
                   )}
                </div>
                {clienteInadimplente && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive font-medium">⚠️ Cliente inadimplente</p>
                    <p className="text-sm text-destructive">Este cliente possui títulos vencidos.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

           <div className="grid grid-cols-3 gap-4">
             <div>
               <Label>Período Base *</Label>
               <div className="mt-2 space-y-2">
                 {(['1', '7', '14', '21', '28'] as const).map((dias) => (
                   <div key={dias} className="flex items-center space-x-2">
                     <input
                       type="radio"
                       id={`periodo-${dias}`}
                       name="periodo"
                       value={dias}
                       checked={periodo === dias}
                       onChange={(e) => setPeriodo(e.target.value as any)}
                     />
                     <Label htmlFor={`periodo-${dias}`}>
                       {dias === '1' ? 'Diária' : `${dias} dias`}
                     </Label>
                   </div>
                 ))}
               </div>
             </div>

             <div>
               <Label htmlFor="numPeriodos">Quantidade de Períodos *</Label>
               <Input
                 id="numPeriodos"
                 type="number"
                 min="1"
                 max="12"
                 value={numPeriodos}
                 onChange={(e) => setNumPeriodos(parseInt(e.target.value) || 1)}
                 className="mt-1"
               />
               <p className="text-sm text-muted-foreground mt-1">
                 Total: {parseInt(periodo) * numPeriodos} dias
               </p>
             </div>

             <div>
               <Label htmlFor="formaCobranca">Forma de Cobrança *</Label>
               <select
                 id="formaCobranca"
                 value={formaCobranca}
                 onChange={(e) => setFormaCobranca(e.target.value as any)}
                 className="w-full mt-1 px-3 py-2 bg-input border border-input-border rounded-md text-foreground"
               >
                 <option value="PIX">PIX</option>
                 <option value="BOLETO">Boleto</option>
                 <option value="CARTAO">Cartão</option>
                 <option value="DINHEIRO">Dinheiro</option>
               </select>
             </div>
           </div>
           
           <div>
             <Label htmlFor="novaDataInicio">Nova Data de Início (Automática)</Label>
             <div className="mt-1 flex items-center gap-2">
               <Input
                 id="novaDataInicio"
                 type="date"
                 value={novaDataInicio}
                 readOnly
                 disabled
                 className="bg-muted cursor-not-allowed"
               />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  📅 Calculada automaticamente (mesma data de término do período atual - diárias de 24h)
                </span>
              </div>
            </div>

           {calcularNovaDataFim() && (
             <Card>
               <CardContent className="p-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <p className="font-medium">Novo período:</p>
                     <p className="text-primary font-bold">
                       {formatarDataSemTimezone(novaDataInicio)} - {calcularNovaDataFim()!.toLocaleDateString('pt-BR')}
                     </p>
                   </div>
                    <div>
                      <p className="font-medium">Valor da renovação:</p>
                      <p className="text-primary font-bold">R$ {valorRenovacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      {politicaAplicada && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ✓ Desconto de {politicaAplicada.descontoPctContrato}% aplicado
                        </p>
                      )}
                    </div>
                 </div>
               </CardContent>
             </Card>
           )}

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Observações sobre a renovação..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {clienteInadimplente ? (
            <Button variant="destructive" disabled>
              Pagar e Renovar
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !contrato} data-renovar-focus>
              {loading ? "Processando..." : "Confirmar Renovação"}
            </Button>
          )}
          {clienteInadimplente && (
            <Button onClick={handlePagarERenovar} className="ml-2">
              💵 Pagar e Renovar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Modal de Recebimento para Pagar e Renovar */}
      {titulosVencidos[0] && (
        <RegistrarRecebimentoModal
          titulo={titulosVencidos[0]}
          open={showRecebimentoModal}
          onOpenChange={setShowRecebimentoModal}
          onSuccess={handleRecebimentoSuccess}
        />
      )}

      {/* Snackbar de Aviso Automático */}
      {showAvisoAutomatico && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Contrato renovado ✓</span>
            <button 
              onClick={() => setShowAvisoAutomatico(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Enviar aviso ao cliente?
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => {
                // Simular envio de aviso
                toast({
                  title: "Aviso enviado",
                  description: "WhatsApp enviado ao cliente (mock)",
                });
                setShowAvisoAutomatico(false);
              }}
            >
              📱 Enviar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                const hoje = new Date().toISOString().split('T')[0];
                localStorage.setItem(`autoSendAfterRenewal_${hoje}`, 'false');
                setShowAvisoAutomatico(false);
              }}
            >
              Não hoje
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}