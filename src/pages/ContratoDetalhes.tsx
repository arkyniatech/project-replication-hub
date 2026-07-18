// @ts-nocheck
// TODO: Remove @ts-nocheck and fix type issues
import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseFaturas } from "@/hooks/useSupabaseFaturas";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useSupabaseAditivos } from "@/hooks/useSupabaseAditivos";
import { useToast } from "@/hooks/use-toast";
import { ContratoHeader } from "@/components/contratos/ContratoHeader";
import { FinanceiroCompacto } from "@/components/contratos/FinanceiroCompacto";
import { LogisticaCard } from "@/components/contratos/LogisticaCard";
import { OSLogisticaDialog, ReagendarLogisticaDialog } from "@/components/contratos/LogisticaContratoDialogs";
import { ItensList } from "@/components/contratos/ItensList";
import { ClienteEObra } from "@/components/contratos/ClienteEObra";
import { ObservacoesInternas } from "@/components/contratos/ObservacoesInternas";
import AditivosTab from "@/components/contratos/AditivosTab";
import AnexosTab from "@/components/contratos/AnexosTab";
import { Alertas } from "@/components/contratos/Alertas";
import RenovarContratoModal from "@/components/modals/RenovarContratoModal";
import DevolucaoModal from "@/components/modals/DevolucaoModal";
import SubstituicaoModal from "@/components/modals/SubstituicaoModal";
import { CancelarContratoModal } from "@/components/modals/CancelarContratoModal";
import ConfirmarRetiradaModal from "@/components/modals/ConfirmarRetiradaModal";
import EmitirFaturaModal from "@/components/modals/EmitirFaturaModal";
import { parseISO, differenceInCalendarDays, startOfDay, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatCodigoExibicao } from "@/lib/equipamentos-utils";
import { useEffect } from "react";
import { gerarContratoPDFBase64, downloadContratoPDF } from "@/utils/contrato-pdf";
import { ContratoResumoPreview } from "@/components/contratos/ContratoResumoPreview";

export default function ContratoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const initialTab = searchParams.get('tab') || 'geral';
  
  const { useContrato, updateContrato, cancelContrato, confirmarRetirada, cancelarDevolucao } = useSupabaseContratos();
  const { data: contratoSupabase, isLoading: loading } = useContrato(id || '');
  
  // Buscar faturas, títulos e aditivos do contrato
  const { faturas = [], isLoading: loadingFaturas } = useSupabaseFaturas(undefined, undefined, id);
  const { titulos: titulosContrato = [] } = useSupabaseTitulos(undefined, undefined, id);
  const { aditivos = [], isLoading: loadingAditivos, updateAditivo } = useSupabaseAditivos(id);

  // Loja emissora — dados fiscais para o cabeçalho do contrato PDF
  const { data: lojaContrato } = useQuery({
    queryKey: ['loja-contrato', contratoSupabase?.loja_id],
    enabled: !!contratoSupabase?.loja_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('lojas')
        .select('*')
        .eq('id', contratoSupabase!.loja_id)
        .maybeSingle();
      return data;
    },
  });

  const [showRenovarModal, setShowRenovarModal] = useState(false);
  const [itensSelecionadosRenovacao, setItensSelecionadosRenovacao] = useState<string[]>([]);
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [tipoDevolucao, setTipoDevolucao] = useState<'TOTAL' | 'PARCIAL'>('TOTAL');
  const [showSubstituicaoModal, setShowSubstituicaoModal] = useState(false);
  const [itemParaSubstituir, setItemParaSubstituir] = useState<string>('');
  const [itensSelecionadosDevolucao, setItensSelecionadosDevolucao] = useState<string[]>([]);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [showConfirmarRetiradaModal, setShowConfirmarRetiradaModal] = useState(false);
  const [showEmitirFaturaModal, setShowEmitirFaturaModal] = useState(false);
  const [entregaConfirmada, setEntregaConfirmada] = useState(false);
  const [showContratoPreview, setShowContratoPreview] = useState(false);

  // Mapear contrato do Supabase para formato local
  const contrato = useMemo(() => {
    if (!contratoSupabase) return null;
    return {
      id: contratoSupabase.id,
      numero: contratoSupabase.numero,
      clienteId: contratoSupabase.cliente_id,
      lojaId: contratoSupabase.loja_id,
      obraId: contratoSupabase.obra_id,
      status: contratoSupabase.status,
      dataInicio: contratoSupabase.data_inicio,
      dataFim: contratoSupabase.data_fim || contratoSupabase.data_prevista_fim,
      valorTotal: Number(contratoSupabase.valor_total),
      valorPago: Number(contratoSupabase.valor_pago),
      valorPendente: Number(contratoSupabase.valor_pendente),
      observacoes: contratoSupabase.observacoes,
      observacoesInternas: contratoSupabase.observacoes_internas,
      logistica: contratoSupabase.logistica || {},
      condicoesPagamento: contratoSupabase.condicoes_pagamento || {},
      entrega: {},
      condicoes: {},
      pagamento: {},
      formaPagamento: contratoSupabase.forma_pagamento || 'PIX',
      rascunho: false,
      documentos: contratoSupabase.documentos || [],
      timeline: contratoSupabase.timeline || [],
      createdAt: contratoSupabase.created_at,
      updatedAt: contratoSupabase.updated_at,
      itens: (contratoSupabase.contrato_itens || []).map((item: any) => ({
        id: item.id,
        equipamentoId: item.equipamento_id,
        modeloId: item.modelo_id,
        grupoId: item.grupo_id,
        quantidade: item.quantidade,
        periodo: item.periodo,
        controle: item.controle,
        preco_unitario: Number(item.preco_unitario),
        valorTotal: Number(item.preco_total),
        valorUnitario: Number(item.preco_unitario),
        status: item.status,
        statusItem: item.status,
        observacoes: item.observacoes,
        equipamento: item.equipamento_id ? {
          id: item.equipamento_id,
          nome: formatCodigoExibicao({
            numero_serie: item.equipamentos?.numero_serie,
            codigo_interno: item.equipamentos?.codigo_interno,
            grupo_nome: item.grupos_equipamentos?.nome,
          }) || item.equipamentos?.codigo_interno || `Equipamento ${item.equipamento_id}`,
          codigo: formatCodigoExibicao({
            numero_serie: item.equipamentos?.numero_serie,
            codigo_interno: item.equipamentos?.codigo_interno,
            grupo_nome: item.grupos_equipamentos?.nome,
          }) || item.equipamentos?.codigo_interno || '',
          codigoInterno: item.equipamentos?.codigo_interno || '',
          serie: item.equipamentos?.numero_serie || '',
          valorIndenizacao: Number(item.equipamentos?.valor_indenizacao || 0),
        } : null,
        modelo: item.modelos_equipamentos ? {
          nome: item.modelos_equipamentos.nome_comercial,
        } : null,
        grupo: item.grupos_equipamentos ? {
          nome: item.grupos_equipamentos.nome,
        } : null,
      })),
      cliente: {
        id: contratoSupabase.clientes?.id || contratoSupabase.cliente_id,
        nome: contratoSupabase.clientes?.nome || contratoSupabase.clientes?.razao_social || 'Cliente',
        nomeRazao: contratoSupabase.clientes?.nome || contratoSupabase.clientes?.razao_social || 'Cliente',
        documento: contratoSupabase.clientes?.cpf || contratoSupabase.clientes?.cnpj || '',
        email: contratoSupabase.clientes?.email || '',
        telefone: '',
        endereco: (contratoSupabase.clientes?.endereco as any) || {
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          uf: '',
          cep: '',
        },
      },
      obra: contratoSupabase.obras ? {
        id: contratoSupabase.obras.id,
        nome: contratoSupabase.obras.nome,
        codigo: contratoSupabase.obras.codigo,
        endereco: contratoSupabase.obras.endereco || {},
      } : null,
    };
  }, [contratoSupabase]);

  const calcularDiasRestantes = (dataFim: string) => {
    const hoje = startOfDay(new Date());
    const fim = parseISO(dataFim);
    return differenceInCalendarDays(fim, hoje);
  };

  const diasRestantes = contrato ? calcularDiasRestantes(contrato.dataFim) : 0;
  const diasVencidos = diasRestantes < 0 ? Math.abs(diasRestantes) : 0;
  const diasParaVencer = diasRestantes > 0 ? diasRestantes : undefined;

  // Buscar recebimentos do contrato
  const [recebimentosContrato, setRecebimentosContrato] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;
    supabase
      .from('recebimentos')
      .select('*')
      .eq('titulo_id', id)
      .then(({ data }) => {
        // Buscar recebimentos vinculados a títulos deste contrato
      });
    
    // Buscar via títulos do contrato
    supabase
      .from('titulos')
      .select('id')
      .eq('contrato_id', id)
      .then(async ({ data: titulosContrato }) => {
        if (!titulosContrato?.length) return;
        const tituloIds = titulosContrato.map(t => t.id);
        const { data: recebimentos } = await supabase
          .from('recebimentos')
          .select('*')
          .in('titulo_id', tituloIds);
        setRecebimentosContrato(recebimentos || []);
      });
  }, [id]);

  // Transformar TÍTULOS em parcelas para o FinanceiroCompacto.
  // Títulos são a fonte da verdade do financeiro (é o que Contas a Receber
  // lê) — antes o card lia apenas faturas e o título gerado na criação do
  // contrato nunca aparecia ("Nenhuma parcela gerada ainda" com saldo aberto).
  const parcelas = useMemo(() => {
    if (!titulosContrato.length) return [];

    const hoje = new Date();
    return titulosContrato.map((titulo: any) => {
      const valorTotal = Number(titulo.valor || 0);
      const valorPago = Number(titulo.pago || 0);
      const saldo = Number(titulo.saldo ?? valorTotal - valorPago);
      const vencimento = new Date(`${titulo.vencimento}T12:00:00`);
      const isVencido = vencimento < hoje && saldo > 0;

      let status: 'ABERTA' | 'ATRASADA' | 'PAGA' | 'CANCELADA' = 'ABERTA';
      if (titulo.status === 'CANCELADO') status = 'CANCELADA';
      else if (saldo <= 0) status = 'PAGA';
      else if (isVencido) status = 'ATRASADA';

      return {
        id: titulo.id,
        codigo: titulo.numero,
        emissao: titulo.emissao,
        periodo: {
          inicio: titulo.emissao,
          fim: titulo.vencimento,
        },
        vencimento: titulo.vencimento,
        valor: valorTotal,
        situacao: status,
        pago: valorPago,
        saldo: Math.max(0, saldo),
        recebimentos: recebimentosContrato.filter(r => r.titulo_id === titulo.id),
        aditivos: [],
        nfse: null,
      };
    });
  }, [titulosContrato, recebimentosContrato]);

  // Calcular saldos financeiros: preferir a soma real dos títulos em aberto;
  // valor_pendente do contrato é fallback para dados antigos sem títulos.
  const saldoTitulosAbertos = useMemo(
    () => parcelas
      .filter(p => p.situacao === 'ABERTA' || p.situacao === 'ATRASADA')
      .reduce((sum, p) => sum + p.saldo, 0),
    [parcelas]
  );
  const saldoAberto = parcelas.length > 0 ? saldoTitulosAbertos : (contrato?.valorPendente || 0);
  const saldoAtraso = useMemo(() => {
    return parcelas
      .filter(p => p.situacao === 'ATRASADA')
      .reduce((sum, p) => sum + p.saldo, 0);
  }, [parcelas]);

  // Filtrar aditivos não faturados (previsões)
  const previsoesNaoFaturadas = useMemo(() => {
    if (!aditivos.length) return [];
    
    return aditivos
      .filter(aditivo => 
        aditivo.valor > 0 && 
        aditivo.status === 'ATIVO' && 
        !aditivo.faturado &&
        aditivo.tipo !== 'AJUSTE'
      )
      .map(aditivo => ({
        id: aditivo.id,
        numero: aditivo.numero,
        tipo: aditivo.tipo,
        descricao: aditivo.descricao,
        valor: Number(aditivo.valor),
        contratoId: aditivo.contrato_id,
      }));
  }, [aditivos]);

  const totalPrevisoes = useMemo(() => {
    return previsoesNaoFaturadas.reduce((sum, p) => sum + p.valor, 0);
  }, [previsoesNaoFaturadas]);
  
  // Verificar se cliente está bloqueado via status_credito ou inadimplência
  const clienteBloqueado = useMemo(() => {
    if (!contratoSupabase?.clientes) return false;
    const cliente = contratoSupabase.clientes as any;
    return cliente.inadimplente === true || cliente.status_credito === 'BLOQUEADO';
  }, [contratoSupabase]);

  // Tarefas de logística REAIS do contrato (entregas/retiradas) — alimentam
  // o card Logística e os dialogs Abrir OS / Reagendar (#43)
  const { data: tarefasLogistica = [], isLoading: loadingTarefasLog } = useQuery({
    queryKey: ['logistica-tarefas-contrato', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('logistica_tarefas')
        .select('id, tipo, status, previsto_iso, observacoes')
        .eq('contrato_id', id)
        .order('previsto_iso', { ascending: true });
      return data || [];
    },
  });

  // Próxima tarefa pendente (não concluída/cancelada)
  const tarefaPendente = useMemo(
    () => (tarefasLogistica as any[]).find(t => !['CONCLUIDO', 'CANCELADO'].includes(t.status)) || null,
    [tarefasLogistica]
  );

  const proximaAcao = useMemo(() => {
    if (tarefaPendente) {
      return {
        label: tarefaPendente.tipo === 'RETIRADA' ? 'Retirada agendada' : 'Entrega agendada',
        dateISO: tarefaPendente.previsto_iso,
      };
    }
    // Fallback: dados da logística do contrato (contratos antigos sem tarefa)
    const log = (contrato?.logistica as any) || {};
    if (log.entrega?.data || log.data) {
      return { label: 'Entrega agendada', dateISO: log.entrega?.data || log.data };
    }
    return null;
  }, [tarefaPendente, contrato]);

  const statusOS = useMemo(() => {
    if (!tarefasLogistica.length) return 'PLANEJADA' as const;
    if ((tarefasLogistica as any[]).some(t => t.status === 'EM_ROTA')) return 'EM_ROTA' as const;
    if ((tarefasLogistica as any[]).every(t => ['CONCLUIDO', 'CANCELADO'].includes(t.status))) return 'CONCLUIDA' as const;
    return 'PLANEJADA' as const;
  }, [tarefasLogistica]);

  const [showOSDialog, setShowOSDialog] = useState(false);
  const [showReagendarDialog, setShowReagendarDialog] = useState(false);

  const itensContrato = useMemo(() => {
    if (!contrato) return [];
    return contrato.itens.map((item: any) => {
      // Para itens SERIALIZADO (com equipamento específico)
      if (item.equipamento) {
        return {
          id: item.id,
          nome: item.equipamento.nome,
          patrimonioOuSerie: `${item.equipamento.codigo} • SÉRIE: ${item.equipamento.serie || '---'}`,
          statusItem: (item.statusItem || 'ENTREGUE') as 'ENTREGUE' | 'DEVOLVIDO' | 'EM_REVISAO',
          periodo: item.periodo as 'diário' | 'semanal' | 'mensal',
          valor: item.valorTotal
        };
      }
      
      // Para itens SALDO (por modelo/grupo)
      const nome = item.modelo?.nome || item.grupo?.nome || 'Item não identificado';
      return {
        id: item.id,
        nome: nome,
        patrimonioOuSerie: `${item.quantidade}x ${nome}`,
        statusItem: (item.statusItem || 'ENTREGUE') as 'ENTREGUE' | 'DEVOLVIDO' | 'EM_REVISAO',
        periodo: item.periodo as 'diário' | 'semanal' | 'mensal',
        valor: item.valorTotal
      };
    });
  }, [contrato]);

  const clienteData = useMemo(() => {
    if (!contrato) return null;
    return {
      // id é usado pela Cobrança Única para buscar os títulos reais do cliente
      id: contrato.cliente.id,
      nome: contrato.cliente.nomeRazao,
      documento: contrato.cliente.documento,
      email: contrato.cliente.email || '',
      telefone: contrato.cliente.telefone || ''
    };
  }, [contrato]);

  const obraData = useMemo(() => {
    if (!contrato?.obra?.endereco) return null;
    const endereco = contrato.obra.endereco as any;
    return {
      logradouro: endereco.logradouro || '',
      numero: endereco.numero || '',
      comp: endereco.complemento || '',
      bairro: endereco.bairro || '',
      cidade: endereco.cidade || '',
      uf: endereco.uf || '',
      cep: endereco.cep || ''
    };
  }, [contrato]);

  // Assinar digitalmente via ZapSign
  const [enviandoAssinatura, setEnviandoAssinatura] = useState(false);

  const handleAssinarDigitalmente = async () => {
    if (!contrato) return;

    // Se já existe URL de assinatura, abre direto
    if (contratoSupabase?.zapsign_sign_url) {
      window.open(contratoSupabase.zapsign_sign_url, '_blank');
      toast({ title: "Abrindo link de assinatura..." });
      return;
    }

    setEnviandoAssinatura(true);
    try {
      // Buscar contato do cliente (email/telefone) da tabela clientes.contatos
      const clienteContatos = (contratoSupabase?.clientes?.contatos as any[]) || [];
      const contatoEmail = clienteContatos.find((c: any) => c.tipo === 'email');
      const contatoWhatsApp = clienteContatos.find((c: any) => {
        const tipo = (c.tipo || '').toLowerCase();
        return tipo === 'whatsapp' || tipo === 'celular' || tipo === 'telefone';
      });

      const nomeCliente = contrato.cliente.nomeRazao;

      // Gerar PDF base64 (mesmos dados do download/impressão)
      const dadosPDF = montarDadosPDF();
      if (!dadosPDF) throw new Error('Não foi possível montar os dados do contrato');
      const pdfBase64 = await gerarContratoPDFBase64(dadosPDF);

      const { data, error } = await supabase.functions.invoke('zapsign-enviar', {
        body: {
          pdf_base64: pdfBase64,
          nome_documento: `Contrato ${contrato.numero} - ${nomeCliente}`,
          signatario: {
            nome: nomeCliente,
            email: contatoEmail?.valor || contrato.cliente.email || '',
            telefone: contatoWhatsApp?.valor || '',
          },
          contrato_id: contrato.id,
        },
      });

      if (error) {
        console.error('[ZAPSIGN] Erro:', error);
        toast({
          title: "Erro ao enviar para assinatura",
          description: error.message || "Tente novamente.",
          variant: "destructive",
        });
      } else {
        console.log('[ZAPSIGN] Sucesso:', data);
        if (data?.sign_url) {
          window.open(data.sign_url, '_blank');
        }
        toast({
          title: "Contrato enviado para assinatura!",
          description: "O cliente receberá o link por e-mail e/ou WhatsApp.",
        });
      }
    } catch (err) {
      console.error('[ZAPSIGN] Erro inesperado:', err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível enviar para assinatura.",
        variant: "destructive",
      });
    } finally {
      setEnviandoAssinatura(false);
    }
  };

  // Enviar link de assinatura por WhatsApp
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);

  const handleEnviarWhatsApp = async () => {
    if (!contrato || !contratoSupabase) return;

    if (!contratoSupabase.zapsign_sign_url) {
      toast({
        title: "Sem link de assinatura",
        description: "Envie o contrato para assinatura digital primeiro.",
        variant: "destructive",
      });
      return;
    }

    const clienteContatos = (contratoSupabase.clientes?.contatos as any[]) || [];
    const contatoWhatsApp = clienteContatos.find((c: any) => {
      const tipo = (c.tipo || '').toLowerCase();
      return tipo === 'whatsapp' || tipo === 'celular' || tipo === 'telefone';
    });

    if (!contatoWhatsApp?.valor) {
      toast({
        title: "Telefone não encontrado",
        description: "O cliente não possui WhatsApp ou celular cadastrado.",
        variant: "destructive",
      });
      return;
    }

    setEnviandoWhatsApp(true);
    try {
      const nomeCliente = contrato.cliente.nomeRazao;
      const message = `Olá ${nomeCliente}, segue o link para assinatura do contrato ${contrato.numero}:\n\n${contratoSupabase.zapsign_sign_url}\n\nQualquer dúvida, estamos à disposição!`;

      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          loja_id: contrato.lojaId,
          phone: contatoWhatsApp.valor,
          message,
        },
      });

      if (error || data?.error) {
        toast({
          title: "Erro ao enviar WhatsApp",
          description: data?.error || error?.message || "Tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Link enviado por WhatsApp!",
          description: `Mensagem enviada para ${contatoWhatsApp.valor}.`,
        });
      }
    } catch (err) {
      console.error('[WHATSAPP] Erro:', err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  // Montar dados para PDF/Preview
  const montarDadosPDF = () => {
    if (!contrato) return null;
    const logistica = contrato.logistica as any;

    // Endereço de entrega: prioridade obra → logística → cliente
    const enderecoEntrega =
      (contrato.obra as any)?.endereco
      || logistica?.endereco
      || logistica?.entrega?.endereco
      || contrato.cliente.endereco;

    // Ordena itens pelo código canônico para respeitar a ordem existente do sistema
    const itensOrdenados = [...contrato.itens].sort((a: any, b: any) => {
      const ca = String(a.equipamento?.codigo || '');
      const cb = String(b.equipamento?.codigo || '');
      return ca.localeCompare(cb, 'pt-BR', { numeric: true });
    });

    // Celular do cliente (contatos do cadastro)
    const clienteContatos = (contratoSupabase?.clientes?.contatos as any[]) || [];
    const contatoCelular = clienteContatos.find((c: any) => {
      const tipo = (c.tipo || '').toLowerCase();
      return tipo === 'whatsapp' || tipo === 'celular' || tipo === 'telefone';
    });

    // Datas reais: entrega vem da logística (data agendada); vencimento das
    // condições de pagamento — antes ambos caíam em dataInicio e o PDF saía
    // com datas erradas.
    const dataEntrega = logistica?.data || contrato.dataInicio;
    const vencimento = (contrato.condicoesPagamento as any)?.vencimento || contrato.dataInicio;
    const clienteRetira = logistica?.clienteRetiraEDevolve === true;

    return {
      numero: contrato.numero,
      loja: lojaContrato as any,
      cliente: {
        nomeRazao: contrato.cliente.nomeRazao,
        documento: contrato.cliente.documento,
        endereco: contrato.cliente.endereco,
        celular: contatoCelular?.valor || '',
      },
      obra: contrato.obra ? {
        responsavel: (contrato.obra as any)?.nome || '',
        endereco: (contrato.obra as any)?.endereco,
      } : null,
      enderecoEntrega,
      itens: itensOrdenados.map((item: any) => ({
        equipamento: {
          nome: item.equipamento?.nome || item.modelo?.nome || item.grupo?.nome || 'Equipamento',
          codigo: item.equipamento?.codigo || '',
        },
        quantidade: item.quantidade || 1,
        periodoEscolhido: item.periodo || 'MES',
        valorUnitario: item.valorUnitario || 0,
        subtotal: item.valorTotal || 0,
        valorIndenizacao: item.equipamento?.valorIndenizacao || 0,
      })),
      entrega: {
        data: dataEntrega,
        janela: logistica?.janela || logistica?.entrega?.janela || 'MANHA',
        observacoes: contrato.observacoes || '',
      },
      periodoLocacao: {
        inicio: contrato.dataInicio,
        fim: contrato.dataFim,
      },
      dataDevolucao: contrato.dataFim,
      pagamento: {
        forma: contrato.formaPagamento || 'PIX',
        vencimentoISO: vencimento,
      },
      tipoDeslocamento: clienteRetira ? 'Cliente Retira/Devolve' : 'Entrega/Retirada',
      valorFrete: Number(logistica?.frete ?? logistica?.taxaDeslocamento?.valor ?? 0),
      valorTotal: contrato.valorTotal,
    };
  };

  const handleBaixarContratoPDF = async () => {
    const dados = montarDadosPDF();
    if (!dados) return;
    try {
      await downloadContratoPDF(dados, `contrato-${contrato!.numero}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast({ title: "Erro ao gerar PDF", description: String(err), variant: "destructive" });
    }
  };

  // Event handlers
  const handleSaveObservacoes = async (texto: string) => {
    if (!contrato) return;
    
    try {
      await updateContrato.mutateAsync({
        id: contrato.id,
        observacoes_internas: texto,
      });
    } catch (error) {
      console.error('Erro ao salvar observações:', error);
    }
  };

  const handleRenovarContrato = () => {
    setItensSelecionadosRenovacao([]);
    setShowRenovarModal(true);
  };

  const handleRenovarItens = (itemIds: string[]) => {
    setItensSelecionadosRenovacao(itemIds);
    setShowRenovarModal(true);
  };

  const handleDevolucaoTotal = () => {
    setTipoDevolucao('TOTAL');
    setItensSelecionadosDevolucao([]);
    setShowDevolucaoModal(true);
  };

  const handleDevolucaoParcial = (itemIds: string[]) => {
    setTipoDevolucao('PARCIAL');
    setItensSelecionadosDevolucao(itemIds);
    setShowDevolucaoModal(true);
  };

  const handleCancelarContrato = async (motivo: string) => {
    if (!contrato) return;
    await cancelContrato.mutateAsync({
      contratoId: contrato.id,
      motivo,
    });
  };

  const handleConfirmarRetirada = async () => {
    if (!contrato) return;
    await confirmarRetirada.mutateAsync(contrato.id);
  };

  // Verificar se entrega foi confirmada (para exibir botão de cancelamento)
  useEffect(() => {
    if (contrato?.id) {
      supabase
        .from('logistica_tarefas')
        .select('status')
        .eq('contrato_id', contrato.id)
        .eq('tipo', 'ENTREGA')
        .eq('status', 'CONCLUIDO')
        .maybeSingle()
        .then(({ data }) => setEntregaConfirmada(!!data));
    }
  }, [contrato?.id]);

  // Determinar se pode cancelar
  const podeCancelar = 
    contrato?.status === 'RASCUNHO' || 
    contrato?.status === 'AGUARDANDO_ENTREGA' ||
    (contrato?.status === 'ATIVO' && !entregaConfirmada);

  // Determinar se deve mostrar botão de confirmar retirada
  const podeConfirmarRetirada =
    contrato?.status === 'AGUARDANDO_ENTREGA' &&
    (contrato?.logistica as any)?.clienteRetiraEDevolve === true;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  if (!contrato) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Contrato não encontrado</h1>
        <Button onClick={() => navigate('/contratos')}>Voltar para Contratos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/contratos')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{contrato.numero}</h1>
          <p className="text-muted-foreground">
            {contrato.cliente.nomeRazao} • {format(parseISO(contrato.dataInicio), 'dd/MM/yyyy')} - {format(parseISO(contrato.dataFim), 'dd/MM/yyyy')}
          </p>
        </div>
      </div>

      {/* Header with status and actions */}
      <div className="flex items-center justify-between">
        <ContratoHeader
          statusContrato={contrato.status === 'ATIVO' ? 'ATIVO' : 'ENCERRADO'}
          vencidoDias={diasVencidos > 0 ? diasVencidos : undefined}
          saldoAberto={saldoAberto}
          saldoAtraso={saldoAtraso}
          onChipFinanceiro={() => toast({ title: "Abrindo financeiro..." })}
          onContratoPDF={handleBaixarContratoPDF}
          onVerContrato={() => setShowContratoPreview(true)}
          onEntregaPDF={() => toast({ title: "Baixando entrega PDF..." })}
          onAssinar={handleAssinarDigitalmente}
          onWhatsApp={handleEnviarWhatsApp}
        />
        
        <div className="flex gap-2 ml-4">
          {podeConfirmarRetirada && (
            <Button onClick={() => setShowConfirmarRetiradaModal(true)} className="bg-success hover:bg-success/90">
              ✅ Confirmar Retirada
            </Button>
          )}

          {contrato.status === 'ATIVO' && (
            <>
              <Button onClick={handleRenovarContrato}>
                🔄 Renovar
              </Button>
              <Button onClick={handleDevolucaoTotal} variant="outline">
                📦 Devolução Total
              </Button>
            </>
          )}
          
          {contrato.status === 'ENCERRADO' && (
            <Badge variant="outline" className="px-4 py-2 text-base">
              ✅ Contrato Encerrado
            </Badge>
          )}

          {/* Cancelar devolução (#41): reverte itens devolvidos e reativa o contrato */}
          {contrato.itens.some((i: any) => i.statusItem === 'DEVOLVIDO' || i.status === 'DEVOLVIDO') && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Cancelar a devolução? Os itens devolvidos retornam ao contrato, a retirada pendente é cancelada e o contrato volta a ficar ATIVO.')) {
                  cancelarDevolucao.mutate({ contratoId: contrato.id });
                }
              }}
              disabled={cancelarDevolucao.isPending}
            >
              ↩️ {cancelarDevolucao.isPending ? 'Cancelando...' : 'Cancelar Devolução'}
            </Button>
          )}
          
          {podeCancelar && (
            <Button 
              onClick={() => setShowCancelarModal(true)} 
              variant="destructive"
            >
              🚫 Cancelar Contrato
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      <Alertas
        clienteBloqueado={clienteBloqueado}
        diasParaVencer={diasParaVencer}
        onVerDetalhesCliente={() => toast({ title: "Abrindo detalhes do cliente..." })}
      />

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="aditivos">Aditivos</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          {/* Financeiro Compacto */}
          <FinanceiroCompacto
            parcelas={parcelas}
            previsoesNaoFaturadas={previsoesNaoFaturadas}
            saldoAtraso={saldoAtraso}
            saldoAbertoSemCobranca={parcelas.length === 0 ? (contrato.valorPendente || 0) : 0}
            totalPrevisoes={totalPrevisoes}
            onSegundaVia={(id) => toast({ title: `Gerando 2ª via da parcela ${id}...` })}
            onReceber={(id) => toast({ title: `Abrindo recebimento da parcela ${id}...` })}
            onFaturarPrevisao={(aditivoId) => {
              setShowEmitirFaturaModal(true);
              toast({ title: "Faturar aditivo", description: "Abrindo modal para emitir fatura do aditivo" });
            }}
            onAbrirNfse={(nf) => toast({ title: `Abrindo NF-e ${nf}...` })}
            onAbrirFinanceiroCompleto={() => setShowEmitirFaturaModal(true)}
          />

          {/* Logística */}
          <LogisticaCard
            proximaAcao={proximaAcao}
            statusOS={statusOS}
            onAbrirOS={() => setShowOSDialog(true)}
            onReagendar={() => {
              if (!tarefaPendente) {
                toast({ title: "Nada para reagendar", description: "Não há entrega ou retirada pendente neste contrato." });
                return;
              }
              setShowReagendarDialog(true);
            }}
          />

          {/* Itens do Contrato */}
          <ItensList
            itens={itensContrato}
            onDevolver={contrato.status === 'ATIVO' ? (itemIds) => handleDevolucaoParcial(itemIds) : undefined}
            onSubstituir={(itemId) => {
              setItemParaSubstituir(itemId);
              setShowSubstituicaoModal(true);
            }}
            onRenovar={contrato.status === 'ATIVO' ? (itemIds) => handleRenovarItens(itemIds) : undefined}
          />

          {/* Cliente e Obra */}
          <ClienteEObra
            cliente={clienteData}
            obra={obraData}
          />

          {/* Observações Internas */}
          <ObservacoesInternas
            contratoId={String(contrato.id)}
            observacoes={contrato.observacoesInternas || ''}
            onSave={handleSaveObservacoes}
          />
        </TabsContent>

        <TabsContent value="aditivos">
          <AditivosTab 
            contrato={contrato as any}
            onContratoUpdate={() => {}}
          />
        </TabsContent>

        <TabsContent value="anexos">
          <AnexosTab 
            contrato={contrato as any}
            onContratoUpdate={() => {}}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Renovação */}
      <RenovarContratoModal
        contrato={contrato as any}
        open={showRenovarModal}
        onOpenChange={setShowRenovarModal}
        onSuccess={() => {}}
        itensSelecionados={itensSelecionadosRenovacao}
      />

      {/* Modal de Devolução */}
      <DevolucaoModal
        contrato={contrato as any}
        open={showDevolucaoModal}
        onOpenChange={setShowDevolucaoModal}
        onSuccess={() => {}}
        itensSelecionados={itensSelecionadosDevolucao}
        tipo={tipoDevolucao}
      />

      {/* Dialogs de Logística (#43) */}
      <OSLogisticaDialog
        open={showOSDialog}
        onOpenChange={setShowOSDialog}
        tarefas={tarefasLogistica as any}
        isLoading={loadingTarefasLog}
        contratoId={contrato.id}
      />
      <ReagendarLogisticaDialog
        open={showReagendarDialog}
        onOpenChange={setShowReagendarDialog}
        tarefa={tarefaPendente}
      />

      {/* Modal de Substituição */}
      <SubstituicaoModal
        contrato={contrato}
        itemId={itemParaSubstituir}
        open={showSubstituicaoModal}
        onOpenChange={setShowSubstituicaoModal}
        onSuccess={() => setItemParaSubstituir('')}
      />

      {/* Modal de Cancelamento */}
      <CancelarContratoModal
        open={showCancelarModal}
        onOpenChange={setShowCancelarModal}
        contratoNumero={contrato.numero}
        contratoStatus={contrato.status}
        onConfirm={handleCancelarContrato}
      />

      {/* Modal de Confirmar Retirada */}
      <ConfirmarRetiradaModal
        open={showConfirmarRetiradaModal}
        onOpenChange={setShowConfirmarRetiradaModal}
        contrato={{
          numero: contrato.numero,
          cliente: {
            nomeRazao: contrato.cliente.nomeRazao,
            documento: contrato.cliente.documento,
          },
          itens: contrato.itens.map((item: any) => ({
            id: item.id,
            equipamento: item.equipamento ? {
              codigo_interno: item.equipamento.codigo,
              numero_serie: item.equipamento.serie,
              codigo: item.equipamento.codigo
            } : undefined,
            modelo: item.modelo ? {
              nome_comercial: item.modelo.nome,
              nome: item.modelo.nome
            } : undefined,
            grupo: item.grupo,
            quantidade: item.quantidade || 1,
            controle: item.controle
          })),
          dataInicio: contrato.dataInicio,
          dataPrevistaFim: contrato.dataFim,
        }}
        onConfirm={handleConfirmarRetirada}
      />

      {/* Modal de Emitir Fatura */}
      <EmitirFaturaModal
        contrato={contrato as any}
        open={showEmitirFaturaModal}
        onOpenChange={setShowEmitirFaturaModal}
        onSuccess={() => {
          setShowEmitirFaturaModal(false);
          toast({ 
            title: "Fatura emitida",
            description: "A fatura foi gerada e está disponível em Contas a Receber."
          });
        }}
      />
      {/* Preview do Contrato */}
      {contrato && showContratoPreview && (() => {
        const dados = montarDadosPDF();
        if (!dados) return null;
        return (
          <ContratoResumoPreview
            open={showContratoPreview}
            onClose={() => setShowContratoPreview(false)}
            contrato={{
              ...dados,
              cliente: {
                ...dados.cliente,
                email: contrato.cliente.email || '',
                telefone: contrato.cliente.telefone || '',
              },
              contratoId: contrato.id,
            }}
            onEnviarAssinatura={() => {
              setShowContratoPreview(false);
              toast({ title: "Contrato enviado para assinatura!" });
            }}
          />
        );
      })()}
    </div>
  );
}
