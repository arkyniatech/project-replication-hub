import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Hash, Save, TestTube, RefreshCw, Lock, Unlock, Eye, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SerieConfig {
  prefixo: string;
  template: string;
  reset: "NUNCA" | "ANUAL" | "MENSAL";
  porUnidade: boolean;
  proximo: number;
  bloqueado: boolean;
}

interface SeriesConfig {
  tipos: {
    contrato: SerieConfig;
    aditivo: SerieConfig;
    fatura: SerieConfig;
    titulo: SerieConfig;
    os: SerieConfig;
  };
  counters: Record<string, number>;
}

const tiposDocumento = [
  { key: "contrato", label: "Contrato", exemplo: "LOC" },
  { key: "aditivo", label: "Aditivo", exemplo: "ADT" },
  { key: "fatura", label: "Fatura", exemplo: "FAT" },
  { key: "titulo", label: "Título", exemplo: "TIT" },
  { key: "os", label: "Ordem de Serviço", exemplo: "OS" }
];

const templateExemplos = [
  "LOC-{YYYY}-{SEQ:5}",
  "FAT-{YY}{MM}-{SEQ:4}",
  "TIT-{UNID}-{YYYY}-{SEQ:6}",
  "OS-{YYYY}-{MM}-{SEQ:4}",
  "{YYYY}{MM}{DD}-{SEQ:6}"
];

const tokensAjuda = [
  { token: "{YYYY}", descricao: "Ano com 4 dígitos (ex: 2025)" },
  { token: "{YY}", descricao: "Ano com 2 dígitos (ex: 25)" },
  { token: "{MM}", descricao: "Mês com 2 dígitos (ex: 01)" },
  { token: "{DD}", descricao: "Dia com 2 dígitos (ex: 15)" },
  { token: "{UNID}", descricao: "Código da unidade (ex: MAIN)" },
  { token: "{SEQ:n}", descricao: "Sequência com n dígitos (ex: {SEQ:5} = 00001)" }
];

function getDefaultSeriesConfig(): SeriesConfig {
  return {
    tipos: {
      contrato: { prefixo: "LOC", template: "LOC-{YYYY}-{SEQ:5}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      aditivo: { prefixo: "ADT", template: "ADT-{YYYY}-{SEQ:4}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      fatura: { prefixo: "FAT", template: "FAT-{YYYY}-{SEQ:5}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      titulo: { prefixo: "TIT", template: "TIT-{YYYY}-{SEQ:5}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      os: { prefixo: "OS", template: "OS-{YYYY}-{MM}-{SEQ:4}", reset: "MENSAL", porUnidade: false, proximo: 1, bloqueado: true }
    },
    counters: {}
  };
}

function generateCounterKey(tipo: string, config: SerieConfig, unidade: string = "MAIN"): string {
  const now = new Date();
  let key = tipo;
  
  if (config.porUnidade) {
    key += `|${unidade}`;
  }
  
  if (config.reset === "ANUAL") {
    key += `|${now.getFullYear()}`;
  } else if (config.reset === "MENSAL") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    key += `|${year}${month}`;
  }
  
  return key;
}

function generatePreview(config: SerieConfig, contador: number = 1, unidade: string = "MAIN"): string {
  const now = new Date();
  const tokens: Record<string, string> = {
    '{YYYY}': now.getFullYear().toString(),
    '{YY}': now.getFullYear().toString().slice(-2),
    '{MM}': String(now.getMonth() + 1).padStart(2, '0'),
    '{DD}': String(now.getDate()).padStart(2, '0'),
    '{UNID}': unidade
  };
  
  let preview = config.prefixo + config.template;
  
  // Substituir tokens normais
  Object.entries(tokens).forEach(([token, value]) => {
    preview = preview.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  // Substituir {SEQ:n}
  preview = preview.replace(/{SEQ:(\d+)}/g, (match, digits) => {
    return String(contador).padStart(parseInt(digits), '0');
  });
  
  return preview;
}

function validateTemplate(template: string): { valid: boolean; error?: string } {
  if (!template) {
    return { valid: false, error: "Template é obrigatório" };
  }
  
  if (!/{SEQ:\d+}/.test(template)) {
    return { valid: false, error: "Template deve conter ao menos um {SEQ:n}" };
  }
  
  const validTokens = ['{YYYY}', '{YY}', '{MM}', '{DD}', '{UNID}'];
  const tokenPattern = /{([^}]+)}/g;
  let match;
  
  while ((match = tokenPattern.exec(template)) !== null) {
    const token = `{${match[1]}}`;
    if (!validTokens.includes(token) && !token.match(/^{SEQ:\d+}$/)) {
      return { valid: false, error: `Token inválido: ${token}` };
    }
  }
  
  return { valid: true };
}

function validatePrefixo(prefixo: string): { valid: boolean; error?: string } {
  if (!prefixo) {
    return { valid: false, error: "Prefixo é obrigatório" };
  }
  
  if (!/^[A-Z0-9\-_]+$/i.test(prefixo)) {
    return { valid: false, error: "Prefixo deve conter apenas A-Z, 0-9, - e _" };
  }
  
  return { valid: true };
}

export function NumeracaoSeriesForm() {
  const [config, setConfig] = useState<SeriesConfig>(getDefaultSeriesConfig());
  const [editedRows, setEditedRows] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<Record<string, string[]>>({});
  const [showTokensHelp, setShowTokensHelp] = useState(false);

  useEffect(() => {
    // Carregar configuração do localStorage
    const saved = localStorage.getItem('config.series');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...getDefaultSeriesConfig(), ...parsed });
      } catch {
        // Usar padrão se houver erro
      }
    }
  }, []);

  const salvarConfig = () => {
    try {
      localStorage.setItem('config.series', JSON.stringify(config));
      setEditedRows(new Set());
      toast.success("Configurações de numeração salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações de numeração");
    }
  };

  const salvarLinha = (tipo: string) => {
    const newEditedRows = new Set(editedRows);
    newEditedRows.delete(tipo);
    setEditedRows(newEditedRows);
    
    try {
      localStorage.setItem('config.series', JSON.stringify(config));
      toast.success(`Configuração de ${tiposDocumento.find(t => t.key === tipo)?.label} salva!`);
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    }
  };

  const updateTipoConfig = (tipo: string, field: keyof SerieConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      tipos: {
        ...prev.tipos,
        [tipo]: {
          ...prev.tipos[tipo as keyof typeof prev.tipos],
          [field]: value
        }
      }
    }));
    
    setEditedRows(prev => new Set([...prev, tipo]));
  };

  const testar10Previas = (tipo: string) => {
    const tipoConfig = config.tipos[tipo as keyof typeof config.tipos];
    const previas = [];
    
    for (let i = 1; i <= 10; i++) {
      previas.push(generatePreview(tipoConfig, i));
    }
    
    setPreviews(prev => ({ ...prev, [tipo]: previas }));
  };

  const sincronizar = (tipo: string) => {
    // Simular sincronização - em produção buscaria documentos existentes
    const tipoConfig = config.tipos[tipo as keyof typeof config.tipos];
    const novoProximo = Math.floor(Math.random() * 50) + 1; // Mock
    
    updateTipoConfig(tipo, 'proximo', novoProximo);
    toast.success(`Sincronizado: próximo número será ${novoProximo}`);
  };

  const validarPadroes = () => {
    let erros = 0;
    
    Object.entries(config.tipos).forEach(([tipo, tipoConfig]) => {
      const prefixoVal = validatePrefixo(tipoConfig.prefixo);
      const templateVal = validateTemplate(tipoConfig.template);
      
      if (!prefixoVal.valid || !templateVal.valid) {
        erros++;
        const tipoLabel = tiposDocumento.find(t => t.key === tipo)?.label || tipo;
        toast.error(`${tipoLabel}: ${prefixoVal.error || templateVal.error}`);
      }
    });
    
    if (erros === 0) {
      toast.success("Todos os padrões são válidos!");
    }
  };

  const reverterNaoSalvos = () => {
    const saved = localStorage.getItem('config.series');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({ ...getDefaultSeriesConfig(), ...parsed });
        setEditedRows(new Set());
        toast.info("Alterações não salvas foram revertidas");
      } catch {
        setConfig(getDefaultSeriesConfig());
      }
    } else {
      setConfig(getDefaultSeriesConfig());
    }
  };

  return (
    <TooltipProvider>
      <Card className="max-w-7xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            Numeração & Séries
          </CardTitle>
          <CardDescription>
            Configure padrões de numeração para contratos, faturas, aditivos e outros documentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ações Globais */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={salvarConfig} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Tudo
            </Button>
            <Button onClick={validarPadroes} variant="outline" className="gap-2">
              <TestTube className="w-4 h-4" />
              Validar Padrões
            </Button>
            <Button onClick={reverterNaoSalvos} variant="outline" disabled={editedRows.size === 0}>
              Reverter não salvos
            </Button>
            
            <Dialog open={showTokensHelp} onOpenChange={setShowTokensHelp}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Ajuda com Tokens
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tokens Disponíveis</DialogTitle>
                  <DialogDescription>
                    Use estes tokens para criar seus templates de numeração
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {tokensAjuda.map((item) => (
                    <div key={item.token} className="flex items-start gap-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {item.token}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{item.descricao}</span>
                    </div>
                  ))}
                </div>
                <Alert>
                  <AlertDescription>
                    <strong>Obrigatório:</strong> Todo template deve conter ao menos um token {"{SEQ:n}"} onde "n" é o número de dígitos.
                  </AlertDescription>
                </Alert>
              </DialogContent>
            </Dialog>
          </div>

          {/* Exemplos de Templates */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exemplos de templates:</Label>
            <div className="flex flex-wrap gap-2">
              {templateExemplos.map((exemplo) => (
                <Badge key={exemplo} variant="outline" className="cursor-pointer font-mono text-xs">
                  {exemplo}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tabela de Configurações */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Reset</TableHead>
                  <TableHead>Por Unidade</TableHead>
                  <TableHead>Próximo Nº</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposDocumento.map((tipo) => {
                  const tipoConfig = config.tipos[tipo.key as keyof typeof config.tipos];
                  const isEdited = editedRows.has(tipo.key);
                  const preview = generatePreview(tipoConfig, tipoConfig.proximo);
                  
                  return (
                    <TableRow key={tipo.key} className={isEdited ? "bg-yellow-50" : ""}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{tipo.label}</div>
                          <div className="text-xs text-muted-foreground">({tipo.exemplo})</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          value={tipoConfig.prefixo}
                          onChange={(e) => updateTipoConfig(tipo.key, 'prefixo', e.target.value.toUpperCase())}
                          className="w-20 text-center font-mono"
                          maxLength={10}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          value={tipoConfig.template}
                          onChange={(e) => updateTipoConfig(tipo.key, 'template', e.target.value)}
                          className="min-w-[200px] font-mono text-xs"
                          placeholder="Ex: {YYYY}-{SEQ:5}"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={tipoConfig.reset}
                          onValueChange={(value) => updateTipoConfig(tipo.key, 'reset', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NUNCA">Nunca</SelectItem>
                            <SelectItem value="ANUAL">Anual</SelectItem>
                            <SelectItem value="MENSAL">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        <Switch
                          checked={tipoConfig.porUnidade}
                          onCheckedChange={(checked) => updateTipoConfig(tipo.key, 'porUnidade', checked)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={tipoConfig.proximo}
                            onChange={(e) => updateTipoConfig(tipo.key, 'proximo', parseInt(e.target.value) || 1)}
                            className="w-20 text-center"
                            min={1}
                            disabled={tipoConfig.bloqueado}
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateTipoConfig(tipo.key, 'bloqueado', !tipoConfig.bloqueado)}
                              >
                                {tipoConfig.bloqueado ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {tipoConfig.bloqueado ? "Desbloquear edição" : "Bloquear após uso"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {preview}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testar10Previas(tipo.key)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => salvarLinha(tipo.key)}
                            disabled={!isEdited}
                            className="gap-1"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sincronizar(tipo.key)}
                            className="gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Preview de 10 números */}
          {Object.entries(previews).map(([tipo, nums]) => (
            <Alert key={tipo} className="mt-4">
              <AlertDescription>
                <strong>10 prévias para {tiposDocumento.find(t => t.key === tipo)?.label}:</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nums.map((num, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">
                      {num}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setPreviews(prev => ({ ...prev, [tipo]: [] }))}
                >
                  Fechar
                </Button>
              </AlertDescription>
            </Alert>
          ))}

          {editedRows.size > 0 && (
            <Alert>
              <AlertDescription>
                Há alterações não salvas em {editedRows.size} tipo(s). Clique em "Salvar Tudo" ou salve individualmente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}