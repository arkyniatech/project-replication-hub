// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ClienteForm from "@/components/forms/ClienteForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Save, Search, Plus, Trash2, FileText, AlertTriangle, CheckCircle, Clock, MapPin, CreditCard, Truck, Wrench, Send } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Cliente, Equipamento, ItemContrato, Obra } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { validarBloqueioCliente, precoTabela, reservarItens, liberarReserva, verificarDisponibilidade, gerarOSEntrega, gerarTitulosFechamento, agruparCobrancaCliente, autoIncrementContrato } from "@/lib/contratos-v2-utils";
import { aplicarPolitica, ResultadoPolitica } from "@/services/politicasEngine";
import { ClienteBlockedModal } from "@/components/contratos/ClienteBlockedModal";
import { AssistenteHorarios } from "@/components/contratos/AssistenteHorarios";
import { ContratoResumoPreview } from "@/components/contratos/ContratoResumoPreview";
import { SeletorObraModal } from "@/components/contratos/SeletorObraModal";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseLogisticaTarefas } from "@/hooks/useSupabaseLogisticaTarefas";
import { supabaseClienteToLegacy } from "@/lib/cliente-adapter";
import { TaxaDeslocamentoService } from "@/services/taxaDeslocamentoService";
import { useTaxaDeslocamentoStore } from "@/stores/taxaDeslocamentoStore";
import { supabase } from "@/integrations/supabase/client";
import { useDisponibilidadeRT } from "@/hooks/useDisponibilidadeRT";
import { validarDisponibilidadeReal } from "@/hooks/useValidarDisponibilidadeReal";
import { Loader2 } from "lucide-react";

// Rascunho do contrato v2
interface ContratoRascunho {
  id?: string;
  lojaId: string;
  clienteId: string;
  cliente?: Cliente;
  obraId?: string;
  obra?: Obra;
  itens: Array<{
    equipamentoId: string;
    equipamento?: Equipamento;
    controle: 'SERIALIZADO' | 'GRUPO';
    quantidade: number;
    periodoEscolhido: 'DIARIA' | 'SEMANA' | 'QUINZENA' | '21DIAS' | 'MES';
    valorUnitario: number;
    subtotal: number;
  }>;
  entrega: {
    data: string;
    janela: 'MANHA' | 'TARDE';
    horaSugestao?: string;
    observacoes?: string;
    clienteRetiraEDevolve: boolean;
  };
  condicoes: {
    confirmacoes: string[];
    observacoes?: string;
  };
  pagamento: {
    forma: 'BOLETO' | 'PIX' | 'CARTAO' | 'DINHEIRO';
    vencimentoISO: string;
    cobrancaUnica: boolean;
  };
  taxaDeslocamento?: {
    aplicar: boolean;
    valor: number;
    justificativa?: string;
  };
  valorTotal: number;
  reservaId?: string;
}
const ETAPAS = ['Cliente', 'Itens', 'Entrega/Coleta', 'Condições', 'Pagamento', 'Conferência', 'Documentos'];
const CONFIRMACOES_ENTREGA = ['Acesso liberado no local', 'Local de descarga próximo ao veículo'];
const CONFIRMACOES_CONDICOES = ['Ciente da renovação automática', 'Ciente da obrigação de solicitar retirada', 'Ciente que retirada parcial ou perdida incide taxa'];

// Helper para formatar status do cliente de forma legível
function formatarStatusCliente(cliente: Cliente): string {
  const status = cliente.status || cliente.statusCredito;
  const statusMap: Record<string, string> = {
    'ATIVO': 'Ativo',
    'Ativo': 'Ativo',
    'SUSPENSO': 'Suspenso',
    'Suspenso': 'Suspenso',
    'EM_ANALISE': 'Em Análise',
    'Em análise': 'Em Análise'
  };
  return statusMap[status] || status || 'Em Análise';
}
export default function NovoContratoV2() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    lojaAtual
  } = useMultiunidade();
  const [searchParams, setSearchParams] = useSearchParams();
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [politicaAplicada, setPoliticaAplicada] = useState<ResultadoPolitica | null>(null);
  
  // Hooks do Supabase
  const { clientes: clientesSupabase, isLoading: loadingClientes, useCliente } = useSupabaseClientes(lojaAtual?.id);
  const { equipamentos: equipamentosSupabase, isLoading: loadingEquipamentos } = useSupabaseEquipamentos(lojaAtual?.id);
  const { createTarefa: createTarefaLogistica } = useSupabaseLogisticaTarefas({
    lojaId: lojaAtual?.id || '',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0]
  });

  // Telemetria V2
  useEffect(() => {
    console.log('[TELEMETRY] route:contratos:new->v2', {
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    });
  }, []);

  // Carregamento automático do cliente da URL
  useEffect(() => {
    const clienteId = searchParams.get('clienteId');
    if (!clienteId || !clientesSupabase) return;

    // Primeiro buscar no Supabase
    const clienteSupabase = clientesSupabase.find(c => c.id === clienteId);
    let cliente: Cliente | undefined;

    if (clienteSupabase) {
      // Converter do formato Supabase para o formato legacy
      cliente = supabaseClienteToLegacy(clienteSupabase);
      console.log('[DEBUG] Cliente carregado do Supabase:', {
        id: cliente.id,
        nome: cliente.nomeRazao,
        status: cliente.status,
        statusCredito: cliente.statusCredito
      });
    }

    if (cliente) {
      // Verificar bloqueio
      const bloqueio = validarBloqueioCliente(cliente);
      if (!bloqueio.ok) {
        setClienteBloqueado({
          cliente,
          motivo: bloqueio.motivo || 'Cliente bloqueado',
          origemLoja: bloqueio.origemLoja,
          valor: bloqueio.valor
        });
      } else {
        // Atualizar contrato com cliente
        setContrato(prev => ({
          ...prev,
          clienteId: cliente.id,
          cliente: cliente
        }));
      }
    } else {
      console.warn('[DEBUG] Cliente não encontrado:', clienteId);
      toast({
        title: "Cliente não encontrado",
        description: "O cliente especificado não foi encontrado.",
        variant: "destructive"
      });
    }
  }, [searchParams, clientesSupabase, toast]);

  // Estados para bloqueio de cliente
  const [clienteBloqueado, setClienteBloqueado] = useState<{
    cliente: Cliente;
    motivo: string;
    origemLoja?: string;
    valor?: number;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validandoEstoque, setValidandoEstoque] = useState(false);
  const [seletorObraOpen, setSeletorObraOpen] = useState(false);
  const [contrato, setContrato] = useState<ContratoRascunho>({
    lojaId: lojaAtual?.id || '',
    clienteId: '',
    itens: [],
    entrega: {
      data: '',
      janela: 'MANHA',
      clienteRetiraEDevolve: false
    },
    condicoes: {
      confirmacoes: []
    },
    pagamento: {
      forma: 'BOLETO',
      vencimentoISO: new Date().toISOString().split('T')[0],
      // Hoje por padrão
      cobrancaUnica: true
    },
    valorTotal: 0
  });
  const [searchCliente, setSearchCliente] = useState('');
  const [searchEquipamento, setSearchEquipamento] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [isClienteFormOpen, setIsClienteFormOpen] = useState(false);
  const [equipamentosFiltrados, setEquipamentosFiltrados] = useState<Equipamento[]>([]);

  // Carregar clientes do Supabase e localStorage (fallback)
  useEffect(() => {
    if (loadingClientes) {
      setClientesFiltrados([]);
      return;
    }

    // Converter clientes do Supabase para formato legacy
    const clientesLegacy = clientesSupabase.map(supabaseClienteToLegacy);

    const todosClientes = clientesLegacy;

    // Filtrar por busca
    const filtrados = searchCliente
      ? todosClientes.filter(c => 
          c.nomeRazao.toLowerCase().includes(searchCliente.toLowerCase()) || 
          c.documento.includes(searchCliente)
        ).slice(0, 10)
      : todosClientes.slice(0, 10);

    setClientesFiltrados(filtrados);
  }, [searchCliente, clientesSupabase, loadingClientes, lojaAtual]);

  // Carregar equipamentos disponíveis do Supabase
  useEffect(() => {
    if (loadingEquipamentos) {
      return;
    }

    // Converter equipamentos do Supabase para formato legacy
    const equipamentosLegacy: Equipamento[] = equipamentosSupabase.map(eq => {
      // Buscar tabela de preços do modelo para a loja atual
      const tabelaLoja = eq.modelos_equipamentos?.tabela_por_loja?.[lojaAtual?.id || ''] || {};
      
      // Para SALDO, buscar a quantidade real do saldos_por_loja
      let qtdDisponivel = 0;
      if (eq.tipo === 'SALDO' && eq.saldos_por_loja) {
        const saldoLoja = eq.saldos_por_loja[lojaAtual?.id || ''];
        // O saldo pode ser um número direto ou um objeto { qtd: number }
        if (typeof saldoLoja === 'number') {
          qtdDisponivel = saldoLoja;
        } else if (saldoLoja && typeof saldoLoja === 'object' && 'qtd' in saldoLoja) {
          qtdDisponivel = (saldoLoja as any).qtd || 0;
        }
        
        console.log('[DEBUG] Equipamento:', eq.codigo_interno, 'Saldo:', saldoLoja, 'Qtd disponível:', qtdDisponivel);
      }
      
      return {
        id: eq.id,
        codigo: eq.codigo_interno,
        nome: `${eq.modelos_equipamentos?.nome_comercial || 'Equipamento'} ${eq.numero_serie || ''}`.trim(),
        descricao: eq.modelos_equipamentos?.nome_comercial || 'Equipamento',
        numeroSerie: eq.numero_serie || undefined,
        grupoId: eq.grupo_id,
        grupo: {
          id: eq.grupo_id,
          nome: eq.grupos_equipamentos?.nome || 'Grupo'
        },
        modeloId: eq.modelo_id,
        unidadeLocacao: 'DIARIA' as const,
        status: eq.status_global as any,
        situacao: 'Disponível' as const,
        controle: eq.tipo as 'SERIALIZADO' | 'GRUPO',
        tipoControle: eq.tipo as 'SERIALIZADO' | 'GRUPO',
        qtdDisponivel: eq.tipo === 'SALDO' ? qtdDisponivel : undefined,
        quantidade: eq.tipo === 'SALDO' ? qtdDisponivel : undefined,
        localizacao: '',
        checklists: [],
        anexos: [],
        observacoes: eq.observacoes || undefined,
        ativo: eq.ativo,
        tabela: tabelaLoja,
        precos: {
          diaria: tabelaLoja.diaria || 0,
          semana: tabelaLoja['7'] || 0,
          mes: tabelaLoja['28'] || 0
        },
        lojaId: eq.loja_atual_id,
        createdAt: eq.created_at,
        updatedAt: eq.updated_at
      };
    });

    // Filtrar apenas DISPONIVEL e com estoque (para SALDO) e por busca
    const filtrados = equipamentosLegacy.filter(e => {
      const statusDisponivel = e.status === 'DISPONIVEL';
      const temEstoque = e.controle === 'SERIALIZADO' || (e.qtdDisponivel && e.qtdDisponivel > 0);
      const matchesSearch = 
        e.nome.toLowerCase().includes(searchEquipamento.toLowerCase()) || 
        e.codigo.toLowerCase().includes(searchEquipamento.toLowerCase()) || 
        e.grupo?.nome?.toLowerCase().includes(searchEquipamento.toLowerCase());
      return statusDisponivel && temEstoque && matchesSearch;
    }).slice(0, 10);

    setEquipamentosFiltrados(filtrados);
  }, [searchEquipamento, equipamentosSupabase, loadingEquipamentos, lojaAtual]);

  // Calcular total e aplicar política (derivado, sem loop)
  const valorTotalCalculado = useMemo(() => {
    if (!contrato.cliente || contrato.itens.length === 0) {
      setPoliticaAplicada(null);
      return 0;
    }
    const total = contrato.itens.reduce((sum, item) => sum + item.subtotal, 0);
    const taxaDeslocamento = contrato.taxaDeslocamento?.aplicar ? (contrato.taxaDeslocamento.valor || 0) : 0;

    // Aplicar política se configurada
    if (contrato.cliente.politicaComercial && contrato.cliente.aplicarPoliticaAuto !== false) {
      try {
        const resultado = aplicarPolitica({
          cliente: {
            id: contrato.cliente.id,
            politica: contrato.cliente.politicaComercial,
            aplicarAuto: contrato.cliente.aplicarPoliticaAuto
          },
          lojaId: contrato.lojaId,
          periodoDias: 28,
          itens: contrato.itens.map(item => ({
            modeloId: item.equipamento?.id || item.equipamentoId,
            grupoId: item.equipamento?.grupoId || '',
            qtd: item.quantidade,
            precoTabela: item.valorUnitario
          })),
          dataEventoISO: new Date().toISOString().split('T')[0]
        });
        setPoliticaAplicada(resultado);
        return resultado.totalComDesconto + taxaDeslocamento;
      } catch (error) {
        console.error('Erro ao aplicar política:', error);
        setPoliticaAplicada(null);
        return total + taxaDeslocamento;
      }
    } else {
      setPoliticaAplicada(null);
      return total + taxaDeslocamento;
    }
  }, [contrato.itens, contrato.cliente, contrato.taxaDeslocamento, contrato.lojaId]);
  const handleExit = () => {
    if (hasChanges) {
      if (confirm('Há alterações não salvas. Deseja sair mesmo assim?')) {
        // Liberar reserva se existir
        if (contrato.reservaId) {
          liberarReserva(contrato.reservaId);
        }
        navigate('/contratos');
      }
    } else {
      navigate('/contratos');
    }
  };
  const salvarRascunho = () => {
    const rascunhoId = contrato.id || crypto.randomUUID();
    const rascunhoAtualizado = {
      ...contrato,
      id: rascunhoId
    };
    localStorage.setItem(`contrato-rascunho-${rascunhoId}`, JSON.stringify(rascunhoAtualizado));
    setContrato(rascunhoAtualizado);
    setHasChanges(false);
    toast({
      title: "Rascunho salvo",
      description: "O rascunho foi salvo com sucesso"
    });
  };
  const proximaEtapa = async () => {
    // VALIDAÇÃO CRÍTICA: Verificar estoque REAL antes de avançar da etapa "Itens"
    if (etapaAtual === 1) {
      setValidandoEstoque(true);
      
      const resultado = await validarDisponibilidadeReal(
        contrato.itens.map(item => ({
          equipamentoId: item.equipamentoId,
          controle: item.controle,
          quantidade: item.quantidade
        })),
        contrato.lojaId
      );
      
      setValidandoEstoque(false);
      
      if (!resultado.valido) {
        const mensagensConflito = resultado.conflitos.map(c => 
          `• ${c.nome}:\n  Solicitado: ${c.totalSolicitado} unidades\n  Disponível: ${c.qtdDisponivel} (${c.qtdTotal} no estoque, ${c.qtdTotal - c.qtdDisponivel} já reservadas)`
        ).join('\n\n');
        
        console.error('❌ BLOQUEIO: Estoque insuficiente (validação Supabase):', resultado.conflitos);
        
        toast({
          title: "Estoque insuficiente",
          description: mensagensConflito,
          variant: "destructive",
          duration: 10000
        });
        
        return; // BLOQUEIA o avanço
      }
    }
    
    // Criar reserva ao sair da etapa de itens
    if (etapaAtual === 1 && contrato.itens.length > 0 && !contrato.reservaId) {
      const reservaId = reservarItens({
        id: contrato.id,
        lojaId: contrato.lojaId,
        itens: contrato.itens.map(item => ({
          equipamentoId: item.equipamentoId,
          controle: item.controle,
          quantidade: item.quantidade
        }))
      });
      setContrato(prev => ({
        ...prev,
        reservaId
      }));
    }
    if (etapaAtual < ETAPAS.length - 1) {
      setEtapaAtual(etapaAtual + 1);
    }
  };
  const etapaAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1);
    }
  };
  const selecionarCliente = (cliente: Cliente) => {
    // Validar bloqueio
    const validacao = validarBloqueioCliente(cliente);
    if (!validacao.ok) {
      setClienteBloqueado({
        cliente,
        motivo: validacao.motivo!,
        origemLoja: validacao.origemLoja,
        valor: validacao.valor
      });
      return;
    }
    setContrato(prev => ({
      ...prev,
      clienteId: cliente.id,
      cliente
    }));
    setHasChanges(true);
    setSearchCliente('');
  };
  const aprovarCliente = () => {
    if (clienteBloqueado) {
      setContrato(prev => ({
        ...prev,
        clienteId: clienteBloqueado.cliente.id,
        cliente: clienteBloqueado.cliente
      }));

      // Registrar override na timeline
      toast({
        title: "Cliente liberado",
        description: "Cliente liberado pelo gerente e adicionado ao contrato",
        duration: 1500
      });
      setClienteBloqueado(null);
      setHasChanges(true);
    }
  };
  const adicionarItem = async (equipamento: Equipamento) => {
    // Debug log
    console.log('Tentando adicionar equipamento:', equipamento.codigo, equipamento.nome);
    console.log('Tabela de preços:', equipamento.tabela);
    console.log('Quantidade disponível:', equipamento.qtdDisponivel);

    // Usar o campo correto de controle (compatível com Supabase e localStorage)
    const controle = equipamento.controle || equipamento.tipoControle || (equipamento as any).tipo || 'SERIALIZADO';

    // CORREÇÃO 1: Verificar estoque ANTES de adicionar
    // Para SALDO (GRUPO), verificar estoque disponível considerando transferências ativas
    if (controle === 'GRUPO') {
      const qtdDisponivel = equipamento.qtdDisponivel || equipamento.quantidade || 0;
      
      // Somar quantidades já adicionadas no contrato para este modelo
      const modeloIdEquip = (equipamento as any).modeloId || (equipamento as any).modelo_id;
      const qtdJaNoContrato = contrato.itens
        .filter(item => {
          const itemModeloId = (item.equipamento as any)?.modeloId || (item.equipamento as any)?.modelo_id;
          return itemModeloId === modeloIdEquip;
        })
        .reduce((sum, item) => sum + item.quantidade, 0);
      
      // Consultar transferências em trânsito para este modelo
      let qtdEmTransferencia = 0;
      if (lojaAtual?.id && modeloIdEquip) {
        const { data: transfItens, error } = await supabase
          .from('transferencia_itens')
          .select(`
            quantidade,
            transferencias!inner(
              origem_loja_id,
              status
            )
          `)
          .eq('modelo_id', modeloIdEquip)
          .eq('tipo', 'SALDO')
          .in('transferencias.status', ['CRIADA', 'EM_TRANSITO'])
          .eq('transferencias.origem_loja_id', lojaAtual.id);

        if (!error && transfItens) {
          qtdEmTransferencia = transfItens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
        }
      }
      
      const saldoRestante = qtdDisponivel - qtdJaNoContrato - qtdEmTransferencia;
      
      console.log('Verificação de estoque SALDO:', {
        qtdDisponivel,
        qtdJaNoContrato,
        qtdEmTransferencia,
        saldoRestante
      });
      
      // BLOQUEIO: Não permitir adicionar se não há estoque suficiente
      if (saldoRestante < 1) {
        toast({
          title: "Estoque insuficiente",
          description: qtdEmTransferencia > 0 
            ? `Disponível: ${qtdDisponivel} un. / No contrato: ${qtdJaNoContrato} un. / Em transferência: ${qtdEmTransferencia} un.`
            : `Disponível: ${qtdDisponivel} un. / Já no contrato: ${qtdJaNoContrato} un.`,
          variant: "destructive",
          duration: 4000
        });
        return; // ← BLOQUEIA A ADIÇÃO
      }
    } else {
      // Para SERIE, verificar disponibilidade básica
      if (!verificarDisponibilidade(equipamento, 1)) {
        toast({
          title: "Equipamento indisponível",
          description: "Este equipamento não está disponível no momento",
          variant: "destructive",
          duration: 1500
        });
        return; // ← BLOQUEIA A ADIÇÃO
      }
    }

    const periodoEscolhido: 'DIARIA' = 'DIARIA'; // Padrão

    try {
      const valorUnitario = precoTabela(equipamento, periodoEscolhido) || equipamento.precos?.diaria || 0;
      const novoItem = {
        equipamentoId: equipamento.id,
        equipamento,
        controle,
        quantidade: 1,
        periodoEscolhido,
        valorUnitario,
        subtotal: valorUnitario
      };
      setContrato(prev => ({
        ...prev,
        itens: [...prev.itens, novoItem]
      }));
      setHasChanges(true);
      setSearchEquipamento('');
      toast({
        title: "Item adicionado",
        description: `${equipamento.nome} adicionado ao contrato`,
        duration: 1500 // 1.5 segundos - não-bloqueante
      });
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro ao adicionar item",
        description: "Ocorreu um erro ao adicionar o equipamento",
        variant: "destructive"
      });
    }
  };
  const atualizarItem = (index: number, campo: string, valor: any) => {
    console.log('🔧 Atualizando item:', {
      index,
      campo,
      valor
    });
    setContrato(prev => {
      const novosItens = [...prev.itens];
      const item = {
        ...novosItens[index]
      };
      
      // Verificar estoque ao aumentar quantidade para itens GRUPO
      if (campo === 'quantidade' && item.controle === 'GRUPO') {
        const novaQuantidade = parseInt(valor);
        const equipamento = item.equipamento!;
        const qtdDisponivel = equipamento.qtdDisponivel || equipamento.quantidade || 0;
        
        // Somar quantidades de OUTROS itens do mesmo modelo no contrato
        const modeloIdEquip = (equipamento as any).modeloId || (equipamento as any).modelo_id;
        const qtdOutrosItens = prev.itens
          .filter((it, idx) => {
            if (idx === index) return false;
            const itemModeloId = (it.equipamento as any)?.modeloId || (it.equipamento as any)?.modelo_id;
            return itemModeloId === modeloIdEquip;
          })
          .reduce((sum, it) => sum + it.quantidade, 0);
        
        const saldoRestante = qtdDisponivel - qtdOutrosItens;
        
        if (novaQuantidade > saldoRestante) {
          toast({
            title: "Estoque insuficiente",
            description: `Disponível: ${saldoRestante} un. (${qtdDisponivel} total - ${qtdOutrosItens} já no contrato)`,
            variant: "destructive",
            duration: 3000
          });
          return prev; // Não atualiza
        }
      }
      
      if (campo === 'periodoEscolhido') {
        console.log('📅 Mudando período de', item.periodoEscolhido, 'para', valor);
        item.periodoEscolhido = valor;
        item.valorUnitario = precoTabela(item.equipamento!, valor) || 0;
        console.log('💰 Novo valor unitário:', item.valorUnitario);
      } else if (campo === 'quantidade') {
        item.quantidade = parseInt(valor) || 1;
        console.log('🔢 Nova quantidade:', item.quantidade);
      }
      item.subtotal = item.quantidade * item.valorUnitario;
      novosItens[index] = item;
      console.log('✅ Item atualizado:', item);
      return {
        ...prev,
        itens: novosItens
      };
    });
    setHasChanges(true);
  };
  const removerItem = (index: number) => {
    setContrato(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };
  const handleEnviarAssinatura = () => {
    // Usado pelo ContratoResumoPreview - no-op pois assinatura agora é integrada na finalização
  };

  // Calcular data de fim baseada no período do contrato (corrigido para evitar bug de timezone)
  const calcularDataFimContrato = (dataInicio: string, itens: typeof contrato.itens): string => {
    if (!dataInicio || itens.length === 0) return '';

    // Parse da data sem problemas de timezone
    const [ano, mes, dia] = dataInicio.split('-').map(Number);
    const periodos = itens.map(item => item.periodoEscolhido);

    // Pegar o maior período para calcular o fim
    let diasParaAdicionar = 1; // Default: 1 dia (DIARIA)

    if (periodos.includes('MES')) diasParaAdicionar = 28;else if (periodos.includes('21DIAS')) diasParaAdicionar = 21;else if (periodos.includes('QUINZENA')) diasParaAdicionar = 14;else if (periodos.includes('SEMANA')) diasParaAdicionar = 7;

    // Criar data corretamente (mês é 0-indexed)
    const dataInicioDate = new Date(ano, mes - 1, dia);
    const dataFim = new Date(dataInicioDate);
    dataFim.setDate(dataFim.getDate() + diasParaAdicionar);

    // Retornar no formato ISO YYYY-MM-DD
    return `${dataFim.getFullYear()}-${String(dataFim.getMonth() + 1).padStart(2, '0')}-${String(dataFim.getDate()).padStart(2, '0')}`;
  };
  const finalizarContrato = async () => {
    try {
      console.log('[FINALIZACAO] Iniciando finalização do contrato...');
      console.log('[FINALIZACAO] Dados do contrato:', JSON.stringify({
        lojaId: contrato.lojaId,
        clienteId: contrato.clienteId,
        obraId: contrato.obra?.id,
        qtdItens: contrato.itens.length,
        valorTotal: valorTotalCalculado
      }));

      // Gerar número do contrato
      const numeroContrato = autoIncrementContrato(contrato.lojaId);
      console.log('[FINALIZACAO] Número do contrato gerado:', numeroContrato);

      // Calcular data de fim do contrato
      const dataFimCalculada = calcularDataFimContrato(contrato.entrega.data, contrato.itens);
      console.log('[FINALIZACAO] Data de fim calculada:', dataFimCalculada);

      // Preparar dados do contrato para Supabase
      const contratoData = {
        numero: numeroContrato.toString(),
        loja_id: contrato.lojaId,
        cliente_id: contrato.clienteId,
        obra_id: contrato.obra?.id && contrato.obra.id !== 'temp-cliente-endereco' ? contrato.obra.id : null,
        data_inicio: contrato.entrega.data,
        data_prevista_fim: dataFimCalculada,
        data_fim: null,
        valor_total: valorTotalCalculado,
        valor_pago: 0,
        valor_pendente: valorTotalCalculado,
        status: 'AGUARDANDO_ENTREGA',
        forma_pagamento: contrato.pagamento.forma,
        logistica: contrato.entrega,
        condicoes_pagamento: {
          forma: contrato.pagamento.forma,
          vencimento: contrato.pagamento.vencimentoISO,
          cobrancaUnica: contrato.pagamento.cobrancaUnica
        },
        observacoes: contrato.condicoes.observacoes || null,
        observacoes_internas: null,
        documentos: [],
        timeline: [{
          ts: new Date().toISOString(),
          tipo: 'CRIACAO',
          descricao: 'Contrato criado',
          usuario: 'Sistema'
        }],
        ativo: true
      };

      console.log('[FINALIZACAO] Dados do contrato preparados para Supabase');
      console.log('[FINALIZACAO] Status sendo enviado:', JSON.stringify(contratoData.status));
      console.log('[FINALIZACAO] Tipo do status:', typeof contratoData.status);
      console.log('[FINALIZACAO] Dados completos do contrato:', JSON.stringify(contratoData, null, 2));

      // Salvar contrato no Supabase
      const { data: contratoSupabase, error: contratoError } = await supabase
        .from('contratos')
        .insert(contratoData)
        .select()
        .single();

      if (contratoError) {
        console.error('[FINALIZACAO] Erro ao criar contrato no Supabase:', contratoError);
        throw contratoError;
      }

      console.log('[FINALIZACAO] Contrato criado no Supabase:', contratoSupabase.id);

      // Salvar itens do contrato no Supabase
      const itensData = contrato.itens.map((item, idx) => {
        const equip = item.equipamento as any;
        // Mapear valores do front (SERIALIZADO/SALDO) para valores do banco (SERIE/GRUPO)
        const controleValue = item.controle as string;
        let controleDB: string;
        if (controleValue === 'SERIALIZADO') {
          controleDB = 'SERIE';
        } else if (controleValue === 'SALDO') {
          controleDB = 'GRUPO';
        } else {
          // Se já veio SERIE ou GRUPO, manter
          controleDB = controleValue;
        }
        
        const itemData = {
          contrato_id: contratoSupabase.id,
          // CRÍTICO: equipamento_id é obrigatório para GRUPO também (trigger precisa)
          equipamento_id: item.equipamentoId || equip?.id || null,
          modelo_id: equip?.modelo_id || equip?.modeloId || null,
          grupo_id: equip?.grupo_id || equip?.grupoId || null,
          controle: controleDB,
          quantidade: item.quantidade,
          periodo: item.periodoEscolhido,
          preco_unitario: item.valorUnitario,
          preco_total: item.subtotal,
          data_locacao: contrato.entrega.data,
          data_devolucao: dataFimCalculada,
          status: 'RESERVADO',
          observacoes: null
        };
        
        console.log(`[FINALIZACAO] Item ${idx + 1} preparado:`, {
          controle: itemData.controle,
          equipamento_id: itemData.equipamento_id,
          modelo_id: itemData.modelo_id,
          grupo_id: itemData.grupo_id,
          quantidade: itemData.quantidade
        });
        
        return itemData;
      });

      console.log('[FINALIZACAO] Inserindo itens no Supabase...');

      const { error: itensError } = await supabase
        .from('contrato_itens')
        .insert(itensData);

      if (itensError) {
        console.error('[FINALIZACAO] Erro ao criar itens do contrato:', itensError);
        throw itensError;
      }

      console.log('[FINALIZACAO] Itens criados com sucesso');

      // Salvar também no localStorage como backup (compatibilidade)
      const novoContrato = {
        id: contratoSupabase.id,
        lojaId: contrato.lojaId,
        numero: numeroContrato.toString(),
        clienteId: contrato.clienteId,
        cliente: contrato.cliente!,
        itens: contrato.itens.map(item => ({
          id: crypto.randomUUID(),
          equipamentoId: item.equipamentoId,
          equipamento: item.equipamento!,
          controle: item.controle,
          quantidade: item.quantidade,
          periodoEscolhido: item.periodoEscolhido,
          valorUnitario: item.valorUnitario,
          subtotal: item.subtotal,
          valorTotal: item.subtotal,
          periodo: item.periodoEscolhido === 'DIARIA' ? 'diario' as const : item.periodoEscolhido === 'SEMANA' ? 'semanal' as const : 'mensal' as const
        })) as ItemContrato[],
        entrega: contrato.entrega,
        condicoes: contrato.condicoes,
        pagamento: contrato.pagamento,
        status: contratoData.status as any,
        rascunho: false,
        timeline: [],
        valorTotal: valorTotalCalculado,
        dataInicio: contrato.entrega.data,
        dataFim: dataFimCalculada,
        formaPagamento: contrato.pagamento.forma as any,
        observacoes: contrato.condicoes.observacoes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Contrato já salvo no Supabase acima

      // Criar tarefa logística no Supabase ao invés de localStorage
      try {
        // Montar endereço formatado
        const endereco = contrato.obra?.endereco 
          ? {
              logradouro: contrato.obra.endereco.logradouro,
              numero: contrato.obra.endereco.numero,
              bairro: contrato.obra.endereco.bairro,
              cidade: contrato.obra.endereco.cidade,
              uf: contrato.obra.endereco.uf,
              cep: contrato.obra.endereco.cep
            }
          : contrato.cliente?.endereco || {};

        // Buscar telefone do cliente
        const contatoTelefone = contrato.cliente?.contatos?.find(
          c => c.tipo === 'Telefone' || c.tipo === 'WhatsApp'
        );

        // Criar tarefa de entrega no Supabase apenas se cliente NÃO retira
        if (!contrato.entrega.clienteRetiraEDevolve) {
          await createTarefaLogistica({
            loja_id: contrato.lojaId,
            contrato_id: contratoSupabase.id,
            cliente_id: contrato.clienteId,
            tipo: 'ENTREGA',
            status: 'AGENDAR',
            prioridade: 'MEDIA',
            previsto_iso: `${contrato.entrega.data}T${contrato.entrega.horaSugestao || '09:00'}:00`,
            duracao_min: 120,
            janela: contrato.entrega.janela === 'MANHA' ? 'Manhã' : 'Tarde',
            endereco: endereco,
            cliente_nome: contrato.cliente?.tipo === 'PJ' 
              ? (contrato.cliente.razaoSocial || contrato.cliente.nomeFantasia || '')
              : (contrato.cliente?.nome || ''),
            cliente_telefone: contatoTelefone?.valor || null,
            observacoes: `Contrato ${numeroContrato} - ${contrato.itens.length} item(ns)`
          });
          console.log('✅ Tarefa logística criada no Supabase para contrato:', numeroContrato);
        } else {
          console.log('⏭️ Tarefa logística não criada - Cliente retira e devolve');
        }

        console.log('✅ Tarefa logística criada no Supabase para contrato:', numeroContrato);
      } catch (errorLogistica) {
        console.error('Erro ao criar tarefa logística:', errorLogistica);
        // Não bloquear a criação do contrato por erro na logística
      }

      // Gerar títulos
      gerarTitulosFechamento(novoContrato as any);

      // Aplicar taxa de deslocamento se habilitada
      if (contrato.taxaDeslocamento?.aplicar && contrato.taxaDeslocamento.valor > 0) {
        try {
          await TaxaDeslocamentoService.aplicarTaxa({
            contratoId: contratoSupabase.id,
            valor: contrato.taxaDeslocamento.valor,
            justificativa: contrato.taxaDeslocamento.justificativa,
            motivo: 'MANUAL',
            usuarioId: 'system',
            usuarioNome: 'Sistema'
          });
          
          console.log('Taxa de deslocamento aplicada:', {
            valor: contrato.taxaDeslocamento.valor,
            justificativa: contrato.taxaDeslocamento.justificativa
          });
        } catch (error) {
          console.error('Erro ao aplicar taxa de deslocamento:', error);
        }
      }

      // Agrupar cobrança se habilitado
      if (contrato.pagamento.cobrancaUnica) {
        agruparCobrancaCliente(contrato.clienteId);
      }

      // Liberar reserva
      if (contrato.reservaId) {
        liberarReserva(contrato.reservaId);
      }

      // Limpar rascunho
      if (contrato.id) {
        localStorage.removeItem(`contrato-rascunho-${contrato.id}`);
      }

      // === ENVIAR PARA ASSINATURA DIGITAL VIA ZAPSIGN ===
      try {
        console.log('[ZAPSIGN] Gerando PDF e enviando para assinatura...');
        
        // Extrair email e telefone do cliente
        const contatoEmail = contrato.cliente?.contatos?.find(
          c => c.tipo === 'Email' || c.tipo === 'email'
        );
        const contatoWhatsApp = contrato.cliente?.contatos?.find(
          c => c.tipo === 'WhatsApp' || c.tipo === 'Telefone' || c.tipo === 'whatsapp' || c.tipo === 'telefone'
        );

        const nomeCliente = contrato.cliente?.tipo === 'PJ'
          ? (contrato.cliente.razaoSocial || contrato.cliente.nomeFantasia || contrato.cliente.nomeRazao || '')
          : (contrato.cliente?.nome || contrato.cliente?.nomeRazao || '');

        // Gerar PDF base64
        const { gerarContratoPDFBase64 } = await import('@/utils/contrato-pdf');
        const pdfBase64 = gerarContratoPDFBase64({
          cliente: {
            nomeRazao: nomeCliente,
            documento: contrato.cliente?.documento || contrato.cliente?.cpf || contrato.cliente?.cnpj || '',
            endereco: contrato.cliente?.endereco,
          },
          itens: contrato.itens.map(item => ({
            equipamento: {
              nome: item.equipamento?.nome || item.equipamento?.descricao || 'Equipamento',
              codigo: item.equipamento?.codigo || '',
            },
            quantidade: item.quantidade,
            periodoEscolhido: item.periodoEscolhido,
            valorUnitario: item.valorUnitario,
            subtotal: item.subtotal,
          })),
          entrega: {
            data: contrato.entrega.data,
            janela: contrato.entrega.janela,
            observacoes: contrato.entrega.observacoes,
          },
          pagamento: {
            forma: contrato.pagamento.forma,
            vencimentoISO: contrato.pagamento.vencimentoISO,
          },
          valorTotal: valorTotalCalculado,
        });

        const { data: signData, error: signError } = await supabase.functions.invoke('zapsign-enviar', {
          body: {
            pdf_base64: pdfBase64,
            nome_documento: `Contrato ${numeroContrato} - ${nomeCliente}`,
            signatario: {
              nome: nomeCliente,
              email: contatoEmail?.valor || '',
              telefone: contatoWhatsApp?.valor || '',
            },
            contrato_id: contratoSupabase.id,
          },
        });

        if (signError) {
          console.error('[ZAPSIGN] Erro ao enviar:', signError);
          toast({
            title: "Contrato criado, mas falha na assinatura",
            description: "O contrato foi salvo. Tente enviar para assinatura novamente pela lista de contratos.",
            variant: "destructive",
            duration: 6000,
          });
        } else {
          console.log('[ZAPSIGN] Enviado com sucesso:', signData);
          const canais = [
            contatoEmail?.valor ? 'e-mail' : '',
            contatoWhatsApp?.valor ? 'WhatsApp' : '',
          ].filter(Boolean).join(' e ');

          toast({
            title: "Contrato enviado para assinatura!",
            description: `Contrato ${numeroContrato} enviado${canais ? ` via ${canais}` : ''}`,
            duration: 5000,
          });
        }
      } catch (signErr) {
        console.error('[ZAPSIGN] Erro inesperado:', signErr);
        toast({
          title: "Contrato criado, mas falha na assinatura",
          description: "O contrato foi salvo. Tente enviar para assinatura novamente depois.",
          variant: "destructive",
          duration: 6000,
        });
      }

      navigate('/contratos');
    } catch (error) {
      console.error('Erro ao finalizar contrato:', error);
      toast({
        title: "Erro ao criar contrato",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar o contrato",
        variant: "destructive",
        duration: 5000
      });
    }
  };
  const podeAvancar = () => {
    switch (etapaAtual) {
      case 0:
        return contrato.clienteId !== '';
      case 1:
        return contrato.itens.length > 0;
      case 2:
        {
          // Validações básicas
          const dataValida = contrato.entrega.data !== '';
          const janelaValida = contrato.entrega.janela === 'MANHA' || contrato.entrega.janela === 'TARDE';
          const confirmacoesValidas = contrato.condicoes.confirmacoes.length >= 1;
          
          // Se taxa de deslocamento aplicada, validar justificativa quando valor for MENOR que o padrão
          if (!contrato.entrega.clienteRetiraEDevolve && contrato.taxaDeslocamento?.aplicar) {
            const taxaConfig = useTaxaDeslocamentoStore.getState().getConfigByLoja(contrato.lojaId);
            const valorPadrao = taxaConfig?.valorPadrao || 50.00;
            const valorMenor = contrato.taxaDeslocamento.valor < valorPadrao;
            const precisaJustificativa = valorMenor && (taxaConfig?.obrigarJustificativaQuandoDiferir ?? true);
            
            if (precisaJustificativa) {
              const temJustificativa = contrato.taxaDeslocamento.justificativa && contrato.taxaDeslocamento.justificativa.trim().length > 0;
              return dataValida && janelaValida && confirmacoesValidas && temJustificativa;
            }
          }
          
          return dataValida && janelaValida && confirmacoesValidas;
        }
      case 3:
        {
          // Verificar se todas as 3 confirmações contratuais estão marcadas
          const confirmacoesMarcadas = CONFIRMACOES_CONDICOES.every(conf => contrato.condicoes.confirmacoes.includes(conf));
          // Verificar se o aceite dos termos está marcado
          const termosAceitos = contrato.condicoes.confirmacoes.includes('termos-aceitos');
          return confirmacoesMarcadas && termosAceitos;
        }
      case 4:
        return true;
      case 5:
        return true;
      // Documentos sempre válido
      default:
        return true;
    }
  };
  const renderEtapaCliente = () => <Card>
      <CardHeader>
        <CardTitle>Selecionar Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente por nome ou documento..." value={searchCliente} onChange={e => setSearchCliente(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => setIsClienteFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Cliente
          </Button>
        </div>
        
        {contrato.cliente && <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{contrato.cliente.nomeRazao}</h3>
                <p className="text-sm text-muted-foreground">{contrato.cliente.documento}</p>
                <Badge variant="default" className="mt-1">
                  {formatarStatusCliente(contrato.cliente)}
                </Badge>
              </div>
              <Button type="button" variant="outline" onClick={() => {
                setContrato(prev => ({ ...prev, clienteId: '', cliente: undefined }));
                setSearchCliente('');
                const novosParams = new URLSearchParams(searchParams);
                novosParams.delete('clienteId');
                setSearchParams(novosParams, { replace: true });
              }}>
                Alterar
              </Button>
            </div>
          </div>}
        
        {!contrato.cliente && <div className="space-y-2 max-h-64 overflow-y-auto">
            {clientesFiltrados.map(cliente => <div key={cliente.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => selecionarCliente(cliente)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{cliente.nomeRazao}</h4>
                    <p className="text-sm text-muted-foreground">{cliente.documento}</p>
                  </div>
                  <Badge variant="outline">
                    {formatarStatusCliente(cliente)}
                  </Badge>
                </div>
              </div>)}
          </div>}

        {/* Modal de Cliente Bloqueado */}
        <ClienteBlockedModal open={!!clienteBloqueado} onClose={() => setClienteBloqueado(null)} onApprove={aprovarCliente} cliente={clienteBloqueado?.cliente || {
        nomeRazao: '',
        documento: ''
      }} motivo={clienteBloqueado?.motivo || ''} origemLoja={clienteBloqueado?.origemLoja} valor={clienteBloqueado?.valor} />

        {/* Modal Novo Cliente */}
        <Dialog open={isClienteFormOpen} onOpenChange={setIsClienteFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <ClienteForm
              onSave={(cliente) => {
                setIsClienteFormOpen(false);
                selecionarCliente(cliente);
              }}
              onCancel={() => setIsClienteFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>;
  const renderEtapaItens = () => <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Equipamentos Disponíveis</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {equipamentosFiltrados.length} disponíveis
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar por nome, código ou grupo..." value={searchEquipamento} onChange={e => setSearchEquipamento(e.target.value)} className="pl-10" />
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {loadingEquipamentos ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Carregando equipamentos...
              </div>
            ) : equipamentosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum equipamento disponível</p>
              </div>
            ) : (
              equipamentosFiltrados.map(equipamento => {
                const jaAdicionado = contrato.itens.some(i => i.equipamentoId === equipamento.id);
                return (
                  <div 
                    key={equipamento.id} 
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      jaAdicionado 
                        ? "bg-primary/5 border-primary/30 opacity-60" 
                        : "hover:bg-muted/50 hover:border-primary/20"
                    )}
                    onClick={() => !jaAdicionado && adicionarItem(equipamento)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{equipamento.nome}</h4>
                          {jaAdicionado && <Badge variant="outline" className="text-xs shrink-0 text-primary">Adicionado</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {equipamento.codigo} • {equipamento.grupo?.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {equipamento.controle || equipamento.tipoControle || (equipamento as any).tipo || 'SERIALIZADO'}
                          </Badge>
                          {equipamento.qtdDisponivel != null && (
                            <span className="text-xs text-muted-foreground">
                              {equipamento.qtdDisponivel} un. disponíveis
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-semibold">
                          R$ {(equipamento.tabela?.DIARIA || equipamento.precos.diaria || 0).toLocaleString('pt-BR')}<span className="text-xs font-normal text-muted-foreground">/dia</span>
                        </p>
                        {!jaAdicionado && <Plus className="w-4 h-4 ml-auto mt-1 text-primary" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Itens Selecionados */}
      {contrato.itens.length > 0 && <>
        <Card>
          <CardHeader>
            <CardTitle>Itens do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contrato.itens.map((item, index) => <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{item.equipamento?.nome}</h4>
                      <p className="text-sm text-muted-foreground">{item.equipamento?.codigo}</p>
                      <Badge variant="outline" className="mt-1">
                        {item.controle}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removerItem(index)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Quantidade</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max={item.controle === 'GRUPO' ? (() => {
                          const equipamento = item.equipamento!;
                          const qtdDisponivel = equipamento.qtdDisponivel || equipamento.quantidade || 0;
                          const qtdOutrosItens = contrato.itens
                            .filter((it, idx) => idx !== index && it.equipamentoId === item.equipamentoId)
                            .reduce((sum, it) => sum + it.quantidade, 0);
                          return qtdDisponivel - qtdOutrosItens;
                        })() : undefined}
                        value={item.quantidade} 
                        onChange={e => atualizarItem(index, 'quantidade', e.target.value)}
                        title={item.controle === 'GRUPO' ? (() => {
                          const equipamento = item.equipamento!;
                          const qtdDisponivel = equipamento.qtdDisponivel || equipamento.quantidade || 0;
                          const qtdOutrosItens = contrato.itens
                            .filter((it, idx) => idx !== index && it.equipamentoId === item.equipamentoId)
                            .reduce((sum, it) => sum + it.quantidade, 0);
                          const saldoRestante = qtdDisponivel - qtdOutrosItens;
                          return `Máximo disponível: ${saldoRestante} un. (${qtdDisponivel} total - ${qtdOutrosItens} em outros itens)`;
                        })() : undefined}
                      />
                    </div>
                    <div>
                      <Label>Período</Label>
                      <Select value={item.periodoEscolhido} onValueChange={value => atualizarItem(index, 'periodoEscolhido', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DIARIA">Diária</SelectItem>
                          <SelectItem value="SEMANA">Semanal</SelectItem>
                          <SelectItem value="QUINZENA">Quinzenal</SelectItem>
                          <SelectItem value="21DIAS">21 Dias</SelectItem>
                          <SelectItem value="MES">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor Unit.</Label>
                      <div className="text-lg font-semibold">
                        R$ {item.valorUnitario.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                      </div>
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <div className="text-lg font-semibold text-primary">
                        R$ {item.subtotal.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                      </div>
                    </div>
                  </div>
                </div>)}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total do Contrato:</span>
                  <span className="text-primary">
                    R$ {valorTotalCalculado.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datas do Contrato */}
        <Card>
          <CardHeader>
            <CardTitle>Período do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input 
                  type="date" 
                  value={contrato.entrega.data} 
                  onChange={e => {
                    console.log('📅 Data de início alterada:', e.target.value);
                    setContrato(prev => ({
                      ...prev,
                      entrega: {
                        ...prev.entrega,
                        data: e.target.value
                      }
                    }));
                    setHasChanges(true);
                  }} 
                />
              </div>
              <div>
                <Label>Data de Fim (Prevista)</Label>
                <Input 
                  type="date" 
                  value={(() => {
                    if (!contrato.entrega.data || contrato.itens.length === 0) return '';
                    const [ano, mes, dia] = contrato.entrega.data.split('-').map(Number);
                    const periodos = contrato.itens.map(item => item.periodoEscolhido);
                    let diasParaAdicionar = 1;
                    if (periodos.includes('MES')) diasParaAdicionar = 28;
                    else if (periodos.includes('21DIAS')) diasParaAdicionar = 21;
                    else if (periodos.includes('QUINZENA')) diasParaAdicionar = 14;
                    else if (periodos.includes('SEMANA')) diasParaAdicionar = 7;
                    
                    let diaFim = dia + diasParaAdicionar;
                    let mesFim = mes;
                    let anoFim = ano;
                    while (diaFim > 30) {
                      diaFim -= 30;
                      mesFim++;
                      if (mesFim > 12) {
                        mesFim = 1;
                        anoFim++;
                      }
                    }
                    return `${anoFim}-${String(mesFim).padStart(2, '0')}-${String(diaFim).padStart(2, '0')}`;
                  })()} 
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Calculada automaticamente com base no maior período
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </>}
    </div>;
  const renderEtapaEntrega = () => <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Entrega e Coleta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Obra/Endereço de Entrega */}
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Local de Entrega (Obra)
          </Label>
          
          {contrato.obra ? <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{contrato.obra.apelido}</h4>
                    {contrato.obra.isPadrao && <Badge variant="outline" className="text-xs">Padrão</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contrato.obra.endereco.logradouro}, {contrato.obra.endereco.numero}
                    {contrato.obra.endereco.complemento && ` - ${contrato.obra.endereco.complemento}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contrato.obra.endereco.bairro} - {contrato.obra.endereco.cidade}/{contrato.obra.endereco.uf}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CEP: {contrato.obra.endereco.cep}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSeletorObraOpen(true)}>
                  Alterar
                </Button>
              </div>
            </div> : <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Nenhuma obra/endereço de entrega selecionado
              </p>
              <Button variant="outline" onClick={() => setSeletorObraOpen(true)} disabled={!contrato.clienteId}>
                <Plus className="h-4 w-4 mr-2" />
                Selecionar ou Cadastrar Obra
              </Button>
              {!contrato.clienteId && <p className="text-xs text-muted-foreground mt-2">
                  Selecione um cliente primeiro
                </p>}
            </div>}
          
          {!contrato.obra && contrato.cliente && <Button variant="link" size="sm" className="text-xs" onClick={() => {
          // Usar endereço do cliente como fallback
          setContrato(prev => ({
            ...prev,
            obra: {
              id: 'temp-cliente-endereco',
              clienteId: contrato.clienteId,
              apelido: 'Endereço do Cliente',
              endereco: contrato.cliente!.endereco,
              isPadrao: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }));
          setHasChanges(true);
          toast({
            title: "Endereço do cliente selecionado",
            description: "Usando o endereço cadastrado no cliente"
          });
        }}>
              Usar endereço cadastrado no cliente
            </Button>}
        </div>

        {/* Previsão de Entrega */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Previsão de Entrega</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Prevista</Label>
              <Input 
                type="date" 
                value={contrato.entrega.data} 
                onChange={e => {
                  setContrato(prev => ({
                    ...prev,
                    entrega: {
                      ...prev.entrega,
                      data: e.target.value
                    }
                  }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div>
              <Label>Janela de Entrega</Label>
              <Select value={contrato.entrega.janela} onValueChange={(value: 'MANHA' | 'TARDE') => {
              setContrato(prev => ({
                ...prev,
                entrega: {
                  ...prev.entrega,
                  janela: value,
                  horaSugestao: undefined
                }
              }));
              setHasChanges(true);
            }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANHA">Manhã</SelectItem>
                  <SelectItem value="TARDE">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {contrato.entrega.janela && <AssistenteHorarios janela={contrato.entrega.janela} onSelect={horario => {
        setContrato(prev => ({
          ...prev,
          entrega: {
            ...prev.entrega,
            horaSugestao: horario
          }
        }));
        setHasChanges(true);
      }} />}

        {contrato.entrega.horaSugestao && <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="font-medium">Horário Sugerido: {contrato.entrega.horaSugestao}</span>
            </div>
          </div>}

        {/* Opção Cliente Retira e Devolve */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="cliente-retira-devolve"
              checked={contrato.entrega.clienteRetiraEDevolve}
              onCheckedChange={(checked) => {
                setContrato(prev => ({
                  ...prev,
                  entrega: {
                    ...prev.entrega,
                    clienteRetiraEDevolve: checked === true
                  },
                  // Se marcar cliente retira, desabilitar taxa
                  taxaDeslocamento: checked ? undefined : prev.taxaDeslocamento
                }));
                setHasChanges(true);
              }}
            />
            <Label htmlFor="cliente-retira-devolve" className="text-base font-medium cursor-pointer">
              Cliente retira e devolve os equipamentos
            </Label>
          </div>
          <p className="text-sm text-muted-foreground pl-6">
            Quando marcado, o cliente é responsável pela retirada e devolução dos equipamentos na loja. Não haverá taxa de deslocamento.
          </p>
        </div>

        {/* Taxa de Deslocamento (somente se não for cliente retira e devolve) */}
        {!contrato.entrega.clienteRetiraEDevolve && (() => {
          const taxaConfig = useTaxaDeslocamentoStore.getState().getConfigByLoja(contrato.lojaId);
          const valorPadraoTaxa = taxaConfig?.valorPadrao || 50.00;
          const taxaAtiva = taxaConfig?.ativo ?? true;
          const taxaAplicada = contrato.taxaDeslocamento?.aplicar ?? false;
          const valorTaxa = contrato.taxaDeslocamento?.valor ?? valorPadraoTaxa;
          const valorDiferePadrao = valorTaxa !== valorPadraoTaxa;
          const valorMenorQuePadrao = valorTaxa < valorPadraoTaxa;
          const precisaJustificativa = taxaAplicada && valorMenorQuePadrao && (taxaConfig?.obrigarJustificativaQuandoDiferir ?? true);

          return taxaAtiva ? (
            <div className="border-2 rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Label htmlFor="taxa-deslocamento" className="text-base font-semibold">Taxa de Deslocamento</Label>
                  <Badge variant="outline" className="text-xs">
                    Padrão: R$ {valorPadraoTaxa.toFixed(2).replace('.', ',')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${taxaAplicada ? 'text-primary' : 'text-muted-foreground'}`}>
                    {taxaAplicada ? 'Ativada' : 'Desativada'}
                  </span>
                  <Switch 
                    id="taxa-deslocamento"
                    checked={taxaAplicada}
                    onCheckedChange={(checked) => {
                      setContrato(prev => ({
                        ...prev,
                        taxaDeslocamento: checked ? {
                          aplicar: true,
                          valor: valorPadraoTaxa,
                          justificativa: undefined
                        } : undefined
                      }));
                      setHasChanges(true);
                    }}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=unchecked]:bg-muted data-[state=unchecked]:border-border border-2 shadow-sm scale-125"
                  />
                </div>
              </div>
              
              {taxaAplicada && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <div>
                    <Label>Valor da Taxa</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          R$
                        </span>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorTaxa}
                          onChange={(e) => {
                            const novoValor = parseFloat(e.target.value) || 0;
                            setContrato(prev => ({
                              ...prev,
                              taxaDeslocamento: {
                                ...prev.taxaDeslocamento!,
                                valor: novoValor
                              }
                            }));
                            setHasChanges(true);
                          }}
                          className="pl-10"
                          placeholder="0.00"
                          lang="pt-BR"
                        />
                      </div>
                      {valorDiferePadrao && (
                        <Badge variant="secondary" className="text-xs">
                          Alterado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atual: R$ {valorTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {valorDiferePadrao && (
                    <div>
                      <Label>
                        Justificativa {valorMenorQuePadrao && '(obrigatória) *'}
                      </Label>
                      <Textarea 
                        placeholder={valorMenorQuePadrao 
                          ? "Informe o motivo da redução do valor padrão..."
                          : "Opcional: justificativa para o aumento do valor..."
                        }
                        value={contrato.taxaDeslocamento?.justificativa || ''}
                        onChange={(e) => {
                          setContrato(prev => ({
                            ...prev,
                            taxaDeslocamento: {
                              ...prev.taxaDeslocamento!,
                              justificativa: e.target.value
                            }
                          }));
                          setHasChanges(true);
                        }}
                        className="min-h-[80px]"
                      />
                      {valorMenorQuePadrao && (!contrato.taxaDeslocamento?.justificativa || contrato.taxaDeslocamento.justificativa.trim().length === 0) && (
                        <p className="text-sm text-destructive mt-1">
                          Justificativa obrigatória quando o valor é menor que o padrão
                        </p>
                      )}
                    </div>
                  )}
                  
                  {taxaConfig?.permitirExclusao && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setContrato(prev => ({
                          ...prev,
                          taxaDeslocamento: undefined
                        }));
                        setHasChanges(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover Taxa
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : null;
        })()}
        
        <div>
          <Label className="text-base font-medium">Confirmações de Entrega</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Marque as confirmações realizadas com o cliente:
          </p>
          
          <div className="space-y-3">
            {CONFIRMACOES_ENTREGA.map((confirmacao, index) => <div key={index} className="flex items-center space-x-2">
                <Checkbox id={`confirmacao-entrega-${index}`} checked={contrato.condicoes.confirmacoes.includes(confirmacao)} onCheckedChange={checked => {
              const novasConfirmacoes = checked ? [...contrato.condicoes.confirmacoes, confirmacao] : contrato.condicoes.confirmacoes.filter(c => c !== confirmacao);
              setContrato(prev => ({
                ...prev,
                condicoes: {
                  ...prev.condicoes,
                  confirmacoes: novasConfirmacoes
                }
              }));
              setHasChanges(true);
            }} />
                <Label htmlFor={`confirmacao-entrega-${index}`} className="text-sm cursor-pointer">
                  {confirmacao}
                </Label>
              </div>)}
          </div>
        </div>

        <div>
          <Label>Observações sobre Entrega</Label>
          <Textarea placeholder="Observações sobre horários, acesso, condições especiais..." value={contrato.entrega.observacoes || ''} onChange={e => {
          setContrato(prev => ({
            ...prev,
            entrega: {
              ...prev.entrega,
              observacoes: e.target.value
            }
          }));
          setHasChanges(true);
        }} />
        </div>
      </CardContent>
      
      {/* Modal de Seleção/Cadastro de Obra */}
      <SeletorObraModal open={seletorObraOpen} onOpenChange={setSeletorObraOpen} clienteId={contrato.clienteId} onSelect={obra => {
      setContrato(prev => ({
        ...prev,
        obraId: obra.id,
        obra: obra
      }));
      setHasChanges(true);
      toast({
        title: "Obra selecionada",
        description: `Entrega será feita em: ${obra.apelido}`,
        duration: 1500
      });
    }} />
    </Card>;
  const renderEtapaCondicoes = () => <Card>
      <CardHeader>
        <CardTitle>Condições Gerais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confirmações Contratuais */}
        <div>
          <Label className="text-base font-medium">Confirmações Contratuais</Label>
          <p className="text-sm text-muted-foreground mb-3">
            O cliente está ciente das seguintes condições:
          </p>
          
          <div className="space-y-3">
            {CONFIRMACOES_CONDICOES.map((confirmacao, index) => <div key={index} className="flex items-center space-x-2">
                <Checkbox id={`confirmacao-condicoes-${index}`} checked={contrato.condicoes.confirmacoes.includes(confirmacao)} onCheckedChange={checked => {
              const novasConfirmacoes = checked ? [...contrato.condicoes.confirmacoes, confirmacao] : contrato.condicoes.confirmacoes.filter(c => c !== confirmacao);
              setContrato(prev => ({
                ...prev,
                condicoes: {
                  ...prev.condicoes,
                  confirmacoes: novasConfirmacoes
                }
              }));
              setHasChanges(true);
            }} />
                <Label htmlFor={`confirmacao-condicoes-${index}`} className="text-sm cursor-pointer">
                  {confirmacao}
                </Label>
              </div>)}
          </div>
        </div>

        {/* Separador Visual */}
        <div className="border-t" />

        {/* Observações Gerais */}
        <div>
          <Label>Observações Gerais do Contrato</Label>
          <Textarea placeholder="Observações gerais, condições especiais, acordos específicos..." value={contrato.condicoes.observacoes || ''} onChange={e => {
          setContrato(prev => ({
            ...prev,
            condicoes: {
              ...prev.condicoes,
              observacoes: e.target.value
            }
          }));
          setHasChanges(true);
        }} />
        </div>

        {/* Aceite dos Termos */}
        <div className="flex items-center space-x-2">
          <Checkbox id="aceite-condicoes" checked={contrato.condicoes.confirmacoes.includes('termos-aceitos')} onCheckedChange={checked => {
          const novasConfirmacoes = checked ? [...contrato.condicoes.confirmacoes.filter(c => c !== 'termos-aceitos'), 'termos-aceitos'] : contrato.condicoes.confirmacoes.filter(c => c !== 'termos-aceitos');
          setContrato(prev => ({
            ...prev,
            condicoes: {
              ...prev.condicoes,
              confirmacoes: novasConfirmacoes
            }
          }));
          setHasChanges(true);
        }} />
          <Label htmlFor="aceite-condicoes" className="text-sm cursor-pointer font-medium">
            Li e aceito as condições gerais de locação
          </Label>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Informação</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            As cláusulas contratuais completas estarão disponíveis no layout de impressão configurável.
          </p>
        </div>
      </CardContent>
    </Card>;
  const renderEtapaPagamento = () => {
    const taxaAplicada = contrato.taxaDeslocamento?.aplicar ?? false;
    const valorTaxa = contrato.taxaDeslocamento?.valor ?? 0;
    // Calcular subtotal dos itens SEM a taxa
    const subtotalItens = contrato.itens.reduce((sum, item) => sum + item.subtotal, 0);
    
    return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={contrato.pagamento.forma} onValueChange={(value: 'BOLETO' | 'PIX' | 'CARTAO' | 'DINHEIRO') => {
            setContrato(prev => ({
              ...prev,
              pagamento: {
                ...prev.pagamento,
                forma: value
              }
            }));
            setHasChanges(true);
          }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CARTAO">Cartão</SelectItem>
                <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={contrato.pagamento.vencimentoISO} onChange={e => {
            console.log('💳 Vencimento alterado:', e.target.value);
            setContrato(prev => ({
              ...prev,
              pagamento: {
                ...prev.pagamento,
                vencimentoISO: e.target.value
              }
            }));
            setHasChanges(true);
          }} />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Resumo Financeiro</h4>
          <div className="space-y-1 text-sm">
            {politicaAplicada ? <>
                <div className="flex justify-between">
                  <span>Subtotal de tabela:</span>
                  <span>R$ {politicaAplicada.totalTabela.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Desconto ({politicaAplicada.descontoPctContrato}%):</span>
                  <span>-R$ {(politicaAplicada.totalTabela - politicaAplicada.totalComDesconto).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}</span>
                </div>
                <div className="flex justify-between font-semibold text-blue-800 border-t pt-1">
                  <span>Total com desconto:</span>
                  <span>R$ {politicaAplicada.totalComDesconto.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}</span>
                </div>
                {taxaAplicada && (
                  <div className="flex justify-between text-orange-700 border-t pt-1">
                    <span>Taxa de Deslocamento:</span>
                    <span>R$ {valorTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-blue-900 border-t-2 border-blue-300 pt-2 mt-1">
                  <span>Total Geral:</span>
                  <span>R$ {valorTotalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Política {contrato.cliente?.politicaComercial} aplicada</p>
                    <p>Emissão: {formatarDataISO(politicaAplicada.faturamentoAgrupado.billDate.split('T')[0])}</p>
                    <p>Vencimento: {formatarDataISO(politicaAplicada.faturamentoAgrupado.dueDate.split('T')[0])}</p>
                  </div>
                </div>
              </> : <>
                <div className="flex justify-between">
                  <span>Subtotal dos itens:</span>
                  <span>R$ {subtotalItens.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}</span>
                </div>
                {taxaAplicada && (
                  <div className="flex justify-between text-orange-700 border-t pt-1">
                    <span>Taxa de Deslocamento:</span>
                    <span>R$ {valorTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-blue-900 border-t-2 border-blue-300 pt-2 mt-1">
                  <span>Total Geral:</span>
                  <span>R$ {valorTotalCalculado.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}</span>
                </div>
              </>}
          </div>
        </div>

        {new Date(contrato.pagamento.vencimentoISO) <= new Date() && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Vencimento Hoje</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              O vencimento está definido para hoje. Verifique se esta é a data acordada com o cliente.
            </p>
          </div>}
      </CardContent>
    </Card>;
  };
  const renderEtapaDocumentos = () => <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos e Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-1 gap-4">
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setShowPreview(true)}>
            <FileText className="h-6 w-6" />
            <span>Contrato de Locação (Resumo)</span>
            <span className="text-xs text-muted-foreground">Visualizar documento antes do envio</span>
          </Button>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold mb-2 text-primary">Envio para Assinatura Digital</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Ao clicar em <strong>"Enviar para Assinatura"</strong> abaixo, o contrato será salvo e enviado via ZapSign</li>
            <li>• O cliente receberá o link de assinatura por <strong>e-mail</strong> e <strong>WhatsApp</strong> automaticamente</li>
            <li>• O status do contrato será atualizado para "Pendente de Assinatura"</li>
            <li>• Você pode acompanhar o status na lista de contratos</li>
          </ul>
        </div>

        <ContratoResumoPreview open={showPreview} onClose={() => setShowPreview(false)} contrato={contrato as any} onEnviarAssinatura={handleEnviarAssinatura} />
      </CardContent>
    </Card>;

  // Helper para formatar data ISO para exibição (evita bug de timezone)
  const formatarDataISO = (dataISO: string): string => {
    if (!dataISO) return '';
    // Pega apenas a parte da data (YYYY-MM-DD) e formata para DD/MM/YYYY
    const [ano, mes, dia] = dataISO.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  };
  const renderEtapaConferencia = () => {
    // Calcular data de fim baseada no período do contrato
    const calcularDataFim = () => {
      if (!contrato.entrega.data || contrato.itens.length === 0) {
        console.log('⚠️ Conferência: Sem data de entrega ou sem itens');
        return '';
      }

      // Usar apenas a string ISO sem converter para Date para evitar timezone
      const [ano, mes, dia] = contrato.entrega.data.split('-').map(Number);
      const periodos = contrato.itens.map(item => item.periodoEscolhido);
      console.log('🔍 Debug Conferência:', {
        dataEntrega: contrato.entrega.data,
        dataEntregaParsed: {
          ano,
          mes,
          dia
        },
        periodos,
        itens: contrato.itens.map(i => ({
          nome: i.equipamento?.nome,
          periodo: i.periodoEscolhido,
          qtd: i.quantidade
        }))
      });

      // Pegar o maior período para calcular o fim
      let diasParaAdicionar = 1; // Default: 1 dia (DIARIA)

      if (periodos.includes('MES')) diasParaAdicionar = 28;else if (periodos.includes('21DIAS')) diasParaAdicionar = 21;else if (periodos.includes('QUINZENA')) diasParaAdicionar = 14;else if (periodos.includes('SEMANA')) diasParaAdicionar = 7;
      console.log('📅 Dias a adicionar:', diasParaAdicionar);

      // Calcular data fim em formato ISO direto (evita timezone)
      // Trabalhar com os números diretamente
      let diaFim = dia + diasParaAdicionar;
      let mesFim = mes;
      let anoFim = ano;
      
      // Ajustar mês/ano se necessário (simplificado, considera meses de 30 dias)
      while (diaFim > 30) {
        diaFim -= 30;
        mesFim++;
        if (mesFim > 12) {
          mesFim = 1;
          anoFim++;
        }
      }
      
      const dataFimISO = `${anoFim}-${String(mesFim).padStart(2, '0')}-${String(diaFim).padStart(2, '0')}`;
      console.log('✅ Data fim calculada:', {
        dataInicio: contrato.entrega.data,
        diasAdicionados: diasParaAdicionar,
        dataFimISO,
        dataFimFormatada: formatarDataISO(dataFimISO)
      });
      return dataFimISO;
    };
    const dataFim = calcularDataFim();

    // Log do estado de pagamento
    console.log('💰 Debug Pagamento:', {
      forma: contrato.pagamento.forma,
      vencimentoISO: contrato.pagamento.vencimentoISO,
      vencimentoFormatado: formatarDataISO(contrato.pagamento.vencimentoISO),
      cobrancaUnica: contrato.pagamento.cobrancaUnica
    });
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Conferência Final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Painel de Debug - Estado Raw */}
          

          {/* Resumo do Cliente */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Cliente</h4>
              <div className="space-y-1 text-sm">
                <p><strong>{contrato.cliente?.nomeRazao}</strong></p>
                <p>{contrato.cliente?.documento}</p>
                <Badge variant="default">{contrato.cliente ? formatarStatusCliente(contrato.cliente) : 'N/A'}</Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Período do Contrato</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Início:</strong> {contrato.entrega.data ? formatarDataISO(contrato.entrega.data) : 'Não informado'}</p>
                {dataFim && <p><strong>Fim Previsto:</strong> {formatarDataISO(dataFim)}</p>}
                <p><strong>Janela:</strong> {contrato.entrega.janela === 'MANHA' ? 'Manhã' : 'Tarde'}</p>
                {contrato.entrega.horaSugestao && <p><strong>Horário:</strong> {contrato.entrega.horaSugestao}</p>}
              </div>
            </div>
          </div>

          {/* Local de Entrega (Obra) */}
          {contrato.obra && <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Local de Entrega
              </h4>
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="font-medium mb-1">{contrato.obra.apelido}</p>
                <p className="text-sm text-muted-foreground">
                  {contrato.obra.endereco.logradouro}, {contrato.obra.endereco.numero}
                  {contrato.obra.endereco.complemento && ` - ${contrato.obra.endereco.complemento}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {contrato.obra.endereco.bairro} - {contrato.obra.endereco.cidade}/{contrato.obra.endereco.uf}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CEP: {contrato.obra.endereco.cep}
                </p>
              </div>
            </div>}

          {/* Resumo dos Itens */}
          <div>
            <h4 className="font-semibold mb-2">Equipamentos ({contrato.itens.length} itens)</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-2">Equipamento</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-center">Período</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {contrato.itens.slice(0, 3).map((item, index) => <tr key={index} className="border-t">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{item.equipamento?.nome}</p>
                          <p className="text-muted-foreground">{item.equipamento?.codigo}</p>
                        </div>
                      </td>
                      <td className="p-2 text-center">{item.quantidade}</td>
                      <td className="p-2 text-center">
                        <Badge variant="outline">
                          {item.periodoEscolhido === 'DIARIA' ? 'Diária' : item.periodoEscolhido === 'SEMANA' ? 'Semanal' : item.periodoEscolhido === 'QUINZENA' ? 'Quinzenal' : item.periodoEscolhido === '21DIAS' ? '21 Dias' : 'Mensal'}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        R$ {item.subtotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2
                    })}
                      </td>
                    </tr>)}
                </tbody>
              </table>
              {contrato.itens.length > 3 && <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                  + {contrato.itens.length - 3} itens adicionais
                </div>}
            </div>
          </div>

          {/* Resumo Financeiro e Pagamento */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-primary mb-2">Pagamento</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Forma:</strong> {contrato.pagamento.forma === 'BOLETO' ? 'Boleto Bancário' : contrato.pagamento.forma === 'PIX' ? 'PIX' : contrato.pagamento.forma === 'CARTAO' ? 'Cartão' : 'Dinheiro'}</p>
                  <p><strong>Vencimento:</strong> {formatarDataISO(contrato.pagamento.vencimentoISO)}</p>
                  {contrato.pagamento.cobrancaUnica && <p className="text-primary"><strong>Cobrança única habilitada</strong></p>}
                  {contrato.taxaDeslocamento?.aplicar && (
                    <div className="mt-2 pt-2 border-t border-primary/20">
                      <p><strong>Taxa de Deslocamento:</strong> R$ {contrato.taxaDeslocamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {contrato.taxaDeslocamento.justificativa && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Justificativa: {contrato.taxaDeslocamento.justificativa}
                        </p>
                      )}
                    </div>
                  )}
                  {politicaAplicada && <div className="mt-2 pt-2 border-t border-primary/20">
                      <Badge className="bg-green-100 text-green-800 mb-2">
                        Política {contrato.cliente?.politicaComercial} Aplicada
                      </Badge>
                      <p className="text-xs">Desconto: {politicaAplicada.descontoPctContrato}%</p>
                      <p className="text-xs">Fatura: {formatarDataISO(politicaAplicada.faturamentoAgrupado.billDate.split('T')[0])}</p>
                      <p className="text-xs">Vence: {formatarDataISO(politicaAplicada.faturamentoAgrupado.dueDate.split('T')[0])}</p>
                    </div>}
                </div>
              </div>
              
              <div className="text-right">
                <h4 className="font-semibold text-primary mb-2">Valor Total</h4>
                {politicaAplicada && <div className="text-sm text-muted-foreground mb-1">
                    <span className="line-through">R$ {politicaAplicada.totalTabela.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}</span>
                  </div>}
                <div className="text-2xl font-bold text-primary">
                   R$ {valorTotalCalculado.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                </div>
                {politicaAplicada && <div className="text-sm text-green-700 mt-1">
                    Economia: R$ {(politicaAplicada.totalTabela - politicaAplicada.totalComDesconto).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2
                })}
                  </div>}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Visualizar Contrato
            </Button>
          </div>
          <ContratoResumoPreview 
            open={showPreview} 
            onClose={() => setShowPreview(false)} 
            contrato={contrato as any} 
            onEnviarAssinatura={handleEnviarAssinatura} 
          />
        </CardContent>
      </Card>;
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleExit}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Novo Contrato</h1>
                <p className="text-sm text-muted-foreground">
                  Etapa {etapaAtual + 1} de {ETAPAS.length}: {ETAPAS[etapaAtual]}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasChanges && <Button variant="outline" onClick={salvarRascunho} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Rascunho
                </Button>}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={(etapaAtual + 1) / ETAPAS.length * 100} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {etapaAtual === 0 && renderEtapaCliente()}
          {etapaAtual === 1 && renderEtapaItens()}
          {etapaAtual === 2 && renderEtapaEntrega()}
          {etapaAtual === 3 && renderEtapaCondicoes()}
          {etapaAtual === 4 && renderEtapaPagamento()}
          {etapaAtual === 5 && renderEtapaConferencia()}
          {etapaAtual === 6 && renderEtapaDocumentos()}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button variant="outline" onClick={etapaAnterior} disabled={etapaAtual === 0} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="text-sm text-muted-foreground">
               {valorTotalCalculado > 0 && <span className="font-semibold">
                   Total: R$ {valorTotalCalculado.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
                </span>}
            </div>
            
            {etapaAtual < ETAPAS.length - 1 ? <Button 
                onClick={proximaEtapa} 
                disabled={!podeAvancar() || validandoEstoque} 
                className="gap-2 relative z-[110]"
              >
                {validandoEstoque ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validando estoque...
                  </>
                ) : (
                  <>
                    Próxima
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button> : <Button onClick={finalizarContrato} disabled={!podeAvancar() || etapaAtual === 6 && !contrato.entrega.data} className="gap-2 bg-primary hover:bg-primary/90 relative z-[110]">
                <Send className="h-4 w-4" />
                Enviar para Assinatura
              </Button>}
          </div>
        </div>
      </div>
    </div>;
}