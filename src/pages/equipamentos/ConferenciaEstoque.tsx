import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ClipboardCheck, 
  Plus, 
  Printer, 
  Save, 
  CheckCircle, 
  Search,
  Calendar,
  User,
  Building2,
  Package
} from "lucide-react";
import { useConferenciaStore, type FiltrosContagem, type UserRef } from "@/stores/conferenciaStore";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useToast } from "@/hooks/use-toast";
import { SessoesList } from "@/components/conferencia/SessoesList";
import { ContagemForm } from "@/components/conferencia/ContagemForm";
import { ResolucaoDivergencias } from "@/components/conferencia/ResolucaoDivergencias";

export default function ConferenciaEstoque() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
  const { sessoes, criarSessao, canEdit, getItensPorSessao } = useConferenciaStore();
  const { grupos } = useSupabaseGrupos();
  const { modelos } = useSupabaseModelos();
  const { lojas } = useMultiunidade();
  
  const [filtros, setFiltros] = useState<FiltrosContagem>({
    tipo: 'AMBOS',
    incluirStatus: ['DISPONIVEL', 'RESERVADO', 'EM_REVISAO', 'MANUTENCAO']
  });
  const [observacao, setObservacao] = useState("");
  const [lojaSelecionada, setLojaSelecionada] = useState(lojaAtual?.id || "");

  // Verificar se deve abrir sessão específica
  const sessaoId = searchParams.get('sessao');
  const sessaoAtiva = sessaoId ? sessoes.find(s => s.id === sessaoId) : null;

  const handleCriarSessao = () => {
    if (!lojaSelecionada) {
      toast({
        title: "Erro",
        description: "Selecione uma loja para criar a sessão",
        variant: "destructive"
      });
      return;
    }

    if (!canEdit()) {
      toast({
        title: "Sem permissão",
        description: "Apenas Gestores e Administradores podem criar sessões",
        variant: "destructive"
      });
      return;
    }

    const usuario: UserRef = {
      id: "demo-user",
      nome: "Demo User",
      perfil: localStorage.getItem('rh-dev-profile') || 'admin'
    };

    const novoId = criarSessao(filtros, lojaSelecionada, usuario, observacao);
    
    toast({
      title: "Sessão criada",
      description: "Sessão de contagem criada com sucesso"
    });

    // Redirecionar para a sessão
    navigate(`/equipamentos/conferencia?sessao=${novoId}`);
  };

  const handleImprimirLista = (sessaoId: string) => {
    const sessao = sessoes.find(s => s.id === sessaoId);
    const loja = lojas.find(l => l.id === sessao?.lojaId);
    
    if (!sessao || !loja) {
      toast({
        title: "Erro",
        description: "Sessão ou loja não encontrada", 
        variant: "destructive"
      });
      return;
    }

    const itens = getItensPorSessao(sessao.id);
    
    import("@/utils/conferencia-print").then(({ printContagemCega }) => {
      const printData = {
        sessao,
        itens,
        lojaNome: loja.nome
      };
      printContagemCega(printData);
    });
  };

  // Se há uma sessão ativa, mostrar a tela de contagem
  if (sessaoAtiva) {
    if (sessaoAtiva.status === 'ABERTA' || sessaoAtiva.status === 'EM_CONTAGEM') {
      return <ContagemForm sessao={sessaoAtiva} />;
    }
    
    if (sessaoAtiva.status === 'EM_REVISAO' || sessaoAtiva.status === 'AJUSTADA') {
      return <ResolucaoDivergencias sessao={sessaoAtiva} />;
    }
  }

  return (
    <div className="space-y-6">

      <Tabs defaultValue="sessoes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessoes">Sessões de Contagem</TabsTrigger>
          <TabsTrigger value="nova">Nova Contagem</TabsTrigger>
        </TabsList>

        <TabsContent value="sessoes">
          <SessoesList />
        </TabsContent>

        <TabsContent value="nova">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                Parâmetros da Contagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Loja */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Loja *</label>
                <select
                  value={lojaSelecionada}
                  onChange={(e) => setLojaSelecionada(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  disabled={!canEdit()}
                >
                  <option value="">Selecione a loja</option>
                  {lojas.filter(l => l.ativo).map(loja => (
                    <option key={loja.id} value={loja.id}>{loja.nome}</option>
                  ))}
                </select>
              </div>

              {/* Escopo - Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Controle</label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tipo-serie"
                      checked={filtros.tipo === 'SERIE' || filtros.tipo === 'AMBOS'}
                      onCheckedChange={(checked) => {
                        if (checked && filtros.tipo === 'SALDO') {
                          setFiltros({...filtros, tipo: 'AMBOS'});
                        } else if (!checked && filtros.tipo === 'AMBOS') {
                          setFiltros({...filtros, tipo: 'SALDO'});
                        } else if (checked) {
                          setFiltros({...filtros, tipo: 'SERIE'});
                        }
                      }}
                      disabled={!canEdit()}
                    />
                    <label htmlFor="tipo-serie" className="text-sm">Séries</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tipo-saldo"
                      checked={filtros.tipo === 'SALDO' || filtros.tipo === 'AMBOS'}
                      onCheckedChange={(checked) => {
                        if (checked && filtros.tipo === 'SERIE') {
                          setFiltros({...filtros, tipo: 'AMBOS'});
                        } else if (!checked && filtros.tipo === 'AMBOS') {
                          setFiltros({...filtros, tipo: 'SERIE'});
                        } else if (checked) {
                          setFiltros({...filtros, tipo: 'SALDO'});
                        }
                      }}
                      disabled={!canEdit()}
                    />
                    <label htmlFor="tipo-saldo" className="text-sm">Saldo</label>
                  </div>
                </div>
              </div>

              {/* Filtros de Grupo e Modelo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grupos (opcional)</label>
                  <select
                    multiple
                    value={filtros.grupos || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFiltros({...filtros, grupos: selected.length ? selected : undefined});
                    }}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md min-h-[100px]"
                    disabled={!canEdit()}
                  >
                    {grupos.map(grupo => (
                      <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Modelos (opcional)</label>
                  <select
                    multiple
                    value={filtros.modelos || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFiltros({...filtros, modelos: selected.length ? selected : undefined});
                    }}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md min-h-[100px]"
                    disabled={!canEdit()}
                  >
                    {modelos.map(modelo => (
                      <option key={modelo.id} value={modelo.id}>{modelo.nome_comercial}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status dos Equipamentos */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status a Incluir</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['DISPONIVEL', 'RESERVADO', 'EM_REVISAO', 'MANUTENCAO'] as const).map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status}`}
                        checked={filtros.incluirStatus?.includes(status)}
                        onCheckedChange={(checked) => {
                          const currentStatus = filtros.incluirStatus || [];
                          if (checked) {
                            setFiltros({
                              ...filtros, 
                              incluirStatus: [...currentStatus, status]
                            });
                          } else {
                            setFiltros({
                              ...filtros,
                              incluirStatus: currentStatus.filter(s => s !== status)
                            });
                          }
                        }}
                        disabled={!canEdit()}
                      />
                      <label htmlFor={`status-${status}`} className="text-sm">
                        {status.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observação */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Observação (opcional)</label>
                <Textarea
                  placeholder="Observações sobre esta contagem..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  disabled={!canEdit()}
                />
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2">
                {canEdit() ? (
                  <Button onClick={handleCriarSessao}>
                    <Plus className="w-4 h-4 mr-2" />
                    Gerar Sessão
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    Apenas Gestores e Administradores podem criar sessões de contagem
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}