import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, Save, CheckCircle, Search, Printer, ArrowLeft, Calendar, User, Loader2
} from "lucide-react";
import { useSupabaseConferencia, type ContagemSessao } from "@/hooks/useSupabaseConferencia";
import { useMultiunidade } from "@/hooks/useMultiunidade";
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
    useItensPorSessao, 
    salvarContagemBatch, 
    finalizarContagem, 
    canEdit 
  } = useSupabaseConferencia();
  const { lojas } = useMultiunidade();
  
  const { data: itens = [], isLoading: loadingItens } = useItensPorSessao(sessao.id);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [contagemData, setContagemData] = useState<Record<string, { qtd?: number; obs?: string }>>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const loja = lojas.find(l => l.id === sessao.lojaId);

  const filteredItens = useMemo(() => {
    return itens.filter(item => 
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.grupoNome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [itens, searchTerm]);

  // Init contagem data from DB
  useEffect(() => {
    if (itens.length === 0) return;
    const initialData: Record<string, { qtd?: number; obs?: string }> = {};
    itens.forEach(item => {
      if (!contagemData[item.id]) {
        initialData[item.id] = {
          qtd: item.qtdContada ?? undefined,
          obs: item.observacao || ''
        };
      }
    });
    if (Object.keys(initialData).length > 0) {
      setContagemData(prev => ({ ...prev, ...initialData }));
    }
  }, [itens.length]);

  const handleSalvarRascunho = async () => {
    const items = Object.entries(contagemData)
      .filter(([, data]) => data.qtd !== undefined || data.obs)
      .map(([itemId, data]) => ({
        itemId,
        qtdContada: data.qtd ?? null,
        observacao: data.obs,
      }));

    try {
      await salvarContagemBatch.mutateAsync(items);
      toast({ title: "Rascunho salvo", description: "Dados salvos com sucesso", duration: 1500 });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleFinalizarContagem = async () => {
    if (!canEdit()) {
      toast({ title: "Sem permissão", description: "Apenas Gestores e Administradores podem finalizar contagens", variant: "destructive" });
      return;
    }

    // Save all first
    const items = Object.entries(contagemData)
      .map(([itemId, data]) => ({
        itemId,
        qtdContada: data.qtd ?? null,
        observacao: data.obs,
      }));

    try {
      if (items.length > 0) {
        await salvarContagemBatch.mutateAsync(items);
      }
      await finalizarContagem.mutateAsync({ sessaoId: sessao.id });
      toast({ title: "Contagem finalizada", description: "A partir de agora será possível revisar divergências", duration: 2000 });
    } catch (error: any) {
      toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, filteredItens.length - 1);
      inputRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      inputRefs.current[prevIndex]?.focus();
    }
  };

  const updateContagem = (itemId: string, field: 'qtd' | 'obs', value: any) => {
    setContagemData(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const itensContados = Object.values(contagemData).filter(d => d.qtd !== undefined).length;
  const isReadOnly = !canEdit();
  const isSaving = salvarContagemBatch.isPending || finalizarContagem.isPending;

  if (loadingItens) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/equipamentos/conferencia')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Contagem Cega</h1>
              <p className="text-muted-foreground">
                {loja?.nome} - {sessao.displayNo || sessao.id}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 md:mt-0">
            {canEdit() && (
              <>
                <Button variant="outline" onClick={handleSalvarRascunho} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
                </Button>
                <Button onClick={handleFinalizarContagem} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Finalizar Contagem
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" /> Criado por: {sessao.criadaPor.nome}
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

      {/* Grade */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Lista de Contagem ({filteredItens.length} itens)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 p-3 bg-muted rounded-lg font-medium text-sm">
              <div className="col-span-3">Código</div>
              <div className="col-span-4">Descrição</div>
              <div className="col-span-2 text-center">Quantidade Contada</div>
              <div className="col-span-3">Observação</div>
            </div>

            {filteredItens.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="col-span-3">
                  <Badge variant="outline" className="font-mono">{item.codigo}</Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.tipo === 'SERIE' ? 'Série' : 'Saldo'}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="font-medium">{item.descricao}</div>
                  <div className="text-xs text-muted-foreground">{item.grupoNome} › {item.modeloNome}</div>
                </div>
                <div className="col-span-2">
                  <Input
                    ref={(el) => inputRefs.current[index] = el}
                    type="number" min="0" step="1" placeholder="0"
                    value={contagemData[item.id]?.qtd ?? ''}
                    onChange={(e) => updateContagem(item.id, 'qtd', e.target.value === '' ? undefined : parseInt(e.target.value))}
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
                <Search className="w-6 h-6 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum item encontrado com o termo buscado" : "Nenhum item para contagem"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
