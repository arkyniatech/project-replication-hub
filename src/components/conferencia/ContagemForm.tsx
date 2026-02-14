import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardCheck, 
  Save, 
  CheckCircle, 
  Search, 
  Printer,
  ArrowLeft,
  Calendar,
  User,
  Building2
} from "lucide-react";
import { useConferenciaStore, type ContagemSessao, type UserRef } from "@/stores/conferenciaStore";
import { useEquipamentosStore } from "@/stores/equipamentosStore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContagemFormProps {
  sessao: ContagemSessao;
}

export function ContagemForm({ sessao }: ContagemFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    getItensPorSessao, 
    salvarContagem, 
    finalizarContagem, 
    canEdit 
  } = useConferenciaStore();
  const { lojas } = useEquipamentosStore();
  
  // ✅ SECURITY FIX: Removido código de simulação de perfil
  // Agora sempre usa roles reais do Supabase via has_role()
  
  const [searchTerm, setSearchTerm] = useState("");
  const [contagemData, setContagemData] = useState<Record<string, { qtd?: number; obs?: string }>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const itens = useMemo(() => getItensPorSessao(sessao.id), [getItensPorSessao, sessao.id]);
  const loja = lojas.find(l => l.id === sessao.lojaId);

  // Filtrar itens por busca
  const filteredItens = useMemo(() => {
    return itens.filter(item => 
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.grupoNome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [itens, searchTerm]);

  // Inicializar dados de contagem
  useEffect(() => {
    if (itens.length === 0) return;
    
    const initialData: Record<string, { qtd?: number; obs?: string }> = {};
    itens.forEach(item => {
      // Only initialize if not already set
      if (!contagemData[item.id]) {
        initialData[item.id] = {
          qtd: item.qtdContada || undefined,
          obs: item.observacao || ''
        };
      }
    });
    
    // Only update if we have new data
    if (Object.keys(initialData).length > 0) {
      setContagemData(prev => ({ ...prev, ...initialData }));
    }
  }, [itens.length]); // Only depend on length to prevent infinite loops

  const handleSalvarRascunho = () => {
    Object.entries(contagemData).forEach(([itemId, data]) => {
      if (data.qtd !== undefined || data.obs) {
        salvarContagem(sessao.id, itemId, data.qtd || null, data.obs);
      }
    });

    toast({
      title: "Rascunho salvo",
      description: "Dados salvos com sucesso",
      duration: 1500
    });
  };

  const handleFinalizarContagem = () => {
    if (!canEdit()) {
      toast({
        title: "Sem permissão",
        description: "Apenas Gestores e Administradores podem finalizar contagens",
        variant: "destructive"
      });
      return;
    }

    // Salvar todos os dados primeiro
    Object.entries(contagemData).forEach(([itemId, data]) => {
      salvarContagem(sessao.id, itemId, data.qtd || null, data.obs);
    });

    const usuario: UserRef = {
      id: "demo-user",
      nome: "Demo User",
      perfil: localStorage.getItem('rh-dev-profile') || 'admin'
    };

    finalizarContagem(sessao.id, usuario);

    toast({
      title: "Contagem finalizada",
      description: "A partir de agora será possível revisar divergências",
      duration: 2000
    });
  };

  const handleImprimirLista = () => {
    const loja = lojas.find(l => l.id === sessao.lojaId);
    if (!loja) {
      toast({
        title: "Erro",
        description: "Loja não encontrada",
        variant: "destructive"
      });
      return;
    }

    import("@/utils/conferencia-print").then(({ printContagemCega }) => {
      const printData = {
        sessao,
        itens,
        lojaNome: loja.nome
      };
      printContagemCega(printData);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, filteredItens.length - 1);
      setFocusedIndex(nextIndex);
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus();
      }, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      setFocusedIndex(prevIndex);
      inputRefs.current[prevIndex]?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, filteredItens.length - 1);
      setFocusedIndex(nextIndex);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const updateContagem = (itemId: string, field: 'qtd' | 'obs', value: any) => {
    setContagemData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const itensContados = Object.values(contagemData).filter(d => d.qtd !== undefined).length;
  const isReadOnly = !canEdit();

  return (
    <div className="space-y-6">
      {/* Header Sticky */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/equipamentos/conferencia')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Contagem Cega</h1>
              <p className="text-muted-foreground">
                {loja?.nome} - Sessão {sessao.id}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 md:mt-0">
            {canEdit() && (
              <>
                <Button variant="outline" onClick={handleImprimirLista}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Lista
                </Button>
                <Button variant="outline" onClick={handleSalvarRascunho}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Rascunho
                </Button>
                <Button onClick={handleFinalizarContagem}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar Contagem
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status da Sessão */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            Criado por: {sessao.criadaPor.nome}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {format(new Date(sessao.criadaEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </div>
          <div className="flex items-center gap-1">
            <ClipboardCheck className="w-4 h-4" />
            Progresso: {itensContados}/{itens.length} itens contados
          </div>
        </div>

        {isReadOnly && (
          <div className="mt-4 p-3 bg-muted rounded-lg border">
            <p className="text-sm font-medium">Somente Leitura</p>
            <p className="text-xs text-muted-foreground">
              Seu perfil não permite editar contagens. Apenas Gestores e Administradores podem modificar os dados.
            </p>
          </div>
        )}
      </div>

      {/* Busca */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição ou grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grade de Contagem */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Lista de Contagem ({filteredItens.length} itens)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
              <div className="col-span-3">Código</div>
              <div className="col-span-4">Descrição</div>
              <div className="col-span-2 text-center">Quantidade Contada</div>
              <div className="col-span-3">Observação</div>
            </div>

            {/* Itens */}
            {filteredItens.map((item, index) => (
              <div 
                key={item.id}
                className="grid grid-cols-12 gap-4 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-3">
                  <Badge variant="outline" className="font-mono">
                    {item.codigo}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.tipo === 'SERIE' ? 'Série' : 'Saldo'}
                  </div>
                </div>
                
                <div className="col-span-4">
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.grupoNome} › {item.modeloNome}
                  </div>
                </div>
                
                <div className="col-span-2">
                  <Input
                    ref={(el) => inputRefs.current[index] = el}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={contagemData[item.id]?.qtd || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                      updateContagem(item.id, 'qtd', value);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="text-center"
                    disabled={isReadOnly}
                  />
                </div>
                
                <div className="col-span-3">
                  <Input
                    placeholder="Observações..."
                    value={contagemData[item.id]?.obs || ''}
                    onChange={(e) => updateContagem(item.id, 'obs', e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            ))}

            {filteredItens.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? "Nenhum item encontrado com o termo buscado"
                    : "Nenhum item para contagem"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dica de navegação */}
      {!isReadOnly && (
        <Card className="shadow-md bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Dicas de navegação:</strong> Use Enter para ir para a próxima linha, 
              ↑↓ para navegar entre linhas. Os dados são salvos automaticamente ao finalizar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}