import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Cliente360Header } from "@/components/clientes/Cliente360Header";
import { ContratosBlock } from "@/components/clientes/ContratosBlock";
import { ObrasBlock } from "@/components/clientes/ObrasBlock";
import { FinanceiroBlock } from "@/components/clientes/FinanceiroBlock";
import { AvisosTimeline } from "@/components/clientes/AvisosTimeline";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useSupabaseObras } from "@/hooks/useSupabaseObras";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { supabaseClienteToLegacy } from "@/lib/cliente-adapter";

// Mock data interfaces (matching the specification)
interface Cliente360Data {
  cliente: {
    id: string;
    tipo: 'PF' | 'PJ';
    nome: string;
    doc: string;
    contatos: {
      telefone: string;
      email: string;
      whatsapp?: string;
    };
    statusCredito: 'ATIVO' | 'SUSPENSO' | 'EM_ANALISE';
    vip?: boolean;
    notasInternas?: string;
  };
  
  kpis: {
    emAberto: number;
    emAtraso: number;
    prox7d: number;
    ultimoPgtoISO?: string;
  };
  
  contratos: Array<{
    id: string;
    numero: string;
    periodo: { inicio: string; fim: string };
    valorTotal: number;
    situacao: 'ATIVO' | 'ENCERRADO';
    itensQtde: number;
    temAtraso?: boolean;
    atraso?: number;
  }>;
  
  obras: Array<{
    id: string;
    apelido: string;
    enderecoLinha: string;
    ultimoMov?: {
      dataISO: string;
      acao: string;
    };
    contratoChips?: string[];
    isPadrao?: boolean;
  }>;
  
  titulos: Array<{
    id: string;
    codigo: string;
    issue_dateISO: string;
    due_dateISO: string;
    valor: number;
    status: 'ABERTO' | 'ATRASADO' | 'PAGO' | 'CANCELADO';
    pagos?: Array<{
      valor: number;
      dateISO: string;
      meio: string;
    }>;
    linkPDF?: string;
  }>;
  
  eventos: Array<{
    id: string;
    tsISO: string;
    tipo: 'CONTRATO' | 'TITULO' | 'RECEBIMENTO' | 'OS' | 'ANEXO' | 'ASSINATURA';
    refId: string;
    resumo: string;
    link?: string;
  }>;
}

export default function Cliente360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
  const { useCliente } = useSupabaseClientes(lojaAtual?.id);
  const { data: clienteSupabase, isLoading: loadingCliente } = useCliente(id || '');
  const { obras, isLoading: loadingObras } = useSupabaseObras(lojaAtual?.id, id);
  const { contratos, isLoading: loadingContratos } = useSupabaseContratos(lojaAtual?.id);
  
  const [data, setData] = useState<Cliente360Data | null>(null);

  useEffect(() => {
    if (!id || loadingCliente || loadingObras || loadingContratos) {
      return;
    }

    if (!clienteSupabase) {
      setData(null);
      return;
    }

    // Converter cliente Supabase para formato legacy
    const cliente = supabaseClienteToLegacy(clienteSupabase);
    
    // Filtrar contratos do cliente
    const contratosCliente = contratos.filter(c => c.cliente_id === id);
    
    // Mock de títulos (ajustar quando integrar títulos no Supabase)
    const titulosCliente: any[] = [];

    // Calcular KPIs
    const totalFaturado = contratosCliente.reduce((sum, c) => sum + Number(c.valor_total || 0), 0);
    const valorPago = contratosCliente.reduce((sum, c) => sum + Number(c.valor_pago || 0), 0);
    const valorPendente = contratosCliente.reduce((sum, c) => sum + Number(c.valor_pendente || 0), 0);

    // Montar contratos formatados
    const contratosFormatted = contratosCliente.map(c => ({
      id: c.id,
      numero: c.numero,
      periodo: { 
        inicio: c.data_inicio || '', 
        fim: c.data_fim || '' 
      },
      valorTotal: Number(c.valor_total || 0),
      situacao: (c.status === 'ATIVO' ? 'ATIVO' : 'ENCERRADO') as 'ATIVO' | 'ENCERRADO',
      itensQtde: 0, // Ajustar quando tivermos itens do Supabase
      temAtraso: false,
      atraso: 0
    }));

    // Montar obras formatadas
    const obrasFormatted = obras.map(o => {
      const endereco = o.endereco as any;
      const enderecoCompleto = endereco 
        ? `${endereco.logradouro || ''}, ${endereco.numero || ''} - ${endereco.bairro || ''}, ${endereco.cidade || ''}/${endereco.uf || ''}`
        : '';

      return {
        id: o.id,
        apelido: o.nome,
        enderecoLinha: enderecoCompleto,
        ultimoMov: {
          dataISO: o.updated_at || o.created_at || '',
          acao: 'Atualizado'
        },
        contratoChips: contratosCliente
          .filter(c => c.obra_id === o.id)
          .map(c => c.numero),
        isPadrao: false
      };
    });

    // Eventos de timeline
    const eventos = contratosCliente.map(c => ({
      id: c.id,
      tsISO: c.created_at || '',
      tipo: 'CONTRATO' as const,
      refId: c.numero,
      resumo: `Contrato ${c.numero} criado`
    })).sort((a, b) => new Date(b.tsISO).getTime() - new Date(a.tsISO).getTime());

    // Mapear status para maiúsculas
    const statusCreditoMap: Record<string, 'ATIVO' | 'EM_ANALISE' | 'SUSPENSO'> = {
      'Ativo': 'ATIVO',
      'ATIVO': 'ATIVO',
      'Em análise': 'EM_ANALISE',
      'EM_ANALISE': 'EM_ANALISE',
      'Suspenso': 'SUSPENSO',
      'SUSPENSO': 'SUSPENSO'
    };

    const cliente360Data: Cliente360Data = {
      cliente: {
        id: cliente.id,
        tipo: cliente.tipo,
        nome: cliente.nomeRazao,
        doc: cliente.documento,
        contatos: {
          telefone: cliente.telefone || '',
          email: cliente.email,
          whatsapp: cliente.telefone || ''
        },
        statusCredito: statusCreditoMap[cliente.statusCredito] || 'EM_ANALISE',
        vip: false,
        notasInternas: cliente.observacoes
      },
      kpis: {
        emAberto: valorPendente,
        emAtraso: 0,
        prox7d: 0,
        ultimoPgtoISO: undefined
      },
      contratos: contratosFormatted,
      obras: obrasFormatted,
      titulos: [],
      eventos
    };

    setData(cliente360Data);
  }, [id, clienteSupabase, obras, contratos, loadingCliente, loadingObras, loadingContratos]);

  if (loadingCliente || loadingObras || loadingContratos) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Cliente não encontrado</p>
          <button 
            onClick={() => navigate('/clientes')}
            className="text-primary hover:underline"
          >
            Voltar para lista de clientes
          </button>
        </div>
      </div>
    );
  }

  // Gerar avisos automáticos
  const avisos: any[] = [];
  
  if (data.kpis.emAtraso > 0) {
    avisos.push({
      id: 'atraso-1',
      severity: 'warning' as const,
      tipo: 'alerta',
      titulo: 'Títulos em Atraso',
      descricao: `R$ ${data.kpis.emAtraso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em atraso`,
      data: new Date().toISOString()
    });
  }
  
  if (data.cliente.statusCredito === 'SUSPENSO') {
    avisos.push({
      id: 'credito-1',
      severity: 'error' as const,
      tipo: 'erro',
      titulo: 'Crédito Suspenso',
      descricao: 'Cliente com crédito suspenso. Novos contratos bloqueados.',
      data: new Date().toISOString()
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <Cliente360Header 
          clienteId={data.cliente.id}
          nome={data.cliente.nome}
          tipo={data.cliente.tipo}
          statusCredito={data.cliente.statusCredito}
          vip={data.cliente.vip}
          kpis={data.kpis}
          onAbrirFinanceiro={() => toast({ title: "Financeiro", description: "Abrindo detalhes financeiros" })}
          onCriarContrato={() => navigate(`/contratos/novo?clienteId=${data.cliente.id}`)}
          onNovaCobranca={() => toast({ title: "Cobrança", description: "Recurso em desenvolvimento" })}
          onWhatsApp={() => {
            const telefone = data.cliente.contatos.telefone.replace(/\D/g, '');
            window.open(`https://wa.me/55${telefone}`, '_blank');
          }}
          onExportPDF={() => toast({ title: "PDF", description: "Exportando dados do cliente..." })}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <ContratosBlock 
              contratos={data.contratos}
              onAbrirContrato={(id) => navigate(`/contratos/${id}`)}
              onPDFContrato={(id) => toast({ title: "PDF", description: "Gerando PDF do contrato..." })}
              onWhatsAppContrato={(id) => {
                const telefone = data.cliente.contatos.telefone.replace(/\D/g, '');
                const contrato = data.contratos.find(c => c.id === id);
                const mensagem = `Olá! Segue informações do contrato ${contrato?.numero}`;
                window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
              }}
            />
            
            <FinanceiroBlock 
              kpis={{
                abertos: data.kpis.emAberto,
                emAtraso: data.kpis.emAtraso,
                pagos30d: 0,
                total12m: 0
              }}
              titulos={data.titulos}
              onSegundaVia={(id) => toast({ title: "2ª Via", description: "Gerando segunda via..." })}
              onReceber={(id) => toast({ title: "Receber", description: "Abrindo modal de recebimento..." })}
            />
            
            <ObrasBlock 
              clienteId={id || ''}
            />
          </div>
          
          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            <AvisosTimeline 
              avisos={avisos}
              eventos={data.eventos}
            />
          </div>
        </div>
      </div>
    </div>
  );
}