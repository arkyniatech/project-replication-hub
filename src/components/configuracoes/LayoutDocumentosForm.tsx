import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, Eye, Save, RotateCcw, History, Palette, Type, Settings, Image, FileX } from "lucide-react";
import { toast } from "sonner";
import { getAppConfig, setAppConfig } from "@/lib/storage";
import { APP_CONFIG } from "@/config/app";

interface LayoutColumn {
  id: string;
  label: string;
  visivel: boolean;
  ordem: number;
}

interface LayoutBlocos {
  empresa: boolean;
  cliente: boolean;
  documento: boolean;
  itens: boolean;
  totais: boolean;
  observacoes: boolean;
  assinaturas: boolean;
}

interface LayoutCores {
  primaria: string;
  secundaria: string;
}

interface LayoutFonte {
  titulo: 'Inter' | 'Roboto' | 'System';
  corpo: 'Inter' | 'Roboto' | 'System';
}

interface LayoutCabecalhoRodape {
  linhas: string[];
}

interface LayoutMargem {
  superior: number;
  inferior: number;
  esquerda: number;
  direita: number;
}

interface LayoutVersao {
  id: string;
  nomeVersao: string;
  criadoEm: string;
  criadoPor: string;
  payloadLayout: any;
}

interface LayoutDocumento {
  logoUrl?: string;
  cores: LayoutCores;
  fonte: LayoutFonte;
  cabecalho: LayoutCabecalhoRodape;
  rodape: LayoutCabecalhoRodape;
  blocos: LayoutBlocos;
  tabela: {
    colunas: LayoutColumn[];
  };
  margem: LayoutMargem;
  versoes: LayoutVersao[];
  marcaDagua?: 'DEMONSTRATIVO' | 'CANCELADO' | null;
  opcoes?: {
    mostrarMarcaDemonstrativo?: boolean;
    mostrarPix?: boolean;
    mostrarBoleto?: boolean;
  };
}

interface ConfigLayoutDocumentos {
  contrato: LayoutDocumento;
  os: LayoutDocumento;
  fatura: LayoutDocumento;
}

const colunasDefault = {
  contrato: [
    { id: 'item', label: 'Item', visivel: true, ordem: 1 },
    { id: 'descricao', label: 'Descrição', visivel: true, ordem: 2 },
    { id: 'qtde', label: 'Qtde', visivel: true, ordem: 3 },
    { id: 'periodo', label: 'Período', visivel: true, ordem: 4 },
    { id: 'preco', label: 'Preço Un.', visivel: true, ordem: 5 },
    { id: 'subtotal', label: 'Subtotal', visivel: true, ordem: 6 }
  ],
  os: [
    { id: 'item', label: 'Item', visivel: true, ordem: 1 },
    { id: 'descricao', label: 'Descrição', visivel: true, ordem: 2 },
    { id: 'qtde', label: 'Qtde', visivel: true, ordem: 3 },
    { id: 'unidade', label: 'Unidade', visivel: true, ordem: 4 },
    { id: 'preco', label: 'Preço Un.', visivel: true, ordem: 5 },
    { id: 'subtotal', label: 'Subtotal', visivel: true, ordem: 6 }
  ],
  fatura: [
    { id: 'descricao', label: 'Descrição', visivel: true, ordem: 1 },
    { id: 'qtde', label: 'Qtde', visivel: true, ordem: 2 },
    { id: 'periodo', label: 'Período/Rateio', visivel: true, ordem: 3 },
    { id: 'preco', label: 'Preço Un.', visivel: true, ordem: 4 },
    { id: 'subtotal', label: 'Subtotal', visivel: true, ordem: 5 }
  ]
};

const layoutDefault: LayoutDocumento = {
  cores: { primaria: '#F97316', secundaria: '#111827' },
  fonte: { titulo: 'Inter', corpo: 'Inter' },
  cabecalho: { linhas: ['{{empresa.razao}}', '{{empresa.endereco}} - {{empresa.telefone}}'] },
  rodape: { linhas: ['{{empresa.email}}'] },
  blocos: {
    empresa: true,
    cliente: true,
    documento: true,
    itens: true,
    totais: true,
    observacoes: true,
    assinaturas: true
  },
  tabela: { colunas: colunasDefault.contrato },
  margem: { superior: 20, inferior: 20, esquerda: 20, direita: 20 },
  versoes: [],
  marcaDagua: null,
  opcoes: {
    mostrarMarcaDemonstrativo: true,
    mostrarPix: true,
    mostrarBoleto: true
  }
};

const placeholders = [
  { grupo: 'Empresa', items: ['{{empresa.razao}}', '{{empresa.cnpj}}', '{{empresa.ie}}', '{{empresa.endereco}}', '{{empresa.email}}', '{{empresa.telefone}}'] },
  { grupo: 'Cliente', items: ['{{cliente.nome}}', '{{cliente.cnpjCpf}}', '{{cliente.endereco}}'] },
  { grupo: 'Documento', items: ['{{contrato.numero}}', '{{contrato.data}}', '{{contrato.vigencia.inicio}}', '{{contrato.vigencia.fim}}', '{{os.numero}}', '{{os.data}}', '{{os.equipamento}}', '{{os.prioridade}}', '{{fatura.numero}}', '{{fatura.emissao}}', '{{fatura.vencimento}}', '{{fatura.forma}}'] },
  { grupo: 'Financeiro', items: ['{{total}}', '{{subtotal}}', '{{descontos}}', '{{acrescimos}}'] },
  { grupo: 'Pagamento', items: ['{{linhaDigitavel}}', '{{qrPix}}', '{{urlSegundaVia}}'] }
];

export function LayoutDocumentosForm() {
  const [activeTab, setActiveTab] = useState<'contrato' | 'os' | 'fatura'>('contrato');
  const [config, setConfig] = useState<ConfigLayoutDocumentos>({
    contrato: { ...layoutDefault, tabela: { colunas: colunasDefault.contrato } },
    os: { ...layoutDefault, tabela: { colunas: colunasDefault.os } },
    fatura: { ...layoutDefault, tabela: { colunas: colunasDefault.fatura }, opcoes: { mostrarMarcaDemonstrativo: true, mostrarPix: true, mostrarBoleto: true } }
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  // Carregar configurações do localStorage
  useEffect(() => {
    const storedConfig = getAppConfig();
    if (storedConfig?.layoutDocumentos) {
      setConfig(storedConfig.layoutDocumentos);
    } else {
      // Usar cores da organização se disponível
      if (storedConfig?.organizacao?.cores) {
        const newConfig = { ...config };
        Object.keys(newConfig).forEach(tipo => {
          newConfig[tipo as keyof ConfigLayoutDocumentos].cores = storedConfig.organizacao.cores;
        });
        setConfig(newConfig);
      }
    }
  }, []);

  const currentLayout = config[activeTab];

  const handleSave = () => {
    try {
      const currentConfig = getAppConfig();
      setAppConfig({
        ...currentConfig,
        layoutDocumentos: config
      });
      toast.success("Layout salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar layout");
    }
  };

  const handleSalvarVersao = (nomeVersao: string) => {
    if (!nomeVersao.trim()) {
      toast.error("Nome da versão é obrigatório");
      return;
    }

    const novaVersao: LayoutVersao = {
      id: Date.now().toString(),
      nomeVersao: nomeVersao.trim(),
      criadoEm: new Date().toISOString(),
      criadoPor: "Admin Sistema", // Mock
      payloadLayout: { ...currentLayout }
    };

    const newConfig = { ...config };
    const versoes = [...newConfig[activeTab].versoes, novaVersao];
    
    // Manter apenas as últimas 5 versões
    if (versoes.length > 5) {
      versoes.shift();
    }
    
    newConfig[activeTab].versoes = versoes;
    setConfig(newConfig);
    
    toast.success(`Versão "${nomeVersao}" salva com sucesso!`);
  };

  const handleReverterVersao = (versao: LayoutVersao) => {
    const newConfig = { ...config };
    newConfig[activeTab] = { ...versao.payloadLayout, versoes: currentLayout.versoes };
    setConfig(newConfig);
    toast.success(`Layout revertido para "${versao.nomeVersao}"`);
  };

  const handleRestaurarPadrao = () => {
    const newConfig = { ...config };
    const colunas = colunasDefault[activeTab];
    newConfig[activeTab] = { ...layoutDefault, tabela: { colunas } };
    if (activeTab === 'fatura') {
      newConfig[activeTab].opcoes = { mostrarMarcaDemonstrativo: true, mostrarPix: true, mostrarBoleto: true };
    }
    setConfig(newConfig);
    toast.success("Layout restaurado para o padrão");
  };

  const updateLayout = (campo: string, valor: any) => {
    const newConfig = { ...config };
    if (campo.includes('.')) {
      const partes = campo.split('.');
      let obj = newConfig[activeTab] as any;
      for (let i = 0; i < partes.length - 1; i++) {
        if (!obj[partes[i]]) obj[partes[i]] = {};
        obj = obj[partes[i]];
      }
      obj[partes[partes.length - 1]] = valor;
    } else {
      (newConfig[activeTab] as any)[campo] = valor;
    }
    setConfig(newConfig);
  };

  const handleColunaToggle = (colunaId: string, visivel: boolean) => {
    const newColunas = currentLayout.tabela.colunas.map(col => 
      col.id === colunaId ? { ...col, visivel } : col
    );
    updateLayout('tabela.colunas', newColunas);
  };

  const PreviewDocument = () => (
    <div className="bg-white border rounded-lg p-6 shadow-sm" style={{ transform: `scale(${zoom/100})`, transformOrigin: 'top left' }}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start gap-4 border-b-2 pb-4" style={{ borderColor: currentLayout.cores.primaria }}>
          {currentLayout.logoUrl && (
            <div className="w-[120px] h-[40px] bg-gray-100 rounded flex items-center justify-center">
              <Image className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 text-right">
            {currentLayout.cabecalho.linhas.map((linha, idx) => (
              <p key={idx} className="text-sm" style={{ fontFamily: currentLayout.fonte.titulo }}>
                {linha.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                  const previewData: any = {
                    'empresa.razao': APP_CONFIG.company.fullName,
                    'empresa.cnpj': APP_CONFIG.company.cnpj,
                    'empresa.endereco': `${APP_CONFIG.company.address.street} - ${APP_CONFIG.company.address.district}`,
                    'empresa.telefone': APP_CONFIG.company.contact.phone,
                    'empresa.email': APP_CONFIG.company.contact.email,
                    'cliente.nome': 'João Silva',
                    'cliente.cnpjCpf': '123.456.789-00',
                    'contrato.numero': 'LOC-2025-001',
                    'contrato.data': '15/01/2025',
                    'fatura.numero': 'FAT-2025-001',
                    'fatura.emissao': '15/01/2025'
                  };
                  return previewData[key] || match;
                })}
              </p>
            ))}
          </div>
        </div>

        {/* Blocos de informação */}
        <div className="grid grid-cols-2 gap-6">
          {currentLayout.blocos.empresa && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: currentLayout.cores.primaria }}>Dados da Empresa</h3>
              <div className="text-sm space-y-1" style={{ fontFamily: currentLayout.fonte.corpo }}>
                <p>{APP_CONFIG.company.fullName}</p>
                <p>CNPJ: {APP_CONFIG.company.cnpj}</p>
                <p>IE: {APP_CONFIG.company.ie}</p>
              </div>
            </div>
          )}
          
          {currentLayout.blocos.cliente && (
            <div>
              <h3 className="font-semibold mb-2" style={{ color: currentLayout.cores.primaria }}>Dados do Cliente</h3>
              <div className="text-sm space-y-1" style={{ fontFamily: currentLayout.fonte.corpo }}>
                <p>João Silva</p>
                <p>CPF: 123.456.789-00</p>
                <p>Rua A, 456 - Bairro B</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabela */}
        {currentLayout.blocos.itens && (
          <div>
            <h3 className="font-semibold mb-3" style={{ color: currentLayout.cores.primaria }}>Itens</h3>
            <table className="w-full border-collapse border">
              <thead>
                <tr style={{ backgroundColor: currentLayout.cores.primaria + '20' }}>
                  {currentLayout.tabela.colunas
                    .filter(col => col.visivel)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map(col => (
                      <th key={col.id} className="border p-2 text-left text-sm font-medium">
                        {col.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                <tr className="even:bg-gray-50">
                  {currentLayout.tabela.colunas
                    .filter(col => col.visivel)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map(col => (
                      <td key={col.id} className="border p-2 text-sm">
                        {col.id === 'descricao' ? 'Furadeira Industrial' : 
                         col.id === 'qtde' ? '2' : 
                         col.id === 'periodo' || col.id === 'unidade' ? 'Diária' : 
                         col.id === 'preco' ? 'R$ 50,00' : 
                         col.id === 'subtotal' ? 'R$ 100,00' : 
                         col.id === 'item' ? '001' : '-'}
                      </td>
                    ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Totais */}
        {currentLayout.blocos.totais && (
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ 100,00</span>
                </div>
                <div className="flex justify-between font-semibold" style={{ color: currentLayout.cores.primaria }}>
                  <span>Total:</span>
                  <span>R$ 100,00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Marca d'água */}
        {activeTab === 'fatura' && currentLayout.marcaDagua && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="text-6xl font-bold opacity-20 transform rotate-45"
              style={{ color: currentLayout.cores.secundaria }}
            >
              {currentLayout.marcaDagua}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="border-t pt-4 mt-8">
          {currentLayout.rodape.linhas.map((linha, idx) => (
            <p key={idx} className="text-xs text-center" style={{ color: currentLayout.cores.secundaria }}>
              {linha.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                const previewData: any = {
                  'empresa.email': 'contato@erplocacao.com'
                };
                return previewData[key] || match;
              })}
            </p>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="max-w-7xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Layout de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contrato">Contrato</TabsTrigger>
            <TabsTrigger value="os">Ordem de Serviço</TabsTrigger>
            <TabsTrigger value="fatura">Fatura</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Painel de Controles */}
              <div className="space-y-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6 pr-4">
                    {/* Logo */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Image className="w-4 h-4" />
                          Logo da Empresa
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" size="sm" className="w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Fazer Upload
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Tamanho recomendado: 360x120px (proporção 3:1)
                        </p>
                      </CardContent>
                    </Card>

                    {/* Cores */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Palette className="w-4 h-4" />
                          Cores
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Primária</Label>
                            <div className="flex gap-2">
                              <Input 
                                type="color" 
                                value={currentLayout.cores.primaria}
                                onChange={(e) => updateLayout('cores.primaria', e.target.value)}
                                className="w-12 h-8 p-1 rounded"
                              />
                              <Input 
                                value={currentLayout.cores.primaria}
                                onChange={(e) => updateLayout('cores.primaria', e.target.value)}
                                className="flex-1 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Secundária</Label>
                            <div className="flex gap-2">
                              <Input 
                                type="color" 
                                value={currentLayout.cores.secundaria}
                                onChange={(e) => updateLayout('cores.secundaria', e.target.value)}
                                className="w-12 h-8 p-1 rounded"
                              />
                              <Input 
                                value={currentLayout.cores.secundaria}
                                onChange={(e) => updateLayout('cores.secundaria', e.target.value)}
                                className="flex-1 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tipografia */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Type className="w-4 h-4" />
                          Tipografia
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Títulos</Label>
                            <Select value={currentLayout.fonte.titulo} onValueChange={(value) => updateLayout('fonte.titulo', value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Roboto">Roboto</SelectItem>
                                <SelectItem value="System">System</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Corpo</Label>
                            <Select value={currentLayout.fonte.corpo} onValueChange={(value) => updateLayout('fonte.corpo', value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Inter">Inter</SelectItem>
                                <SelectItem value="Roboto">Roboto</SelectItem>
                                <SelectItem value="System">System</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cabeçalho e Rodapé */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Cabeçalho & Rodapé</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-xs">Cabeçalho (até 3 linhas)</Label>
                          <div className="space-y-2">
                            {currentLayout.cabecalho.linhas.map((linha, idx) => (
                              <Input 
                                key={idx}
                                value={linha}
                                onChange={(e) => {
                                  const novasLinhas = [...currentLayout.cabecalho.linhas];
                                  novasLinhas[idx] = e.target.value;
                                  updateLayout('cabecalho.linhas', novasLinhas);
                                }}
                                placeholder={`Linha ${idx + 1} (use placeholders como {{empresa.razao}})`}
                                className="text-xs"
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Rodapé (até 2 linhas)</Label>
                          <div className="space-y-2">
                            {currentLayout.rodape.linhas.map((linha, idx) => (
                              <Input 
                                key={idx}
                                value={linha}
                                onChange={(e) => {
                                  const novasLinhas = [...currentLayout.rodape.linhas];
                                  novasLinhas[idx] = e.target.value;
                                  updateLayout('rodape.linhas', novasLinhas);
                                }}
                                placeholder={`Linha rodapé ${idx + 1}`}
                                className="text-xs"
                              />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Blocos de Layout */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Settings className="w-4 h-4" />
                          Blocos de Layout
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(currentLayout.blocos).map(([bloco, ativo]) => (
                          <div key={bloco} className="flex items-center space-x-2">
                            <Checkbox 
                              id={bloco}
                              checked={ativo}
                              onCheckedChange={(checked) => updateLayout(`blocos.${bloco}`, checked)}
                              disabled={bloco === 'empresa' || bloco === 'cliente'}
                            />
                            <Label htmlFor={bloco} className="text-xs capitalize">
                              {bloco === 'empresa' ? 'Empresa (obrigatório)' :
                               bloco === 'cliente' ? 'Cliente (obrigatório)' :
                               bloco === 'documento' ? 'Dados do Documento' :
                               bloco === 'itens' ? 'Tabela de Itens' :
                               bloco === 'totais' ? 'Resumo de Valores' :
                               bloco === 'observacoes' ? 'Observações' :
                               bloco === 'assinaturas' ? 'Campos de Assinatura' : bloco}
                            </Label>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Colunas da Tabela */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Colunas da Tabela</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {currentLayout.tabela.colunas
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((coluna) => (
                            <div key={coluna.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={coluna.id}
                                checked={coluna.visivel}
                                onCheckedChange={(checked) => handleColunaToggle(coluna.id, !!checked)}
                              />
                              <Label htmlFor={coluna.id} className="text-xs flex-1">
                                {coluna.label}
                              </Label>
                              <Badge variant="outline" className="text-xs">
                                {coluna.ordem}
                              </Badge>
                            </div>
                          ))}
                      </CardContent>
                    </Card>

                    {/* Marca d'água (apenas Fatura) */}
                    {activeTab === 'fatura' && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <FileX className="w-4 h-4" />
                            Marca d'Água
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={currentLayout.opcoes?.mostrarMarcaDemonstrativo}
                              onCheckedChange={(checked) => updateLayout('opcoes.mostrarMarcaDemonstrativo', checked)}
                            />
                            <Label className="text-xs">
                              Aplicar "DEMONSTRATIVO" em faturas sem valor fiscal
                            </Label>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Preview</h3>
                  <div className="flex items-center gap-2">
                    <Select value={zoom.toString()} onValueChange={(value) => setZoom(Number(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="75">75%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                        <SelectItem value="125">125%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Tela Cheia
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Preview - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[70vh]">
                          <PreviewDocument />
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[600px]">
                  <PreviewDocument />
                </div>
              </div>
            </div>

            {/* Placeholders Helper */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Placeholders Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {placeholders.map((grupo) => (
                    <div key={grupo.grupo}>
                      <h4 className="text-xs font-medium mb-2 text-muted-foreground">{grupo.grupo}</h4>
                      <div className="space-y-1">
                        {grupo.items.slice(0, 4).map((item) => (
                          <Badge key={item} variant="secondary" className="text-xs block w-full text-center cursor-pointer hover:bg-secondary/80"
                            onClick={() => navigator.clipboard.writeText(item)}>
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="w-4 h-4 mr-2" />
                      Versões ({currentLayout.versoes.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Gerenciar Versões</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nome da nova versão"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSalvarVersao((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <Button size="sm" onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          if (input?.value) {
                            handleSalvarVersao(input.value);
                            input.value = '';
                          }
                        }}>
                          Salvar
                        </Button>
                      </div>
                      <Separator />
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {currentLayout.versoes.map((versao) => (
                          <div key={versao.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="text-sm font-medium">{versao.nomeVersao}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(versao.criadoEm).toLocaleDateString()} - {versao.criadoPor}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReverterVersao(versao)}
                            >
                              Reverter
                            </Button>
                          </div>
                        ))}
                        {currentLayout.versoes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma versão salva
                          </p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restaurar Padrão
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restaurar Layout Padrão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá restaurar o layout para as configurações padrão. Todas as personalizações serão perdidas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestaurarPadrao}>
                        Restaurar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Button onClick={handleSave} className="min-w-24">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}