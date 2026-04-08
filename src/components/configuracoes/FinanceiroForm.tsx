import { useState, useEffect } from "react";
import { DollarSign, CreditCard, Building, FileText, Plus, Minus, Info, Save, GripVertical, QrCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CentrosCustoForm } from "./CentrosCustoForm";
import { AntiDuplicityConfig } from "@/types";
import { getDefaultAntiDuplicityConfig } from "@/lib/anti-duplicity-utils";
import { InterConfigForm } from "@/components/bolepix/InterConfigForm";

interface ContaBancaria {
  id: string;
  apelido: string;
  bancoNome: string;
  agencia: string;
  conta: string;
  tipo: "Corrente" | "Poupança";
}

interface ConfigFinanceiro {
  formas: {
    ativas: string[];
    preferenciaPadrao: string;
    ordem: string[];
  };
  multaJuros: {
    multaPercent: number;
    jurosDiaPercent: number;
    carenciaDias: number;
    arredondamento: number;
    mensagemPadrao: string;
  };
  contas: {
    bancos: ContaBancaria[];
    chavePix: string;
    instrucaoTransferencia: string;
    mostrarNaFatura: boolean;
  };
  faturaPreferencias: {
    tipoPadrao: "DEMONSTRATIVO" | "FISCAL_MOCK";
    vencimentoPadraoDias: number;
    mostrarQrPix: boolean;
    mostrarLinhaBoleto: boolean;
    mensagemCobrancaPadrao: string;
  };
  antiDuplicidade: AntiDuplicityConfig;
}

const formasDisponiveis = [
  { id: "PIX", nome: "PIX" },
  { id: "Boleto", nome: "Boleto" },
  { id: "Cartão", nome: "Cartão" },
  { id: "Dinheiro", nome: "Dinheiro" },
  { id: "Transferência", nome: "Transferência" }
];

const vencimentoOpcoes = [
  { value: 0, label: "À vista" },
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 21, label: "21 dias" },
  { value: 30, label: "30 dias" }
];

export function FinanceiroForm() {
  const [config, setConfig] = useState<ConfigFinanceiro>({
    formas: {
      ativas: ["PIX", "Boleto", "Cartão", "Dinheiro", "Transferência"],
      preferenciaPadrao: "PIX",
      ordem: ["PIX", "Boleto", "Cartão", "Dinheiro", "Transferência"]
    },
    multaJuros: {
      multaPercent: 2,
      jurosDiaPercent: 0.033,
      carenciaDias: 0,
      arredondamento: 2,
      mensagemPadrao: "Após o vencimento, será cobrada multa de {{multaPercent}}% e juros de {{jurosDiaPercent}}% ao dia."
    },
    contas: {
      bancos: [],
      chavePix: "",
      instrucaoTransferencia: "Favor enviar comprovante após a transferência.",
      mostrarNaFatura: true
    },
    faturaPreferencias: {
      tipoPadrao: "DEMONSTRATIVO",
      vencimentoPadraoDias: 7,
      mostrarQrPix: true,
      mostrarLinhaBoleto: true,
      mensagemCobrancaPadrao: "Prezado(a) {{cliente}}, seu contrato {{numeroContrato}} vence em {{dataVencimento}}. Valor: {{valorDevido}}. Acesse: {{link2aVia}}"
    },
    antiDuplicidade: getDefaultAntiDuplicityConfig()
  });

  const [novaConta, setNovaConta] = useState({
    apelido: "",
    bancoNome: "",
    agencia: "",
    conta: "",
    tipo: "Corrente" as "Corrente" | "Poupança"
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Carregar configurações salvas
  useEffect(() => {
    const savedConfig = localStorage.getItem('config.financeiro');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Detectar mudanças
  useEffect(() => {
    const originalConfig = localStorage.getItem('config.financeiro');
    const currentConfigString = JSON.stringify(config);
    setHasChanges(currentConfigString !== (originalConfig || JSON.stringify({
      formas: {
        ativas: ["PIX", "Boleto", "Cartão", "Dinheiro", "Transferência"],
        preferenciaPadrao: "PIX",
        ordem: ["PIX", "Boleto", "Cartão", "Dinheiro", "Transferência"]
      },
      multaJuros: {
        multaPercent: 2,
        jurosDiaPercent: 0.033,
        carenciaDias: 0,
        arredondamento: 2,
        mensagemPadrao: "Após o vencimento, será cobrada multa de {{multaPercent}}% e juros de {{jurosDiaPercent}}% ao dia."
      },
      contas: {
        bancos: [],
        chavePix: "",
        instrucaoTransferencia: "Favor enviar comprovante após a transferência.",
        mostrarNaFatura: true
      },
      faturaPreferencias: {
        tipoPadrao: "DEMONSTRATIVO",
        vencimentoPadraoDias: 7,
        mostrarQrPix: true,
        mostrarLinhaBoleto: true,
        mensagemCobrancaPadrao: "Prezado(a) {{cliente}}, seu contrato {{numeroContrato}} vence em {{dataVencimento}}. Valor: {{valorDevido}}. Acesse: {{link2aVia}}"
      },
      antiDuplicidade: getDefaultAntiDuplicityConfig()
    })));
  }, [config]);

  const handleSalvarTudo = () => {
    // Validações
    if (config.formas.ativas.length === 0) {
      toast.error("Pelo menos uma forma de pagamento deve estar ativa");
      return;
    }

    if (config.multaJuros.multaPercent < 0 || config.multaJuros.multaPercent > 20) {
      toast.error("Multa deve estar entre 0% e 20%");
      return;
    }

    if (config.multaJuros.jurosDiaPercent < 0 || config.multaJuros.jurosDiaPercent > 1) {
      toast.error("Juros ao dia deve estar entre 0% e 1%");
      return;
    }

    localStorage.setItem('config.financeiro', JSON.stringify(config));
    setHasChanges(false);
    toast.success("Configurações financeiras salvas com sucesso!");
  };

  const handleReverter = () => {
    const savedConfig = localStorage.getItem('config.financeiro');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
    setHasChanges(false);
    toast.info("Alterações revertidas");
  };

  const toggleFormaAtiva = (forma: string) => {
    setConfig(prev => ({
      ...prev,
      formas: {
        ...prev.formas,
        ativas: prev.formas.ativas.includes(forma)
          ? prev.formas.ativas.filter(f => f !== forma)
          : [...prev.formas.ativas, forma]
      }
    }));
  };

  const adicionarConta = () => {
    if (!novaConta.apelido || !novaConta.bancoNome) {
      toast.error("Preencha pelo menos o apelido e nome do banco");
      return;
    }

    const conta: ContaBancaria = {
      id: Date.now().toString(),
      ...novaConta
    };

    setConfig(prev => ({
      ...prev,
      contas: {
        ...prev.contas,
        bancos: [...prev.contas.bancos, conta]
      }
    }));

    setNovaConta({
      apelido: "",
      bancoNome: "",
      agencia: "",
      conta: "",
      tipo: "Corrente"
    });

    toast.success("Conta bancária adicionada");
  };

  const removerConta = (id: string) => {
    setConfig(prev => ({
      ...prev,
      contas: {
        ...prev.contas,
        bancos: prev.contas.bancos.filter(b => b.id !== id)
      }
    }));
    toast.success("Conta removida");
  };

  const renderPreviewMensagem = (template: string) => {
    return template
      .replace(/{{multaPercent}}/g, config.multaJuros.multaPercent.toString())
      .replace(/{{jurosDiaPercent}}/g, config.multaJuros.jurosDiaPercent.toString())
      .replace(/{{cliente}}/g, "João Silva Ltda")
      .replace(/{{numeroContrato}}/g, "LOC-2025-00123")
      .replace(/{{dataVencimento}}/g, "25/01/2025")
      .replace(/{{valorDevido}}/g, "R$ 1.500,00")
      .replace(/{{valorComJuros}}/g, "R$ 1.530,00")
      .replace(/{{link2aVia}}/g, "https://app.locacao.com/fatura/123");
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Barra de Ações Fixa */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 -mx-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Configurações Financeiras</h2>
              {hasChanges && <Badge variant="secondary">Alterações não salvas</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button variant="outline" onClick={handleReverter} size="sm">
                  Reverter Não Salvos
                </Button>
              )}
              <Button onClick={handleSalvarTudo} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Salvar Tudo
              </Button>
            </div>
          </div>
        </div>

        {/* Centros de Custo */}
        <CentrosCustoForm className="mb-6" />

        {/* Cards em Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* A) Formas de Pagamento Padrão */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Formas de Pagamento Padrão
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Configura as formas disponíveis no modal de recebimento e preferência padrão</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Define quais formas estarão disponíveis e a ordem de exibição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Formas Ativas</Label>
                <div className="mt-2 space-y-2">
                  {formasDisponiveis.map((forma) => (
                    <div key={forma.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={forma.id}
                        checked={config.formas.ativas.includes(forma.id)}
                        onCheckedChange={() => toggleFormaAtiva(forma.id)}
                      />
                      <Label htmlFor={forma.id} className="text-sm">{forma.nome}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="preferencia-padrao">Preferência Padrão</Label>
                <Select 
                  value={config.formas.preferenciaPadrao} 
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    formas: { ...prev.formas, preferenciaPadrao: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.formas.ativas.map((forma) => (
                      <SelectItem key={forma} value={forma}>{forma}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.formas.ativas.length === 0 && (
                <Alert>
                  <AlertDescription>
                    Pelo menos uma forma de pagamento deve estar ativa.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* B) Políticas de Multa/Juros */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Políticas de Multa/Juros
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usado no Aging e cálculo de valores em atraso</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Configura cálculos de inadimplência e mensagens padrão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="multa-percent">Multa fixa (%)</Label>
                  <Input
                    id="multa-percent"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={config.multaJuros.multaPercent}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      multaJuros: { ...prev.multaJuros, multaPercent: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="juros-dia">Juros ao dia (%)</Label>
                  <Input
                    id="juros-dia"
                    type="number"
                    min="0"
                    max="1"
                    step="0.001"
                    value={config.multaJuros.jurosDiaPercent}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      multaJuros: { ...prev.multaJuros, jurosDiaPercent: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carencia-dias">Carência (dias)</Label>
                  <Input
                    id="carencia-dias"
                    type="number"
                    min="0"
                    max="30"
                    value={config.multaJuros.carenciaDias}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      multaJuros: { ...prev.multaJuros, carenciaDias: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="arredondamento">Arredondamento</Label>
                  <Select 
                    value={config.multaJuros.arredondamento.toString()}
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      multaJuros: { ...prev.multaJuros, arredondamento: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 casas decimais</SelectItem>
                      <SelectItem value="0">Sem decimais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="mensagem-padrao">Mensagem padrão sobre multa/juros</Label>
                <Textarea
                  id="mensagem-padrao"
                  placeholder="Use {{multaPercent}} e {{jurosDiaPercent}} como placeholders"
                  value={config.multaJuros.mensagemPadrao}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    multaJuros: { ...prev.multaJuros, mensagemPadrao: e.target.value }
                  }))}
                  rows={3}
                />
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Preview:</strong> {renderPreviewMensagem(config.multaJuros.mensagemPadrao)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* C) Contas Bancárias & PIX */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Contas Bancárias & PIX
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dados exibidos em faturas e instruções de pagamento</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Informações para exibir em documentos fiscais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="mostrar-na-fatura"
                  checked={config.contas.mostrarNaFatura}
                  onCheckedChange={(checked) => setConfig(prev => ({
                    ...prev,
                    contas: { ...prev.contas, mostrarNaFatura: checked }
                  }))}
                />
                <Label htmlFor="mostrar-na-fatura">Mostrar dados bancários na Fatura</Label>
              </div>

              <div>
                <Label htmlFor="chave-pix">Chave PIX</Label>
                <Input
                  id="chave-pix"
                  placeholder="email@exemplo.com ou CPF/CNPJ"
                  value={config.contas.chavePix}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    contas: { ...prev.contas, chavePix: e.target.value }
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="instrucao-transferencia">Instruções de Transferência</Label>
                <Textarea
                  id="instrucao-transferencia"
                  placeholder="Instruções para pagamento via transferência..."
                  value={config.contas.instrucaoTransferencia}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    contas: { ...prev.contas, instrucaoTransferencia: e.target.value }
                  }))}
                  rows={2}
                />
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Contas Bancárias</Label>
                <div className="mt-2 space-y-2">
                  {config.contas.bancos.map((banco) => (
                    <div key={banco.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{banco.apelido}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {banco.bancoNome} - Ag: {banco.agencia} / Cc: {banco.conta}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removerConta(banco.id)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adicionar Nova Conta */}
              <div className="space-y-2 p-3 border rounded bg-muted/30">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Apelido"
                    value={novaConta.apelido}
                    onChange={(e) => setNovaConta(prev => ({ ...prev, apelido: e.target.value }))}
                  />
                  <Input
                    placeholder="Nome do Banco"
                    value={novaConta.bancoNome}
                    onChange={(e) => setNovaConta(prev => ({ ...prev, bancoNome: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Agência"
                    value={novaConta.agencia}
                    onChange={(e) => setNovaConta(prev => ({ ...prev, agencia: e.target.value }))}
                  />
                  <Input
                    placeholder="Conta"
                    value={novaConta.conta}
                    onChange={(e) => setNovaConta(prev => ({ ...prev, conta: e.target.value }))}
                  />
                  <Select 
                    value={novaConta.tipo}
                    onValueChange={(value: "Corrente" | "Poupança") => setNovaConta(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corrente">Corrente</SelectItem>
                      <SelectItem value="Poupança">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={adicionarConta} size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Conta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* D) Preferências de Fatura & 2ª Via */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Preferências de Fatura & 2ª Via
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Configurações padrão para emissão e envio de faturas</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Defaults para emissão e configurações de cobrança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tipo-padrao">Tipo padrão de Fatura</Label>
                <Select 
                  value={config.faturaPreferencias.tipoPadrao}
                  onValueChange={(value: "DEMONSTRATIVO" | "FISCAL_MOCK") => setConfig(prev => ({
                    ...prev,
                    faturaPreferencias: { ...prev.faturaPreferencias, tipoPadrao: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEMONSTRATIVO">Sem valor fiscal (demonstrativo)</SelectItem>
                    <SelectItem value="FISCAL_MOCK">Com valor fiscal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vencimento-padrao">Vencimento padrão</Label>
                <Select 
                  value={config.faturaPreferencias.vencimentoPadraoDias.toString()}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    faturaPreferencias: { ...prev.faturaPreferencias, vencimentoPadraoDias: parseInt(value) }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vencimentoOpcoes.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value.toString()}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mostrar-qr-pix"
                    checked={config.faturaPreferencias.mostrarQrPix}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      faturaPreferencias: { ...prev.faturaPreferencias, mostrarQrPix: checked }
                    }))}
                  />
                  <Label htmlFor="mostrar-qr-pix">Mostrar QR PIX quando forma = PIX</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="mostrar-linha-boleto"
                    checked={config.faturaPreferencias.mostrarLinhaBoleto}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      faturaPreferencias: { ...prev.faturaPreferencias, mostrarLinhaBoleto: checked }
                    }))}
                  />
                  <Label htmlFor="mostrar-linha-boleto">Mostrar linha digitável quando forma = Boleto</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="mensagem-cobranca">Mensagem padrão de cobrança</Label>
                <Textarea
                  id="mensagem-cobranca"
                  placeholder="Use placeholders como {{cliente}}, {{numeroContrato}}, etc."
                  value={config.faturaPreferencias.mensagemCobrancaPadrao}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    faturaPreferencias: { ...prev.faturaPreferencias, mensagemCobrancaPadrao: e.target.value }
                  }))}
                  rows={3}
                />
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Preview:</strong> {renderPreviewMensagem(config.faturaPreferencias.mensagemCobrancaPadrao)}
                </div>
              </div>

              {(!config.contas.chavePix || config.contas.bancos.length === 0) && (
                <Alert>
                  <AlertDescription>
                    Para usar PIX/Boleto, configure chave PIX e contas bancárias acima (dados mock).
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seção Banco Inter / BolePix */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Integração Banco Inter (BolePix)
            </CardTitle>
            <CardDescription>
              Configure credenciais e parâmetros para emissão de boletos com PIX via Banco Inter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InterConfigForm />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}