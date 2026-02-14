import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Search, 
  Plus,
  Trash2,
  FileText,
  CreditCard,
  Truck,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clienteStorage, equipamentoStorage, contratoStorage } from "@/lib/storage";
import { Cliente, Equipamento } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { generateNumber } from "@/lib/numeracao";
import { DeprecatedV1Banner } from "@/components/contratos/DeprecatedV1Banner";

interface ContratoRascunho {
  id?: string;
  numero: string;
  clienteId: string;
  cliente?: Cliente;
  itens: {
    equipamentoId: string;
    equipamento?: Equipamento;
    quantidade: number;
    periodo: 'diario' | 'semanal' | 'mensal';
    valorUnitario: number;
    valorTotal: number;
  }[];
  dataInicio: string;
  dataFim: string;
  entrega: {
    endereco: string;
    observacoes: string;
    frete: number;
  };
  condicoes: {
    termosAceitos: boolean;
  };
  pagamento: {
    metodo: 'Boleto' | 'PIX' | 'Cartão';
  };
  valorTotal: number;
}

const ETAPAS = [
  'Cliente',
  'Itens',
  'Entrega/Coleta',
  'Condições',
  'Pagamento',
  'Documentos',
  'Conferência'
];

export default function NovoContrato() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Telemetria V1 (deprecated)
  useEffect(() => {
    console.log('[TELEMETRY] route:contratos:deprecated->v1', {
      timestamp: new Date().toISOString(),
      path: '/contratos/novo-v1'
    });
  }, []);
  
  const [contrato, setContrato] = useState<ContratoRascunho>({
    numero: '', // Será gerado automaticamente no momento da confirmação
    clienteId: '',
    itens: [],
    dataInicio: '',
    dataFim: '',
    entrega: {
      endereco: '',
      observacoes: '',
      frete: 0
    },
    condicoes: {
      termosAceitos: false
    },
    pagamento: {
      metodo: 'Boleto'
    },
    valorTotal: 0
  });

  const [searchCliente, setSearchCliente] = useState('');
  const [searchEquipamento, setSearchEquipamento] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [equipamentosFiltrados, setEquipamentosFiltrados] = useState<Equipamento[]>([]);

  useEffect(() => {
    const clientes = clienteStorage.getAll();
    setClientesFiltrados(
      clientes.filter(c => 
        c.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
        c.documento.includes(searchCliente)
      )
    );
  }, [searchCliente]);

  useEffect(() => {
    const equipamentos = equipamentoStorage.getAll();
    setEquipamentosFiltrados(
      equipamentos.filter(e => 
        e.status === 'Disponível' &&
        (e.nome.toLowerCase().includes(searchEquipamento.toLowerCase()) ||
         e.codigo.toLowerCase().includes(searchEquipamento.toLowerCase()) ||
         e.grupo.nome.toLowerCase().includes(searchEquipamento.toLowerCase()))
      )
    );
  }, [searchEquipamento]);

  useEffect(() => {
    const total = contrato.itens.reduce((sum, item) => sum + item.valorTotal, 0) + contrato.entrega.frete;
    setContrato(prev => ({ ...prev, valorTotal: total }));
  }, [contrato.itens, contrato.entrega.frete]);

  const handleExit = () => {
    if (hasChanges) {
      if (confirm('Há alterações não salvas. Deseja sair mesmo assim?')) {
        navigate('/contratos');
      }
    } else {
      navigate('/contratos');
    }
  };

  const salvarRascunho = () => {
    localStorage.setItem('contrato-rascunho', JSON.stringify(contrato));
    setHasChanges(false);
    toast({
      title: "Rascunho salvo",
      description: "O rascunho foi salvo com sucesso"
    });
  };

  const proximaEtapa = () => {
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
    if (cliente.statusCredito === 'Suspenso') {
      toast({
        title: "Cliente bloqueado",
        description: "Este cliente está com status suspenso e não pode realizar novas locações",
        variant: "destructive"
      });
      return;
    }
    
    setContrato(prev => ({ 
      ...prev, 
      clienteId: cliente.id, 
      cliente,
      entrega: { ...prev.entrega, endereco: `${cliente.endereco.logradouro}, ${cliente.endereco.numero} - ${cliente.endereco.bairro}, ${cliente.endereco.cidade}/${cliente.endereco.uf}` }
    }));
    setHasChanges(true);
    setSearchCliente('');
  };

  const adicionarItem = (equipamento: Equipamento) => {
    const novoItem = {
      equipamentoId: equipamento.id,
      equipamento,
      quantidade: 1,
      periodo: 'diario' as const,
      valorUnitario: equipamento.precos.diaria || 0,
      valorTotal: equipamento.precos.diaria || 0
    };
    
    setContrato(prev => ({
      ...prev,
      itens: [...prev.itens, novoItem]
    }));
    setHasChanges(true);
  };

  const atualizarItem = (index: number, campo: string, valor: any) => {
    setContrato(prev => {
      const novosItens = [...prev.itens];
      const item = { ...novosItens[index] };
      
      if (campo === 'periodo') {
        item.periodo = valor;
        item.valorUnitario = item.equipamento?.precos[valor] || 0;
      } else {
        (item as any)[campo] = valor;
      }
      
      item.valorTotal = item.quantidade * item.valorUnitario;
      novosItens[index] = item;
      
      return { ...prev, itens: novosItens };
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

  const finalizarContrato = () => {
    // Gerar número do contrato automaticamente
    const numeroContrato = generateNumber('contrato');
    
    const novoContrato = {
      id: Date.now(), // Auto-increment simulation
      lojaId: '1', // Default loja
      numero: numeroContrato,
      clienteId: contrato.clienteId,
      cliente: contrato.cliente!,
      itens: contrato.itens.map(item => ({
        id: crypto.randomUUID(),
        equipamentoId: item.equipamentoId,
        equipamento: item.equipamento!,
        controle: 'SERIALIZADO' as const,
        quantidade: item.quantidade,
        periodoEscolhido: 'DIARIA' as const,
        valorUnitario: item.valorUnitario,
        subtotal: item.valorTotal,
        valorTotal: item.valorTotal,
        periodo: item.periodo
      })),
      entrega: {
        data: contrato.dataInicio,
        janela: 'MANHA' as const,
        observacoes: contrato.entrega.observacoes
      },
      condicoes: {
        confirmacoes: [],
        observacoes: contrato.entrega?.observacoes || ''
      },
      pagamento: {
        forma: (contrato.pagamento.metodo === 'Boleto' ? 'BOLETO' : 
               contrato.pagamento.metodo === 'PIX' ? 'PIX' : 
               contrato.pagamento.metodo === 'Cartão' ? 'CARTAO' : 'DINHEIRO') as 'BOLETO' | 'PIX' | 'CARTAO' | 'DINHEIRO',
        vencimentoISO: new Date().toISOString()
      },
      status: 'AGUARDANDO_ENTREGA' as const,
      rascunho: false,
      timeline: [],
      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      valorTotal: contrato.valorTotal,
      formaPagamento: contrato.pagamento.metodo === 'Boleto' ? 'À vista' : contrato.pagamento.metodo as any,
      observacoes: contrato.entrega.observacoes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    contratoStorage.add(novoContrato);
    localStorage.removeItem('contrato-rascunho');
    
    toast({
      title: "Contrato criado",
      description: `Contrato ${numeroContrato} criado com sucesso`
    });
    
    navigate('/contratos');
  };

  const renderEtapaCliente = () => (
    <Card>
      <CardHeader>
        <CardTitle>Selecionar Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nome ou documento..."
            value={searchCliente}
            onChange={(e) => setSearchCliente(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {contrato.cliente && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{contrato.cliente.nome}</h3>
                <p className="text-sm text-muted-foreground">{contrato.cliente.documento}</p>
                <Badge variant={contrato.cliente.statusCredito === 'Ativo' ? 'default' : 'secondary'}>
                  {contrato.cliente.statusCredito}
                </Badge>
              </div>
              <Button variant="outline" onClick={() => setContrato(prev => ({ ...prev, clienteId: '', cliente: undefined }))}>
                Alterar
              </Button>
            </div>
          </div>
        )}
        
        {searchCliente && !contrato.cliente && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clientesFiltrados.map(cliente => (
              <div 
                key={cliente.id}
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => selecionarCliente(cliente)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{cliente.nome}</h4>
                    <p className="text-sm text-muted-foreground">{cliente.documento}</p>
                  </div>
                  <Badge variant={cliente.statusCredito === 'Ativo' ? 'default' : 'secondary'}>
                    {cliente.statusCredito}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderEtapaItens = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Equipamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipamento por nome, código ou grupo..."
              value={searchEquipamento}
              onChange={(e) => setSearchEquipamento(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchEquipamento && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {equipamentosFiltrados.map(equipamento => (
                <div 
                  key={equipamento.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => adicionarItem(equipamento)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{equipamento.nome}</h4>
                      <p className="text-sm text-muted-foreground">{equipamento.codigo} - {equipamento.grupo.nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">R$ {equipamento.precos.diaria || 0}/dia</p>
                      <Plus className="w-4 h-4 ml-auto mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {contrato.itens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Itens do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contrato.itens.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{item.equipamento?.nome}</h4>
                      <p className="text-sm text-muted-foreground">{item.equipamento?.codigo}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removerItem(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(index, 'quantidade', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Período</Label>
                      <select
                        value={item.periodo}
                        onChange={(e) => atualizarItem(index, 'periodo', e.target.value)}
                        className="w-full px-3 py-2 bg-input border border-input-border rounded-md"
                      >
                        <option value="diario">Diário</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <div className="text-lg font-semibold">
                        R$ {item.valorTotal.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Subtotal:</span>
                  <span>R$ {contrato.itens.reduce((sum, item) => sum + item.valorTotal, 0).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderEtapaPeriodo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Período e Entrega</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data de Início</Label>
            <Input
              type="date"
              value={contrato.dataInicio}
              onChange={(e) => {
                setContrato(prev => ({ ...prev, dataInicio: e.target.value }));
                setHasChanges(true);
              }}
            />
          </div>
          <div>
            <Label>Data de Fim</Label>
            <Input
              type="date"
              value={contrato.dataFim}
              onChange={(e) => {
                setContrato(prev => ({ ...prev, dataFim: e.target.value }));
                setHasChanges(true);
              }}
            />
          </div>
        </div>
        
        <div>
          <Label>Endereço de Entrega</Label>
          <Textarea
            placeholder="Endereço completo para entrega..."
            value={contrato.entrega.endereco}
            onChange={(e) => {
              setContrato(prev => ({ 
                ...prev, 
                entrega: { ...prev.entrega, endereco: e.target.value }
              }));
              setHasChanges(true);
            }}
          />
        </div>
        
        <div>
          <Label>Valor do Frete (R$)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={contrato.entrega.frete}
            onChange={(e) => {
              setContrato(prev => ({ 
                ...prev, 
                entrega: { ...prev.entrega, frete: parseFloat(e.target.value) || 0 }
              }));
              setHasChanges(true);
            }}
          />
        </div>
        
        <div>
          <Label>Observações</Label>
          <Textarea
            placeholder="Observações sobre entrega, horários, etc..."
            value={contrato.entrega.observacoes}
            onChange={(e) => {
              setContrato(prev => ({ 
                ...prev, 
                entrega: { ...prev.entrega, observacoes: e.target.value }
              }));
              setHasChanges(true);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderEtapaCondicoes = () => (
    <Card>
      <CardHeader>
        <CardTitle>Condições do Contrato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/20">
          <h3 className="font-semibold mb-2">Termos e Condições</h3>
          <div className="text-sm space-y-2">
            <p>• O equipamento deve ser devolvido nas mesmas condições de retirada</p>
            <p>• Eventuais danos serão cobrados conforme tabela de preços</p>
            <p>• O pagamento deve ser efetuado até a data de vencimento</p>
            <p>• A renovação deve ser solicitada com antecedência mínima de 24h</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="termos"
            checked={contrato.condicoes.termosAceitos}
            onChange={(e) => {
              setContrato(prev => ({ 
                ...prev, 
                condicoes: { ...prev.condicoes, termosAceitos: e.target.checked }
              }));
              setHasChanges(true);
            }}
          />
          <Label htmlFor="termos">Aceito os termos e condições</Label>
        </div>
      </CardContent>
    </Card>
  );

  const renderEtapaPagamento = () => (
    <Card>
      <CardHeader>
        <CardTitle>Forma de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Boleto', 'PIX', 'Cartão'] as const).map(metodo => (
            <div
              key={metodo}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                contrato.pagamento.metodo === metodo 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => {
                setContrato(prev => ({ 
                  ...prev, 
                  pagamento: { ...prev.pagamento, metodo }
                }));
                setHasChanges(true);
              }}
            >
              <div className="text-center">
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold">{metodo}</h3>
                <p className="text-sm text-muted-foreground">
                  {metodo === 'Boleto' && 'Vencimento em 7 dias'}
                  {metodo === 'PIX' && 'Pagamento instantâneo'}
                  {metodo === 'Cartão' && 'Parcelamento disponível'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderEtapaDocumentos = () => (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Documentos serão gerados automaticamente após finalização
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Contrato de Locação</h3>
            <p className="text-sm text-muted-foreground">PDF com todos os detalhes do contrato</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Boleto de Pagamento</h3>
            <p className="text-sm text-muted-foreground">Documento de cobrança (se aplicável)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEtapaConferencia = () => (
    <Card>
      <CardHeader>
        <CardTitle>Conferência Final</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Cliente</h3>
            <p>{contrato.cliente?.nome}</p>
            <p className="text-sm text-muted-foreground">{contrato.cliente?.documento}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Período</h3>
            <p>{contrato.dataInicio} a {contrato.dataFim}</p>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Itens ({contrato.itens.length})</h3>
          <div className="space-y-2">
            {contrato.itens.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.equipamento?.nome} x{item.quantidade}</span>
                <span>R$ {item.valorTotal.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total Geral:</span>
            <span>R$ {contrato.valorTotal.toLocaleString('pt-BR')}</span>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={finalizarContrato} className="flex-1">
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar Contrato
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const etapasRender = [
    renderEtapaCliente,
    renderEtapaItens,
    renderEtapaPeriodo,
    renderEtapaCondicoes,
    renderEtapaPagamento,
    renderEtapaDocumentos,
    renderEtapaConferencia
  ];

  const podeAvancar = () => {
    switch (etapaAtual) {
      case 0: return !!contrato.clienteId;
      case 1: return contrato.itens.length > 0;
      case 2: return contrato.dataInicio && contrato.dataFim;
      case 3: return contrato.condicoes.termosAceitos;
      case 4: return !!contrato.pagamento.metodo;
      default: return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Deprecação V1 */}
      <DeprecatedV1Banner />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleExit}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Novo Contrato</h1>
            <p className="text-muted-foreground">{contrato.numero}</p>
          </div>
        </div>
        <Button variant="outline" onClick={salvarRascunho}>
          <Save className="w-4 h-4 mr-2" />
          Salvar Rascunho
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              Etapa {etapaAtual + 1} de {ETAPAS.length}: {ETAPAS[etapaAtual]}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((etapaAtual + 1) / ETAPAS.length) * 100)}%
            </span>
          </div>
          <Progress value={((etapaAtual + 1) / ETAPAS.length) * 100} className="mb-4" />
          <div className="flex items-center justify-center gap-2">
            {ETAPAS.map((etapa, index) => (
              <div key={etapa} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= etapaAtual 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                {index < ETAPAS.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    index < etapaAtual ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {etapasRender[etapaAtual]()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={etapaAnterior}
          disabled={etapaAtual === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>
        
        {etapaAtual < ETAPAS.length - 1 ? (
          <Button 
            onClick={proximaEtapa}
            disabled={!podeAvancar()}
          >
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}