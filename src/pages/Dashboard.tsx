import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  RefreshCw, 
  CreditCard, 
  Package,
  Wrench,
  FileX,
  DollarSign,
  Clock,
  Plus,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseCaixa } from "@/hooks/useSupabaseCaixa";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import RenovarContratoModal from "@/components/modals/RenovarContratoModal";
import RegistrarRecebimentoModal from "@/components/contas-receber/RegistrarRecebimentoModal";
import EmitirFaturaModal from "@/components/modals/EmitirFaturaModal";
import LancarDespesaModal from "@/components/modals/LancarDespesaModal";
import AbrirCaixaModal from "@/components/caixa/AbrirCaixaModal";
import CaixaDoDiaDrawer from "@/components/caixa/CaixaDoDiaDrawer";
import ConfirmarRetiradaModal from "@/components/modals/ConfirmarRetiradaModal";
import { SolicitacaoModal } from "@/components/solicitacoes/SolicitacaoModal";

// Dashboard principal do vendedor
export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  const { contratos, isLoading: loadingContratos, confirmarRetirada } = useSupabaseContratos(lojaAtual?.id);
  const { equipamentos, isLoading: loadingEquipamentos } = useSupabaseEquipamentos(lojaAtual?.id);
  const { caixaAtivo, loadingAtivo } = useSupabaseCaixa(lojaAtual?.id);
  const { titulos: titulosSupabase } = useSupabaseTitulos(lojaAtual?.id);
  
  const [renovarModalOpen, setRenovarModalOpen] = useState(false);
  const [receberModalOpen, setReceberModalOpen] = useState(false);
  const [emitirFaturaModalOpen, setEmitirFaturaModalOpen] = useState(false);
  const [despesaModalOpen, setDespesaModalOpen] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [tituloSelecionado, setTituloSelecionado] = useState(null);
  const [abrirCaixaModalOpen, setAbrirCaixaModalOpen] = useState(false);
  const [caixaDrawerOpen, setCaixaDrawerOpen] = useState(false);
  const [confirmarRetiradaModalOpen, setConfirmarRetiradaModalOpen] = useState(false);
  const [contratoParaRetirada, setContratoParaRetirada] = useState<any>(null);
  const [solicitacaoModalOpen, setSolicitacaoModalOpen] = useState(false);

  const hoje = new Date().toISOString().split('T')[0];

  // Dados para as caixas de ação
  const actionData = useMemo(() => {
    const titulos = titulosSupabase;
    const hoje = new Date();
    const proximosDias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Contratos próximos do vencimento
    const contratosParaRenovacao = (contratos || [])
      .filter(c => c.status === 'ATIVO' && c.data_fim && new Date(c.data_fim) <= proximosDias)
      .sort((a, b) => new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime())
      .slice(0, 3);

    // Clientes inadimplentes
    const clientesInadimplentes = titulos
      .filter(t => t.saldo > 0 && new Date(t.vencimento) < hoje)
      .map(t => t.cliente)
      .filter((cliente, index, self) => self.findIndex(c => c.id === cliente.id) === index)
      .slice(0, 3);

    // Equipamentos em manutenção (usando Supabase)
    const equipamentosManutencao = (equipamentos || [])
      .filter(e => e.status_global === 'MANUTENCAO')
      .slice(0, 3);

    // Contratos aguardando retirada pelo cliente
    const contratosAguardandoRetirada = (contratos || [])
      .filter(c => 
        c.status === 'AGUARDANDO_ENTREGA' && 
        (c.logistica as any)?.clienteRetiraEDevolve === true
      )
      .slice(0, 3);

    return {
      contratosParaRenovacao,
      clientesInadimplentes,
      equipamentosManutencao,
      contratosAguardandoRetirada,
      contratosHoje: (contratos || []).filter(c => 
        c.created_at && new Date(c.created_at).toDateString() === hoje.toDateString()
      ).length
    };
  }, [contratos, equipamentos, titulosSupabase]);

  const recentContratos = useMemo(() => {
    if (!contratos) return [];
    return [...contratos]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [contratos]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'Disponível': { label: 'Disponível', color: 'success' as const },
      'Locado': { label: 'Locado', color: 'warning' as const },
      'Manutenção': { label: 'Manutenção', color: 'destructive' as const },
      'Reservado': { label: 'Reservado', color: 'info' as const },
      'Ativo': { label: 'Ativo', color: 'success' as const },
      'Finalizado': { label: 'Finalizado', color: 'secondary' as const },
      'Em atraso': { label: 'Em Atraso', color: 'destructive' as const },
    };
    return statusMap[status] || { label: status, color: 'secondary' as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel do Vendedor</h1>
        <p className="text-muted-foreground">Ações rápidas e informações do dia</p>
      </div>

      {/* Caixas de Ação do Vendedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Novos Contratos */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate('/contratos/novo')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              📑 Novos Contratos
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">{actionData.contratosHoje} hoje</div>
            <Button 
              size="sm" 
              className="w-full"
              title="Pressione 'N' para atalho"
            >
              <Plus className="w-4 h-4 mr-1" />
              Criar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/contratos');
              }}
            >
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Renovações */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              🔄 Renovações
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">{actionData.contratosParaRenovacao.length} próximas</div>
              {actionData.contratosParaRenovacao.length > 0 ? (
              <div className="space-y-2">
                {actionData.contratosParaRenovacao.map((contrato) => (
                  <div key={contrato.id} className="text-xs">
                    <div className="font-medium">{contrato.numero}</div>
                    <div className="text-muted-foreground">Vence {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma renovação próxima</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/contratos?tab=renovacoes')}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Ver Renovações
            </Button>
          </CardContent>
        </Card>

        {/* Cobrança */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => navigate('/contas-receber')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              💰 Cobrança
            </CardTitle>
            <CreditCard className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">{actionData.clientesInadimplentes.length} clientes</div>
            {actionData.clientesInadimplentes.length > 0 ? (
              <div className="space-y-2">
                {actionData.clientesInadimplentes.map((cliente) => (
                  <div key={cliente.id} className="text-xs">
                    <div className="font-medium truncate">{cliente.nome}</div>
                    <div className="text-muted-foreground">Em atraso</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum cliente inadimplente</p>
            )}
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/contas-receber')}
            >
              Cobrar
            </Button>
          </CardContent>
        </Card>

        {/* Retiradas/Devoluções */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              📦 Retiradas/Devoluções
            </CardTitle>
            <Package className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">
              {actionData.contratosAguardandoRetirada.length} pendentes
            </div>
            {actionData.contratosAguardandoRetirada.length > 0 ? (
              <div className="space-y-2">
                {actionData.contratosAguardandoRetirada.map((contrato) => (
                  <div key={contrato.id} className="text-xs">
                    <div className="font-medium">{contrato.numero}</div>
                    <div className="text-muted-foreground">
                      {contrato.clientes?.nome || contrato.clientes?.razao_social}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma retirada pendente</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                if (actionData.contratosAguardandoRetirada.length > 0) {
                  const primeiro = actionData.contratosAguardandoRetirada[0];
                  setContratoParaRetirada(primeiro);
                  setConfirmarRetiradaModalOpen(true);
                } else {
                  toast({
                    title: "Nenhuma retirada pendente",
                    description: "Não há contratos aguardando retirada no momento.",
                  });
                }
              }}
              disabled={actionData.contratosAguardandoRetirada.length === 0}
            >
              Confirmar Retirada
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => navigate('/contratos?tab=ativos')}
            >
              Registrar Devolução <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

      {/* Manutenções */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              🛠 Manutenção
            </CardTitle>
            <Wrench className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">{actionData.equipamentosManutencao.length} equipamentos</div>
            {actionData.equipamentosManutencao.length > 0 ? (
              <div className="space-y-2">
                {actionData.equipamentosManutencao.map((equip) => (
                  <div key={equip.id} className="text-xs">
                    <div className="font-medium">{equip.codigo_interno}</div>
                    <div className="text-muted-foreground">Em manutenção</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum equipamento em manutenção</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setSolicitacaoModalOpen(true)}
            >
              Solicitar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => navigate('/equipamentos')}
            >
              Ver todas <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              🧾 Faturar
            </CardTitle>
            <FileText className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">Emitir</div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Gere faturas e documentos para seus contratos
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setEmitirFaturaModalOpen(true)}
            >
              Emitir Fatura
            </Button>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              📝 Despesas
            </CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">Lançar</div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Registre despesas de combustível, manutenção, fretes e outras
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setDespesaModalOpen(true)}
            >
              Registrar
            </Button>
          </CardContent>
        </Card>

        {/* Caixa do Dia */}
        <Card className="shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => setCaixaDrawerOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              💵 Caixa do Dia
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-bold text-foreground">
              {caixaAtivo?.status === 'ABERTO' ? 'Aberto' : 'Fechado'}
            </div>
            <div className="space-y-2">
              {caixaAtivo?.status === 'ABERTO' ? (
                <div className="text-xs">
                  <div className="font-medium">Saldo: R$ {(caixaAtivo.saldo_inicial || 0).toFixed(2)}</div>
                  <div className="text-muted-foreground">Aberto hoje {new Date(caixaAtivo.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ) : (
                <div className="text-xs">
                  <div className="font-medium">Caixa não aberto</div>
                  <div className="text-muted-foreground">Clique para abrir o caixa</div>
                </div>
              )}
            </div>
            {caixaAtivo?.status === 'ABERTO' ? (
              <Button 
                variant="default" 
                size="sm" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                   const titulosAbertos = titulosSupabase.filter(t => t.saldo > 0);
                  if (titulosAbertos.length > 0) {
                    setTituloSelecionado(titulosAbertos[0]);
                    setReceberModalOpen(true);
                  } else {
                    toast({
                      title: "Nenhum título em aberto",
                      description: "Não há títulos pendentes para recebimento.",
                    });
                  }
                }}
              >
                Receber
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbrirCaixaModalOpen(true);
                }}
              >
                Abrir Caixa
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Contratos Recentes - Reposicionado */}
        <Card className="shadow-md md:col-span-2 lg:col-span-3 xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Contratos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentContratos.length > 0 ? recentContratos.map((contrato) => (
                <div key={contrato.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm text-foreground">{contrato.numero}</p>
                    <p className="text-xs text-muted-foreground">{contrato.clientes?.nome || contrato.clientes?.razao_social || 'Cliente não definido'}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={getStatusInfo(contrato.status)} />
                    <p className="text-xs text-muted-foreground mt-1">
                      R$ {(contrato.valor_total || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center col-span-full">
                  Nenhum contrato encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Modais */}
      <RenovarContratoModal
        contrato={contratoSelecionado}
        open={renovarModalOpen}
        onOpenChange={setRenovarModalOpen}
        onSuccess={() => {
          setContratoSelecionado(null);
          // Refresh data if needed
        }}
      />

      {tituloSelecionado && (
        <RegistrarRecebimentoModal
          titulo={tituloSelecionado}
          open={receberModalOpen}
          onOpenChange={setReceberModalOpen}
        onSuccess={() => {
          setTituloSelecionado(null);
        }}
        />
      )}

      <EmitirFaturaModal
        contrato={contratoSelecionado}
        open={emitirFaturaModalOpen}
        onOpenChange={setEmitirFaturaModalOpen}
        onSuccess={() => {
          setContratoSelecionado(null);
          // Refresh data if needed
        }}
      />

      <LancarDespesaModal
        open={despesaModalOpen}
        onOpenChange={setDespesaModalOpen}
        onSuccess={() => {
          // React Query invalidará automaticamente os dados do caixa
        }}
      />

      <AbrirCaixaModal
        open={abrirCaixaModalOpen}
        onOpenChange={setAbrirCaixaModalOpen}
        onSuccess={() => {
          // React Query invalidará automaticamente os dados do caixa
        }}
      />

      <CaixaDoDiaDrawer
        open={caixaDrawerOpen}
        onOpenChange={setCaixaDrawerOpen}
        onReceberClick={() => {
          const titulosAbertos = titulosSupabase.filter(t => t.saldo > 0);
          if (titulosAbertos.length > 0) {
            setTituloSelecionado(titulosAbertos[0]);
            setReceberModalOpen(true);
          } else {
            toast({
              title: "Nenhum título em aberto",
              description: "Não há títulos pendentes para recebimento.",
            });
          }
        }}
        onDespesaClick={() => {
          setDespesaModalOpen(true);
        }}
      />

      {/* Modal de Confirmar Retirada */}
      {contratoParaRetirada && (
        <ConfirmarRetiradaModal
          open={confirmarRetiradaModalOpen}
          onOpenChange={setConfirmarRetiradaModalOpen}
          contrato={{
            numero: contratoParaRetirada.numero,
            cliente: {
              nomeRazao: contratoParaRetirada.clientes?.nome || contratoParaRetirada.clientes?.razao_social || '',
              documento: contratoParaRetirada.clientes?.cpf || contratoParaRetirada.clientes?.cnpj || '',
            },
            itens: (contratoParaRetirada.contrato_itens || []).map((item: any) => ({
              id: item.id,
              equipamento: item.equipamento_id ? {
                codigo_interno: item.equipamentos?.codigo_interno,
                numero_serie: item.equipamentos?.numero_serie,
                codigo: item.equipamentos?.codigo_interno,
              } : undefined,
              modelo: item.modelos_equipamentos ? {
                nome_comercial: item.modelos_equipamentos.nome_comercial,
                nome: item.modelos_equipamentos.nome,
              } : undefined,
              grupo: item.grupos_equipamentos ? {
                nome: item.grupos_equipamentos.nome,
              } : undefined,
              quantidade: item.quantidade || 1,
              controle: item.controle
            })),
            dataInicio: contratoParaRetirada.data_inicio,
            dataPrevistaFim: contratoParaRetirada.data_prevista_fim || contratoParaRetirada.data_fim,
          }}
          onConfirm={async () => {
            await confirmarRetirada.mutateAsync(contratoParaRetirada.id);
            setContratoParaRetirada(null);
          }}
        />
      )}

      <SolicitacaoModal 
        open={solicitacaoModalOpen} 
        onClose={() => setSolicitacaoModalOpen(false)} 
      />
    </div>
  );
}