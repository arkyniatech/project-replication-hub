// @ts-nocheck
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseFaturas } from "@/hooks/useSupabaseFaturas";
import { useSupabaseAditivos } from "@/hooks/useSupabaseAditivos";
import { useToast } from "@/hooks/use-toast";
import { ContratoHeader } from "@/components/contratos/ContratoHeader";
import { FinanceiroCompacto } from "@/components/contratos/FinanceiroCompacto";
import { LogisticaCard } from "@/components/contratos/LogisticaCard";
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
import { useEffect } from "react";
import { gerarContratoPDFBase64 } from "@/utils/contrato-pdf";

export default function ContratoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { useContrato, updateContrato, cancelContrato, confirmarRetirada } = useSupabaseContratos();
  const { data: contratoSupabase, isLoading: loading } = useContrato(id || '');
  
  // Buscar faturas e aditivos do contrato
  const { faturas = [], isLoading: loadingFaturas } = useSupabaseFaturas(undefined, undefined, id);
  const { aditivos = [], isLoading: loadingAditivos, updateAditivo } = useSupabaseAditivos(id);

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
          nome: item.equipamentos?.codigo_interno || `Equipamento ${item.equipamento_id}`,
          codigo: item.equipamentos?.codigo_interno || '',
          serie: item.equipamentos?.numero_serie || '',
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
        endereco: {
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

  // Transformar faturas em parcelas para o FinanceiroCompacto
  const parcelas = useMemo(() => {
    if (!faturas.length) return [];
    
    return faturas.map((fatura: any) => {
      const valorTotal = Number(fatura.total || 0);
      const valorPago = 0; // TODO: somar recebimentos quando integrado
      const saldo = valorTotal - valorPago;
      const hoje = new Date();
      const vencimento = new Date(fatura.vencimento);
      const isVencido = vencimento < hoje && saldo > 0;
      
      let status: 'ABERTA' | 'ATRASADA' | 'PAGA' | 'CANCELADA' = 'ABERTA';
      if (saldo === 0) status = 'PAGA';
      else if (isVencido) status = 'ATRASADA';
      
      return {
        id: fatura.id,
        codigo: fatura.numero,
        emissao: fatura.emissao,
        periodo: {
          inicio: fatura.emissao,
          fim: fatura.vencimento,
        },
        vencimento: fatura.vencimento,
        valor: valorTotal,
        situacao: status,
        pago: valorPago,
        saldo,
        recebimentos: [], // TODO: buscar recebimentos quando integrado
        aditivos: [],
        nfse: null,
      };
    });
  }, [faturas]);

  // Calcular saldos financeiros
  const saldoAberto = contrato?.valorPendente || 0;
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
  
  const clienteBloqueado = false; // TODO: Verificar status do cliente quando integrado

  // Extrair próxima ação da logística
  const proximaAcao = useMemo(() => {
    if (!contrato?.logistica) return null;
    const log = contrato.logistica as any;
    
    // Verifica se há data de entrega agendada
    if (log.entrega?.data) {
      return {
        label: 'Entrega agendada',
        dateISO: log.entrega.data,
      };
    }
    
    // Verifica se há data de coleta agendada
    if (log.coleta?.data) {
      return {
        label: 'Coleta agendada',
        dateISO: log.coleta.data,
      };
    }
    
    return null;
  }, [contrato]);

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
      const contatoWhatsApp = clienteContatos.find((c: any) => c.tipo === 'whatsapp' || c.tipo === 'celular');

      const nomeCliente = contrato.cliente.nomeRazao;

      // Gerar PDF base64
      const pdfBase64 = gerarContratoPDFBase64({
        cliente: {
          nomeRazao: nomeCliente,
          documento: contrato.cliente.documento,
          endereco: contrato.cliente.endereco,
        },
        itens: contrato.itens.map((item: any) => ({
          equipamento: {
            nome: item.equipamento?.nome || item.modelo?.nome || item.grupo?.nome || 'Equipamento',
            codigo: item.equipamento?.codigo || '',
          },
          quantidade: item.quantidade || 1,
          periodoEscolhido: item.periodo || 'MES',
          valorUnitario: item.valorUnitario,
          subtotal: item.valorTotal,
        })),
        entrega: {
          data: contrato.dataInicio,
          janela: (contrato.logistica as any)?.entrega?.janela || 'MANHA',
          observacoes: contrato.observacoes || '',
        },
        pagamento: {
          forma: contrato.formaPagamento || 'PIX',
          vencimentoISO: contrato.dataInicio,
        },
        valorTotal: contrato.valorTotal,
      });

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
    const contatoWhatsApp = clienteContatos.find(
      (c: any) => c.tipo === 'whatsapp' || c.tipo === 'celular'
    );

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
          onContratoPDF={() => toast({ title: "Baixando contrato PDF..." })}
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
      <Tabs defaultValue="geral" className="space-y-6">
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
            statusOS="PLANEJADA"
            onAbrirOS={() => toast({ title: "Abrindo OS..." })}
            onReagendar={() => toast({ title: "Abrindo reagendamento..." })}
          />

          {/* Itens do Contrato */}
          <ItensList
            itens={itensContrato}
            onDevolver={contrato.status === 'ATIVO' ? (itemIds) => handleDevolucaoParcial(itemIds) : undefined}
            onSubstituir={(itemId) => toast({ title: `Iniciando substituição do item ${itemId}...` })}
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

      {/* Modal de Substituição */}
      <SubstituicaoModal
        contratoId={contrato?.id?.toString()}
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
    </div>
  );
}
