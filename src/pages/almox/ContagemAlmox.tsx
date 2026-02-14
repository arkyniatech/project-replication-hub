import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Clipboard, FileText, AlertTriangle, CheckCircle, XCircle, Eye, Plus, Printer } from "lucide-react";
import { useAlmoxStore } from "@/modules/almox/store/almoxStore";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useRbac } from "@/hooks/useRbac";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessaoContagem {
  id: string;
  loja: string;
  tipo: 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | 'TODOS';
  status: 'PREPARANDO' | 'CONTANDO' | 'ANALISANDO' | 'FINALIZADA';
  criadoEm: string;
  criadoPor: string;
  itens: ItemContagem[];
  divergencias?: DivergenciaItem[];
}

interface ItemContagem {
  itemId: string;
  sku: string;
  descricao: string;
  saldoSistema: number;
  quantidadeContada?: number;
  observacao?: string;
}

interface DivergenciaItem extends ItemContagem {
  diferenca: number;
  percentualDiferenca: number;
  acao?: 'AJUSTAR' | 'INVESTIGAR' | 'BAIXA';
  justificativa?: string;
  aprovado?: boolean;
}

export default function ContagemAlmox() {
  const [sessoes, setSessoes] = useState<SessaoContagem[]>([
    {
      id: 'CONT-001',
      loja: 'Matriz',
      tipo: 'PECA',
      status: 'ANALISANDO',
      criadoEm: new Date().toISOString(),
      criadoPor: 'Admin',
      itens: [],
      divergencias: [
        {
          itemId: '1',
          sku: 'PC-001',
          descricao: 'Parafuso M8 x 50mm',
          saldoSistema: 100,
          quantidadeContada: 95,
          diferenca: -5,
          percentualDiferenca: -5,
          observacao: 'Faltam 5 unidades'
        }
      ]
    }
  ]);

  const [showNovaContagem, setShowNovaContagem] = useState(false);
  const [showProcessarDivergencias, setShowProcessarDivergencias] = useState(false);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoContagem | null>(null);
  const [novaContagemForm, setNovaContagemForm] = useState({
    tipo: 'TODOS' as 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | 'TODOS',
    grupo: '',
    incluirZerados: false
  });

  const { catalogoItens, estoque, ajustarSaldo } = useAlmoxStore();
  const { lojaAtual } = useMultiunidade();
  const { can } = useRbac();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PREPARANDO': return 'secondary';
      case 'CONTANDO': return 'default';
      case 'ANALISANDO': return 'destructive';
      case 'FINALIZADA': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PREPARANDO': return 'Preparando';
      case 'CONTANDO': return 'Em Contagem';
      case 'ANALISANDO': return 'Analisando';
      case 'FINALIZADA': return 'Finalizada';
      default: return status;
    }
  };

  const handleCriarSessao = () => {
    if (!lojaAtual) return;

    // Filtrar itens baseado nos critérios
    let itensParaContagem = catalogoItens.filter(item => {
      if (!can('almox:patrimonial') && item.tipo === 'PATRIMONIAL') return false;
      if (novaContagemForm.tipo !== 'TODOS' && item.tipo !== novaContagemForm.tipo) return false;
      if (novaContagemForm.grupo && item.grupo !== novaContagemForm.grupo) return false;
      
      const saldoItem = estoque.find(e => e.itemId === item.id && e.lojaId === lojaAtual.id);
      if (!novaContagemForm.incluirZerados && (!saldoItem || saldoItem.saldo === 0)) return false;
      
      return true;
    });

    const novaSessao: SessaoContagem = {
      id: `CONT-${String(sessoes.length + 1).padStart(3, '0')}`,
      loja: lojaAtual.nome,
      tipo: novaContagemForm.tipo,
      status: 'PREPARANDO',
      criadoEm: new Date().toISOString(),
      criadoPor: 'Admin',
      itens: itensParaContagem.map(item => {
        const saldoItem = estoque.find(e => e.itemId === item.id && e.lojaId === lojaAtual.id);
        return {
          itemId: item.id,
          sku: item.sku,
          descricao: item.descricao,
          saldoSistema: saldoItem?.saldo || 0
        };
      })
    };

    setSessoes(prev => [...prev, novaSessao]);
    setShowNovaContagem(false);
    
    toast({
      title: "Sessão criada",
      description: `Sessão ${novaSessao.id} criada com ${novaSessao.itens.length} itens.`
    });
  };

  const handleProcessarDivergencias = () => {
    if (!sessaoSelecionada?.divergencias) return;

    let processadas = 0;
    sessaoSelecionada.divergencias.forEach(div => {
      if (!div.acao || !div.justificativa) return;
      
      if (div.acao === 'AJUSTAR' && lojaAtual) {
        ajustarSaldo(div.itemId, lojaAtual.id, div.diferenca, div.justificativa);
        processadas++;
      }
    });

    // Atualizar status da sessão
    setSessoes(prev => prev.map(s => 
      s.id === sessaoSelecionada.id 
        ? { ...s, status: 'FINALIZADA' as const }
        : s
    ));

    toast({
      title: "Divergências processadas",
      description: `${processadas} ajustes realizados com sucesso.`
    });

    setShowProcessarDivergencias(false);
    setSessaoSelecionada(null);
  };

  const grupos = [...new Set(catalogoItens.map(item => item.grupo))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contagem Cega</h1>
          <p className="text-muted-foreground">
            Inventário de estoque por contagem física
          </p>
        </div>
        <Button onClick={() => setShowNovaContagem(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Contagem
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessões de Contagem</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sessão</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Divergências</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessoes.map((sessao) => (
                <TableRow key={sessao.id}>
                  <TableCell className="font-mono">{sessao.id}</TableCell>
                  <TableCell>{sessao.loja}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sessao.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(sessao.status)}>
                      {getStatusLabel(sessao.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{sessao.itens.length}</TableCell>
                  <TableCell>
                    {sessao.divergencias ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {sessao.divergencias.length}
                      </Badge>
                    ) : (
                      <Badge variant="outline">--</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(sessao.criadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Printer className="h-3 w-3" />
                      </Button>
                      {sessao.status === 'ANALISANDO' && sessao.divergencias && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => {
                            setSessaoSelecionada(sessao);
                            setShowProcessarDivergencias(true);
                          }}
                        >
                          Processar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Nova Contagem */}
      <Dialog open={showNovaContagem} onOpenChange={setShowNovaContagem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Sessão de Contagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Item</Label>
              <Select 
                value={novaContagemForm.tipo} 
                onValueChange={(value: any) => setNovaContagemForm(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  {can('almox:patrimonial') && <SelectItem value="PATRIMONIAL">Patrimonial</SelectItem>}
                  <SelectItem value="PECA">Peças</SelectItem>
                  <SelectItem value="CONSUMIVEL">Consumíveis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo (opcional)</Label>
              <Select 
                value={novaContagemForm.grupo} 
                onValueChange={(value) => setNovaContagemForm(prev => ({ ...prev, grupo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os grupos</SelectItem>
                  {grupos.map(grupo => (
                    <SelectItem key={grupo} value={grupo}>{grupo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="incluirZerados"
                checked={novaContagemForm.incluirZerados}
                onChange={(e) => setNovaContagemForm(prev => ({ ...prev, incluirZerados: e.target.checked }))}
              />
              <Label htmlFor="incluirZerados">Incluir itens com saldo zero</Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNovaContagem(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCriarSessao}>
                Criar Sessão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Processar Divergências */}
      <Dialog open={showProcessarDivergencias} onOpenChange={setShowProcessarDivergencias}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Processar Divergências - {sessaoSelecionada?.id}</DialogTitle>
          </DialogHeader>
          {sessaoSelecionada?.divergencias && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {sessaoSelecionada.divergencias.map((div, index) => (
                <Card key={div.itemId}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium">{div.sku} - {div.descricao}</div>
                        <div className="text-sm text-muted-foreground">
                          Sistema: {div.saldoSistema} | Contado: {div.quantidadeContada} | 
                          Diferença: <span className={div.diferenca < 0 ? 'text-red-600' : 'text-green-600'}>
                            {div.diferenca > 0 ? '+' : ''}{div.diferenca} ({div.percentualDiferenca.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label>Ação</Label>
                          <Select 
                            value={div.acao || ''} 
                            onValueChange={(value: any) => {
                              const novasDivergencias = [...sessaoSelecionada.divergencias!];
                              novasDivergencias[index] = { ...div, acao: value };
                              setSessaoSelecionada({ ...sessaoSelecionada, divergencias: novasDivergencias });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar ação" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AJUSTAR">Ajustar Estoque</SelectItem>
                              <SelectItem value="INVESTIGAR">Investigar</SelectItem>
                              <SelectItem value="BAIXA">Baixa Patrimonial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Justificativa</Label>
                          <Textarea
                            placeholder="Motivo da divergência..."
                            value={div.justificativa || ''}
                            onChange={(e) => {
                              const novasDivergencias = [...sessaoSelecionada.divergencias!];
                              novasDivergencias[index] = { ...div, justificativa: e.target.value };
                              setSessaoSelecionada({ ...sessaoSelecionada, divergencias: novasDivergencias });
                            }}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Separator />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowProcessarDivergencias(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleProcessarDivergencias}>
                  Processar Todas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}