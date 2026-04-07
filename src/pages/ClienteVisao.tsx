import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  AlertCircle,
  Clock,
  Copy,
  Loader2
} from "lucide-react";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useToast } from "@/hooks/use-toast";

export default function ClienteVisao() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // Buscar dados do Supabase
  const { useCliente } = useSupabaseClientes();
  const { data: clienteData, isLoading: loadingCliente } = useCliente(id || '');
  const { contratos: contratosData, isLoading: loadingContratos } = useSupabaseContratos();
  const { titulos: titulosData, isLoading: loadingTitulos } = useSupabaseTitulos(undefined, id);

  const [solicitacao, setSolicitacao] = useState({
    contratoId: '',
    tipo: '',
    observacao: ''
  });

  const isLoading = loadingCliente || loadingContratos || loadingTitulos;

  // Filtrar contratos ativos do cliente
  const contratosAtivos = (contratosData || []).filter((c: any) => 
    c.cliente_id === id && ['ATIVO', 'AGENDADO', 'AGUARDANDO_ENTREGA'].includes(c.status)
  );

  // Filtrar títulos em aberto do cliente
  const titulosAbertos = (titulosData || []).filter((t: any) => 
    ['ABERTO', 'Em aberto', 'Parcial', 'PARCIAL'].includes(t.status)
  );

  const handleEnviarSolicitacao = () => {
    if (!solicitacao.contratoId || !solicitacao.tipo || !solicitacao.observacao.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos da solicitação",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Solicitação enviada",
      description: `Sua solicitação de ${solicitacao.tipo} foi registrada e será analisada em breve.`,
    });

    setSolicitacao({ contratoId: '', tipo: '', observacao: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATIVO': case 'Ativo': return 'default';
      case 'AGENDADO': return 'secondary';
      case 'ABERTO': case 'Em aberto': return 'destructive';
      case 'Parcial': case 'PARCIAL': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clienteData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Cliente não encontrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clienteNome = clienteData.nome || clienteData.razao_social || 'Cliente';
  const clienteDoc = clienteData.cpf || clienteData.cnpj || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{clienteNome}</h1>
                <p className="text-muted-foreground">{clienteDoc}</p>
              </div>
            </div>
            
            <Button variant="outline" disabled className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar Link Público (em breve)
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Contratos e Títulos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contratos Ativos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contratos Ativos ({contratosAtivos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contratosAtivos.length > 0 ? (
                  <div className="space-y-4">
                    {contratosAtivos.map((contrato: any) => (
                      <div 
                        key={contrato.id} 
                        className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">Contrato {contrato.numero}</h4>
                            <p className="text-sm text-muted-foreground">
                              Início: {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={getStatusColor(contrato.status)}>
                              {contrato.status === 'ATIVO' ? 'Ativo' : 
                               contrato.status === 'AGENDADO' ? 'Agendado' : 
                               contrato.status === 'AGUARDANDO_ENTREGA' ? 'Aguardando Entrega' : contrato.status}
                            </Badge>
                            <p className="text-sm font-medium mt-1">
                              R$ {Number(contrato.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum contrato ativo no momento</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Títulos em Aberto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Títulos em Aberto ({titulosAbertos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {titulosAbertos.length > 0 ? (
                  <div className="space-y-3">
                    {titulosAbertos.map((titulo: any) => (
                      <div 
                        key={titulo.id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {titulo.numero || `Título ${titulo.id.slice(0, 8)}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Vencimento: {new Date(titulo.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                          {new Date(titulo.vencimento) < new Date() && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-destructive" />
                              <span className="text-xs text-destructive">Vencido</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <p className="font-semibold">
                            R$ {Number(titulo.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant={getStatusColor(titulo.status)}>
                            {titulo.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total em aberto:</span>
                        <span className="text-primary">
                          R$ {titulosAbertos.reduce((sum: number, t: any) => sum + Number(t.saldo), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum título em aberto</p>
                    <p className="text-sm text-muted-foreground">Parabéns! Você está em dia com seus pagamentos.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Solicitar Ação */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Solicitar Ação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Contrato</label>
                  <Select 
                    value={solicitacao.contratoId} 
                    onValueChange={(value) => setSolicitacao(prev => ({ ...prev, contratoId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contratosAtivos.map((contrato: any) => (
                        <SelectItem key={contrato.id} value={contrato.id}>
                          Contrato {contrato.numero}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Solicitação</label>
                  <Select 
                    value={solicitacao.tipo} 
                    onValueChange={(value) => setSolicitacao(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2a-via">2ª Via de Documento</SelectItem>
                      <SelectItem value="reagendamento">Reagendamento de Entrega/Coleta</SelectItem>
                      <SelectItem value="renovacao">Solicitar Renovação</SelectItem>
                      <SelectItem value="devolucao">Devolução Antecipada</SelectItem>
                      <SelectItem value="substituicao">Substituição de Equipamento</SelectItem>
                      <SelectItem value="manutencao">Reportar Problema/Manutenção</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Observações</label>
                  <Textarea
                    placeholder="Descreva sua solicitação com detalhes..."
                    value={solicitacao.observacao}
                    onChange={(e) => setSolicitacao(prev => ({ ...prev, observacao: e.target.value }))}
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleEnviarSolicitacao}
                  className="w-full"
                  disabled={!solicitacao.contratoId || !solicitacao.tipo || !solicitacao.observacao.trim()}
                >
                  Enviar Solicitação
                </Button>

                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                  <p><strong>Tempo de resposta:</strong></p>
                  <p>• 2ª via: até 2 horas úteis</p>
                  <p>• Reagendamentos: até 4 horas úteis</p>
                  <p>• Outras solicitações: até 24 horas úteis</p>
                </div>
              </CardContent>
            </Card>

            {/* Informações de Contato */}
            <Card>
              <CardHeader>
                <CardTitle>Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">(11) 99999-9999</p>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Horário de atendimento:</p>
                  <p>Segunda a Sexta: 8h às 18h</p>
                  <p>Sábado: 8h às 12h</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
