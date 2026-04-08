import { useState, useEffect } from "react";
import { Shield, Key, Clock, FileCheck, RefreshCw, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { ConfiguracaoSeguranca, AppConfig } from "@/types";

// Direct storage functions to avoid import issues
const STORAGE_KEY = 'erp-config';

const DEFAULT_CONFIG: AppConfig = {
  organizacao: {
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    ie: "",
    isentoIE: false,
    emailFiscal: "",
    telefone: "",
    endereco: {
      cep: "",
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      pais: "Brasil"
    },
    cores: {
      primaria: "#F97316",
      secundaria: "#111827"
    }
  },
  seguranca: {
    politicaSenha: "PADRAO",
    doisFatores: false,
    sessaoMinutos: 30,
    exigirAceiteLGPD: true
  },
  usuarios: [],
  perfis: {},
  lojas: [],
  logsAuditoria: []
};

function getAppConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      return {
        organizacao: { ...DEFAULT_CONFIG.organizacao, ...config.organizacao },
        seguranca: { ...DEFAULT_CONFIG.seguranca, ...config.seguranca },
        usuarios: config.usuarios || DEFAULT_CONFIG.usuarios,
        perfis: config.perfis || DEFAULT_CONFIG.perfis,
        lojas: config.lojas || DEFAULT_CONFIG.lojas,
        logsAuditoria: config.logsAuditoria || DEFAULT_CONFIG.logsAuditoria
      };
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  }
  return DEFAULT_CONFIG;
}

function setAppConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
}

const DEFAULTS: ConfiguracaoSeguranca = {
  politicaSenha: "PADRAO",
  doisFatores: false,
  sessaoMinutos: 30,
  exigirAceiteLGPD: true
};

export function SegurancaForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState<ConfiguracaoSeguranca | null>(null);
  const [formData, setFormData] = useState<ConfiguracaoSeguranca>(DEFAULTS);

  // Carregar configurações existentes
  useEffect(() => {
    const config = getAppConfig();
    if (config.seguranca) {
      const data = config.seguranca;
      setOriginalData(data);
      setFormData(data);
    } else {
      setOriginalData(DEFAULTS);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const config = getAppConfig();
      config.seguranca = formData;
      setAppConfig(config);
      setOriginalData(formData);
      
      toast.success("Configurações de segurança salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações de segurança");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDefaults = () => {
    setFormData(DEFAULTS);
    toast.info("Configurações padrão restauradas");
  };

  const getPoliticaDescricao = (politica: string) => {
    switch (politica) {
      case "FORTE":
        return "Mínimo 10 caracteres, incluindo maiúsculas, minúsculas, números e símbolos";
      case "PADRAO":
      default:
        return "Mínimo 6 caracteres alfanuméricos";
    }
  };

  const getSessaoDescricao = (minutos: number) => {
    if (minutos < 60) {
      return `${minutos} minutos`;
    }
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    if (minutosRestantes === 0) {
      return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    }
    return `${horas}h ${minutosRestantes}min`;
  };

  const updateField = (field: keyof ConfiguracaoSeguranca, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configurações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Segurança & Sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Política de Senha */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Política de Senha</Label>
              </div>
              
              <div className="space-y-2">
                <Select value={formData.politicaSenha} onValueChange={(value: "PADRAO" | "FORTE") => updateField('politicaSenha', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PADRAO">Padrão</SelectItem>
                    <SelectItem value="FORTE">Forte</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {getPoliticaDescricao(formData.politicaSenha)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Autenticação de Dois Fatores */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Autenticação de Dois Fatores</Label>
              </div>
              
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">
                    Habilitar 2FA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Requer código adicional via SMS ou aplicativo autenticador
                  </p>
                </div>
                <Switch
                  checked={formData.doisFatores}
                  onCheckedChange={(checked) => updateField('doisFatores', checked)}
                />
              </div>

              {formData.doisFatores && (
                <Alert>
                  <AlertDescription>
                    A autenticação de dois fatores será configurada no primeiro login de cada usuário.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Configuração de Sessão */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Gestão de Sessão</Label>
              </div>
              
              <div className="space-y-2">
                <Label>Tempo de Inatividade (minutos)</Label>
                <Select 
                  value={formData.sessaoMinutos.toString()} 
                  onValueChange={(value) => updateField('sessaoMinutos', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos (Padrão)</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Usuário será desconectado após {getSessaoDescricao(formData.sessaoMinutos)} de inatividade
                </p>
              </div>
            </div>

            <Separator />

            {/* LGPD */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">LGPD & Termos</Label>
              </div>
              
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">
                    Exigir aceite no primeiro login
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Usuários devem aceitar termos de uso e política de privacidade
                  </p>
                </div>
                <Switch
                  checked={formData.exigirAceiteLGPD}
                  onCheckedChange={(checked) => updateField('exigirAceiteLGPD', checked)}
                />
              </div>

              <Alert>
                <AlertDescription>
                  Links para termos de uso e política de privacidade serão configurados na seção "Integrações".
                </AlertDescription>
              </Alert>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Aplicar Configurações
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleRestoreDefaults}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar Padrões
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resumo de Segurança */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Política de Senha</span>
                <span className="text-sm">
                  {formData.politicaSenha === "FORTE" ? "Forte" : "Padrão"}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Dois Fatores (2FA)</span>
                <span className="text-sm">
                  {formData.doisFatores ? "Habilitado" : "Desabilitado"}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Timeout de Sessão</span>
                <span className="text-sm">
                  {getSessaoDescricao(formData.sessaoMinutos)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Aceite LGPD</span>
                <span className="text-sm">
                  {formData.exigirAceiteLGPD ? "Obrigatório" : "Opcional"}
                </span>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Alterações nas configurações de segurança serão aplicadas no próximo login dos usuários.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configurações Avançadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Auditoria de login: será habilitada na seção "Auditoria & Backups"</p>
            <p>• Bloqueio por tentativas: configurável em "Parametrizações"</p>
            <p>• Notificações de segurança: disponível em "Integrações"</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}