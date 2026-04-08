import { useState, useEffect } from "react";
// Configurações de parametrizações de locação
import { Settings, FileText, Truck, Wrench, Calculator, Zap, Plus, Minus, Info, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { ConfiguracaoLocacao, JanelaLogistica, ZonaFrete } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

const defaultConfig: ConfiguracaoLocacao = {
  contrato: {
    renovacao: {
      modo: 'MANUAL',
      duracaoPadrao: 30,
      bloqueioInadimplente: true
    },
    substituicao: {
      mesmoGrupo: true,
      preservarPreco: true
    },
    devolucao: {
      parcial: true,
      liberaEstoque: true,
      toleranciaHoras: 2
    },
    checklist: {
      entregaObrigatoria: true,
      retornoObrigatorio: true,
      itensObrigatorios: ['Fotos', 'Assinatura']
    },
    bloqueios: {
      novosContratosSeInadimplente: true,
      wizardAviso: true
    }
  },
  logistica: {
    janelas: [
      { nome: 'Manhã', inicio: '08:00', fim: '12:00' },
      { nome: 'Tarde', inicio: '13:00', fim: '18:00' }
    ],
    prazoMinHoras: 4,
    toleranciaInicioMin: 30,
    toleranciaFimMin: 30,
    responsavelObrigatorio: true,
    comprovanteDigital: true,
    fretePorZona: {
      habilitado: false,
      tabela: [{ zona: 'A', valor: 0 }]
    }
  },
  manutencao: {
    status: ['Aberta', 'Em Execução', 'Testes', 'Liberada', 'Cancelada'],
    transicoes: {
      'Aberta': ['Em Execução', 'Cancelada'],
      'Em Execução': ['Testes', 'Cancelada'],
      'Testes': ['Liberada', 'Em Execução'],
      'Liberada': [],
      'Cancelada': []
    },
    motivosParada: ['Peça aguardando', 'Dano identificado'],
    exigirFotoLaudo: true,
    acaoRapidaEquip: true
  },
  prorata: {
    metodo: 'DIARIA_EXATA',
    arredondamento: 2,
    faturamentoParcial: {
      permitir: true,
      adicionarDiferencas: true
    },
    multaPercent: 2,
    jurosDiaPercent: 0.033
  },
  automacao: {
    renovacaoAviso: true,
    devolucaoFatura: true,
    quitaDesbloqueio: true,
    recebimentoFocaCaixa: true,
    snackbarProximoPasso: true
  }
};

export function ParametrizacoesLocacaoForm() {
  const { can } = usePermissions();
  const [config, setConfig] = useState<ConfiguracaoLocacao>(defaultConfig);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const canEdit = can('configuracoes', 'gerirConfiguracoes');

  // Carregar configuração do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('erp-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        if (parsedConfig.locacao) {
          setConfig({ ...defaultConfig, ...parsedConfig.locacao });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de locação:', error);
    }
  }, []);

  const validateConfig = (configToValidate: ConfiguracaoLocacao): string[] => {
    const errors: string[] = [];

    // Validar tolerância de horas
    if (configToValidate.contrato.devolucao.toleranciaHoras < 0 || configToValidate.contrato.devolucao.toleranciaHoras > 24) {
      errors.push('Tolerância de devolução deve estar entre 0 e 24 horas');
    }

    // Validar prazo mínimo
    if (configToValidate.logistica.prazoMinHoras < 0 || configToValidate.logistica.prazoMinHoras > 168) {
      errors.push('Prazo mínimo deve estar entre 0 e 168 horas (7 dias)');
    }

    // Validar tolerâncias
    if (configToValidate.logistica.toleranciaInicioMin < 0 || configToValidate.logistica.toleranciaInicioMin > 120) {
      errors.push('Tolerância de início deve estar entre 0 e 120 minutos');
    }

    if (configToValidate.logistica.toleranciaFimMin < 0 || configToValidate.logistica.toleranciaFimMin > 120) {
      errors.push('Tolerância de fim deve estar entre 0 e 120 minutos');
    }

    // Validar multa e juros
    if (configToValidate.prorata.multaPercent < 0 || configToValidate.prorata.multaPercent > 20) {
      errors.push('Multa deve estar entre 0% e 20%');
    }

    if (configToValidate.prorata.jurosDiaPercent < 0 || configToValidate.prorata.jurosDiaPercent > 1) {
      errors.push('Juros ao dia deve estar entre 0% e 1%');
    }

    // Validar janelas
    configToValidate.logistica.janelas.forEach((janela, index) => {
      if (!janela.nome.trim()) {
        errors.push(`Janela ${index + 1}: nome é obrigatório`);
      }
      if (!janela.inicio || !janela.fim) {
        errors.push(`Janela ${index + 1}: horários são obrigatórios`);
      }
    });

    return errors;
  };

  const updateConfig = (updates: Partial<ConfiguracaoLocacao>) => {
    const newConfig = {
      ...config,
      ...updates,
      // Deep merge for nested objects
      contrato: { ...config.contrato, ...updates.contrato },
      logistica: { ...config.logistica, ...updates.logistica },
      manutencao: { ...config.manutencao, ...updates.manutencao },
      prorata: { ...config.prorata, ...updates.prorata },
      automacao: { ...config.automacao, ...updates.automacao }
    };
    
    setConfig(newConfig);
    setHasUnsavedChanges(true);
    
    // Validar em tempo real
    const errors = validateConfig(newConfig);
    setValidationErrors(errors);
  };

  const saveConfig = () => {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error("Configuração inválida", {
        description: `${errors.length} erro(s) encontrado(s). Corrija antes de salvar.`
      });
      return;
    }

    try {
      const stored = localStorage.getItem('erp-config') || '{}';
      const appConfig = JSON.parse(stored);
      appConfig.locacao = config;
      localStorage.setItem('erp-config', JSON.stringify(appConfig));
      
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      toast.success("Configurações salvas", {
        description: "As parametrizações de locação foram atualizadas."
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar", {
        description: "Ocorreu um erro ao salvar as configurações."
      });
    }
  };

  const revertChanges = () => {
    try {
      const stored = localStorage.getItem('erp-config');
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        if (parsedConfig.locacao) {
          setConfig({ ...defaultConfig, ...parsedConfig.locacao });
        } else {
          setConfig(defaultConfig);
        }
      } else {
        setConfig(defaultConfig);
      }
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    } catch (error) {
      console.error('Erro ao reverter:', error);
    }
  };

  // Helpers para janelas
  const addJanela = () => {
    const newJanela: JanelaLogistica = { nome: '', inicio: '09:00', fim: '17:00' };
    updateConfig({
      logistica: {
        ...config.logistica,
        janelas: [...config.logistica.janelas, newJanela]
      }
    });
  };

  const removeJanela = (index: number) => {
    if (config.logistica.janelas.length <= 1) return;
    updateConfig({
      logistica: {
        ...config.logistica,
        janelas: config.logistica.janelas.filter((_, i) => i !== index)
      }
    });
  };

  const updateJanela = (index: number, updates: Partial<JanelaLogistica>) => {
    const newJanelas = [...config.logistica.janelas];
    newJanelas[index] = { ...newJanelas[index], ...updates };
    updateConfig({
      logistica: {
        ...config.logistica,
        janelas: newJanelas
      }
    });
  };

  // Helpers para zonas de frete
  const addZona = () => {
    const newZona: ZonaFrete = { zona: '', valor: 0 };
    updateConfig({
      logistica: {
        ...config.logistica,
        fretePorZona: {
          ...config.logistica.fretePorZona,
          tabela: [...config.logistica.fretePorZona.tabela, newZona]
        }
      }
    });
  };

  const removeZona = (index: number) => {
    if (config.logistica.fretePorZona.tabela.length <= 1) return;
    updateConfig({
      logistica: {
        ...config.logistica,
        fretePorZona: {
          ...config.logistica.fretePorZona,
          tabela: config.logistica.fretePorZona.tabela.filter((_, i) => i !== index)
        }
      }
    });
  };

  const updateZona = (index: number, updates: Partial<ZonaFrete>) => {
    const newZonas = [...config.logistica.fretePorZona.tabela];
    newZonas[index] = { ...newZonas[index], ...updates };
    updateConfig({
      logistica: {
        ...config.logistica,
        fretePorZona: {
          ...config.logistica.fretePorZona,
          tabela: newZonas
        }
      }
    });
  };

  if (!canEdit) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              Você não tem permissão para editar as parametrizações de locação.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="sticky top-4 z-10 flex items-center justify-between p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Parametrizações de Locação</span>
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Alterações não salvas
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={revertChanges}
              disabled={!hasUnsavedChanges}
            >
              Reverter
            </Button>
            <Button 
              size="sm" 
              onClick={saveConfig}
              disabled={validationErrors.length > 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Tudo
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">{validationErrors.length} erro(s) encontrado(s):</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* A) Regras de Contrato */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Regras de Contrato
            </CardTitle>
              <CardDescription>
                Configurações para renovação, substituição e devolução
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Renovação */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Renovação
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="renovacao-modo">Modo</Label>
                    <Select
                      value={config.contrato.renovacao.modo}
                      onValueChange={(value: 'MANUAL' | 'ASSISTIDA') => 
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            renovacao: { ...config.contrato.renovacao, modo: value }
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual</SelectItem>
                        <SelectItem value="ASSISTIDA">Automática assistida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renovacao-duracao">Duração padrão (dias)</Label>
                    <Select
                      value={config.contrato.renovacao.duracaoPadrao.toString()}
                      onValueChange={(value) => 
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            renovacao: { 
                              ...config.contrato.renovacao, 
                              duracaoPadrao: parseInt(value) as 7 | 21 | 30
                            }
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="21">21 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="renovacao-bloqueio">Bloquear renovar se inadimplente</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Integra com regra "Pagar e Renovar" das automações</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    id="renovacao-bloqueio"
                    checked={config.contrato.renovacao.bloqueioInadimplente}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        contrato: {
                          ...config.contrato,
                          renovacao: { ...config.contrato.renovacao, bloqueioInadimplente: checked }
                        }
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Substituição */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Substituição
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="substituicao-grupo">Permitir somente dentro do mesmo grupo</Label>
                    <Switch
                      id="substituicao-grupo"
                      checked={config.contrato.substituicao.mesmoGrupo}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            substituicao: { ...config.contrato.substituicao, mesmoGrupo: checked }
                          }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="substituicao-preco">Preservar preço do grupo na troca</Label>
                    <Switch
                      id="substituicao-preco"
                      checked={config.contrato.substituicao.preservarPreco}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            substituicao: { ...config.contrato.substituicao, preservarPreco: checked }
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Devolução */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Devolução
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="devolucao-parcial">Permitir devolução parcial</Label>
                    <Switch
                      id="devolucao-parcial"
                      checked={config.contrato.devolucao.parcial}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            devolucao: { ...config.contrato.devolucao, parcial: checked }
                          }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="devolucao-estoque">Liberar estoque imediatamente</Label>
                    <Switch
                      id="devolucao-estoque"
                      checked={config.contrato.devolucao.liberaEstoque}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            devolucao: { ...config.contrato.devolucao, liberaEstoque: checked }
                          }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="devolucao-tolerancia">Tolerância de atraso (horas)</Label>
                    <Input
                      id="devolucao-tolerancia"
                      type="number"
                      min="0"
                      max="24"
                      value={config.contrato.devolucao.toleranciaHoras}
                      onChange={(e) =>
                        updateConfig({
                          contrato: {
                            ...config.contrato,
                            devolucao: { 
                              ...config.contrato.devolucao, 
                              toleranciaHoras: parseInt(e.target.value) || 0 
                            }
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* B) SLA de Logística */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="w-5 h-5 text-primary" />
                SLA de Logística
              </CardTitle>
              <CardDescription>
                Janelas, prazos e políticas de entrega/retirada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Janelas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Janelas de Entrega/Retirada
                  </h4>
                  <Button variant="outline" size="sm" onClick={addJanela}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {config.logistica.janelas.map((janela, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Nome"
                      value={janela.nome}
                      onChange={(e) => updateJanela(index, { nome: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="time"
                      value={janela.inicio}
                      onChange={(e) => updateJanela(index, { inicio: e.target.value })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={janela.fim}
                      onChange={(e) => updateJanela(index, { fim: e.target.value })}
                      className="w-24"
                    />
                    {config.logistica.janelas.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeJanela(index)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Prazos */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Prazos e Tolerâncias
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prazo-min">Prazo mínimo de agendamento (horas)</Label>
                    <Input
                      id="prazo-min"
                      type="number"
                      min="0"
                      max="168"
                      value={config.logistica.prazoMinHoras}
                      onChange={(e) =>
                        updateConfig({
                          logistica: {
                            ...config.logistica,
                            prazoMinHoras: parseInt(e.target.value) || 0
                          }
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tolerancia-inicio">Tolerância início (min)</Label>
                      <Input
                        id="tolerancia-inicio"
                        type="number"
                        min="0"
                        max="120"
                        value={config.logistica.toleranciaInicioMin}
                        onChange={(e) =>
                          updateConfig({
                            logistica: {
                              ...config.logistica,
                              toleranciaInicioMin: parseInt(e.target.value) || 0
                            }
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tolerancia-fim">Tolerância fim (min)</Label>
                      <Input
                        id="tolerancia-fim"
                        type="number"
                        min="0"
                        max="120"
                        value={config.logistica.toleranciaFimMin}
                        onChange={(e) =>
                          updateConfig({
                            logistica: {
                              ...config.logistica,
                              toleranciaFimMin: parseInt(e.target.value) || 0
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Responsável e Comprovante */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Controle de Entrega
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="responsavel-obrigatorio">Exigir nome + doc. do recebedor</Label>
                    <Switch
                      id="responsavel-obrigatorio"
                      checked={config.logistica.responsavelObrigatorio}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          logistica: {
                            ...config.logistica,
                            responsavelObrigatorio: checked
                          }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="comprovante-digital">Gerar comprovante digital</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Comprovante PDF simulado com dados da entrega</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="comprovante-digital"
                      checked={config.logistica.comprovanteDigital}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          logistica: {
                            ...config.logistica,
                            comprovanteDigital: checked
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* C) Manutenção & OS */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="w-5 h-5 text-primary" />
                Manutenção & OS
              </CardTitle>
              <CardDescription>
                Status, transições e controles de ordens de serviço
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status válidos */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Status e Transições
                </h4>
                
                <div className="space-y-2">
                  <Label>Status disponíveis</Label>
                  <div className="text-sm text-muted-foreground">
                    {config.manutencao.status.join(' → ')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sequência: {config.manutencao.status[0]} pode ir para qualquer status, 
                    demais seguem ordem sequencial ou cancelamento.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Controles */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Controles
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="exigir-foto">Exigir foto/laudo na abertura</Label>
                    <Switch
                      id="exigir-foto"
                      checked={config.manutencao.exigirFotoLaudo}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          manutencao: {
                            ...config.manutencao,
                            exigirFotoLaudo: checked
                          }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="acao-rapida">Permitir ação rápida do equipamento</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Botão "Enviar p/ Manutenção" nos equipamentos</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="acao-rapida"
                      checked={config.manutencao.acaoRapidaEquip}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          manutencao: {
                            ...config.manutencao,
                            acaoRapidaEquip: checked
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Motivos de parada */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Motivos de Parada
                </h4>
                
                <div className="space-y-2">
                  {config.manutencao.motivosParada.map((motivo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm flex-1">{motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* D) Pró-rata & Faturamento Parcial */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5 text-primary" />
                Pró-rata & Faturamento
              </CardTitle>
              <CardDescription>
                Cálculos, multas, juros e faturamento parcial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Método de cálculo */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Cálculo Pró-rata
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metodo-prorata">Método</Label>
                    <Select
                      value={config.prorata.metodo}
                      onValueChange={(value: 'DIARIA_EXATA' | 'UM_TRIGESIMO') =>
                        updateConfig({
                          prorata: {
                            ...config.prorata,
                            metodo: value
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIARIA_EXATA">Diária exata</SelectItem>
                        <SelectItem value="UM_TRIGESIMO">1/30 avos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="arredondamento">Arredondamento</Label>
                    <Select
                      value={config.prorata.arredondamento.toString()}
                      onValueChange={(value) =>
                        updateConfig({
                          prorata: {
                            ...config.prorata,
                            arredondamento: parseInt(value) as 0 | 2
                          }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sem casas decimais</SelectItem>
                        <SelectItem value="2">2 casas decimais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Faturamento parcial */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Faturamento Parcial
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="permitir-parcial">Permitir faturar período proporcional</Label>
                    <Switch
                      id="permitir-parcial"
                      checked={config.prorata.faturamentoParcial.permitir}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          prorata: {
                            ...config.prorata,
                            faturamentoParcial: {
                              ...config.prorata.faturamentoParcial,
                              permitir: checked
                            }
                          }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="adicionar-diferencas">Adicionar linha "Diferenças de locação"</Label>
                    <Switch
                      id="adicionar-diferencas"
                      checked={config.prorata.faturamentoParcial.adicionarDiferencas}
                      onCheckedChange={(checked) =>
                        updateConfig({
                          prorata: {
                            ...config.prorata,
                            faturamentoParcial: {
                              ...config.prorata.faturamentoParcial,
                              adicionarDiferencas: checked
                            }
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Multas e juros */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Multas e Juros de Atraso
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="multa-percent">Multa % (aplicada 1x)</Label>
                    <Input
                      id="multa-percent"
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      value={config.prorata.multaPercent}
                      onChange={(e) =>
                        updateConfig({
                          prorata: {
                            ...config.prorata,
                            multaPercent: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="juros-dia-percent">Juros ao dia %</Label>
                    <Input
                      id="juros-dia-percent"
                      type="number"
                      min="0"
                      max="1"
                      step="0.001"
                      value={config.prorata.jurosDiaPercent}
                      onChange={(e) =>
                        updateConfig({
                          prorata: {
                            ...config.prorata,
                            jurosDiaPercent: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* E) Automação */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-primary" />
                Automação
              </CardTitle>
              <CardDescription>
                Gatilhos e ações automáticas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="renovacao-aviso">Renovação confirmada → Sugerir envio de aviso</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mensagem para o cliente informando a renovação</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    id="renovacao-aviso"
                    checked={config.automacao.renovacaoAviso}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        automacao: {
                          ...config.automacao,
                          renovacaoAviso: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="devolucao-fatura">Devolução confirmada → Abrir emissão de Fatura</Label>
                  <Switch
                    id="devolucao-fatura"
                    checked={config.automacao.devolucaoFatura}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        automacao: {
                          ...config.automacao,
                          devolucaoFatura: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="quita-desbloqueio">Recebimento quita atrasos → Remover bloqueio</Label>
                  <Switch
                    id="quita-desbloqueio"
                    checked={config.automacao.quitaDesbloqueio}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        automacao: {
                          ...config.automacao,
                          quitaDesbloqueio: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="recebimento-caixa">Recebimento Dinheiro → Focar Caixa</Label>
                  <Switch
                    id="recebimento-caixa"
                    checked={config.automacao.recebimentoFocaCaixa}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        automacao: {
                          ...config.automacao,
                          recebimentoFocaCaixa: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="snackbar-proximo">Pós-ação → Sugerir próximo passo</Label>
                  <Switch
                    id="snackbar-proximo"
                    checked={config.automacao.snackbarProximoPasso}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        automacao: {
                          ...config.automacao,
                          snackbarProximoPasso: checked
                        }
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}