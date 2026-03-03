import { useState, useEffect } from "react";
import { Building2, Upload, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { validateCNPJ, formatCNPJ, formatCEP, validateCEP, getAddressByCEP, estadosBrasil } from "@/lib/validations";
import type { ConfiguracaoOrganizacao, AppConfig } from "@/types";

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

export function OrganizacaoForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [originalData, setOriginalData] = useState<ConfiguracaoOrganizacao | null>(null);
  const [formData, setFormData] = useState<ConfiguracaoOrganizacao>({
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar configurações existentes
  useEffect(() => {
    const config = getAppConfig();
    if (config.organizacao && config.organizacao.razaoSocial) {
      const data = config.organizacao;
      setOriginalData(data);
      setFormData(data);
    }
  }, []);

  // Auto-preenchimento por CEP
  useEffect(() => {
    if (formData.endereco.cep && validateCEP(formData.endereco.cep)) {
      getAddressByCEP(formData.endereco.cep).then(address => {
        if (address) {
          setFormData(prev => ({
            ...prev,
            endereco: {
              ...prev.endereco,
              logradouro: address.logradouro,
              bairro: address.bairro,
              cidade: address.cidade,
              uf: address.uf
            }
          }));
          toast.success("Endereço preenchido automaticamente");
        }
      });
    }
  }, [formData.endereco.cep]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.razaoSocial.trim()) {
      newErrors.razaoSocial = "Razão social é obrigatória";
    }

    if (!formData.cnpj.trim()) {
      newErrors.cnpj = "CNPJ é obrigatório";
    } else if (!validateCNPJ(formData.cnpj)) {
      newErrors.cnpj = "CNPJ inválido";
    }

    if (!formData.endereco.cep.trim()) {
      newErrors.cep = "CEP é obrigatório";
    } else if (!validateCEP(formData.endereco.cep)) {
      newErrors.cep = "CEP inválido";
    }

    if (!formData.endereco.logradouro.trim()) {
      newErrors.logradouro = "Logradouro é obrigatório";
    }

    if (!formData.endereco.numero.trim()) {
      newErrors.numero = "Número é obrigatório";
    }

    if (!formData.endereco.bairro.trim()) {
      newErrors.bairro = "Bairro é obrigatório";
    }

    if (!formData.endereco.cidade.trim()) {
      newErrors.cidade = "Cidade é obrigatória";
    }

    if (!formData.endereco.uf.trim()) {
      newErrors.uf = "UF é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Corrija os erros do formulário");
      return;
    }

    setIsLoading(true);
    try {
      const config = getAppConfig();
      config.organizacao = formData;
      setAppConfig(config);
      setOriginalData(formData);
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = () => {
    if (originalData) {
      setFormData(originalData);
      setErrors({});
      toast.info("Alterações revertidas");
    }
  };

  const handlePreviewDocument = () => {
    // Mock de preview de documento
    toast.info("Preview de Documento", {
      description: `Documento gerado com ${formData.razaoSocial} - Cores: ${formData.cores.primaria}`
    });
  };

  const handleLogoUpload = () => {
    // Mock de upload de logo
    toast.info("Upload de Logo", {
      description: "Funcionalidade de upload será implementada em breve"
    });
  };

  const updateField = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Limpar erro do campo
    if (errors[path.split('.').pop() || '']) {
      setErrors(prev => ({ ...prev, [path.split('.').pop() || '']: '' }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social *</Label>
              <Input
                id="razaoSocial"
                placeholder="Nome empresarial completo"
                value={formData.razaoSocial}
                onChange={(e) => updateField('razaoSocial', e.target.value)}
                className={errors.razaoSocial ? 'border-destructive' : ''}
              />
              {errors.razaoSocial && (
                <p className="text-sm text-destructive">{errors.razaoSocial}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input
                id="nomeFantasia"
                placeholder="Nome comercial"
                value={formData.nomeFantasia}
                onChange={(e) => updateField('nomeFantasia', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={(e) => updateField('cnpj', formatCNPJ(e.target.value))}
                  className={errors.cnpj ? 'border-destructive' : ''}
                />
                {errors.cnpj && (
                  <p className="text-sm text-destructive">{errors.cnpj}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input
                  id="ie"
                  placeholder="000.000.000.000"
                  disabled={formData.isentoIE}
                  value={formData.ie}
                  onChange={(e) => updateField('ie', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isentoIE"
                checked={formData.isentoIE}
                onCheckedChange={(checked) => updateField('isentoIE', checked)}
              />
              <Label htmlFor="isentoIE">Isento de Inscrição Estadual</Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emailFiscal">E-mail Fiscal</Label>
                <Input
                  id="emailFiscal"
                  type="email"
                  placeholder="fiscal@empresa.com"
                  value={formData.emailFiscal}
                  onChange={(e) => updateField('emailFiscal', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 1234-5678"
                  value={formData.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Endereço</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={formData.endereco.cep}
                    onChange={(e) => updateField('endereco.cep', formatCEP(e.target.value))}
                    className={errors.cep ? 'border-destructive' : ''}
                  />
                  {errors.cep && (
                    <p className="text-sm text-destructive">{errors.cep}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf">UF *</Label>
                  <Select value={formData.endereco.uf} onValueChange={(value) => updateField('endereco.uf', value)}>
                    <SelectTrigger className={errors.uf ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBrasil.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.uf && (
                    <p className="text-sm text-destructive">{errors.uf}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    placeholder="Nome da cidade"
                    value={formData.endereco.cidade}
                    onChange={(e) => updateField('endereco.cidade', e.target.value)}
                    className={errors.cidade ? 'border-destructive' : ''}
                  />
                  {errors.cidade && (
                    <p className="text-sm text-destructive">{errors.cidade}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="logradouro">Logradouro *</Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua, Avenida, etc."
                    value={formData.endereco.logradouro}
                    onChange={(e) => updateField('endereco.logradouro', e.target.value)}
                    className={errors.logradouro ? 'border-destructive' : ''}
                  />
                  {errors.logradouro && (
                    <p className="text-sm text-destructive">{errors.logradouro}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    placeholder="123"
                    value={formData.endereco.numero}
                    onChange={(e) => updateField('endereco.numero', e.target.value)}
                    className={errors.numero ? 'border-destructive' : ''}
                  />
                  {errors.numero && (
                    <p className="text-sm text-destructive">{errors.numero}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    placeholder="Nome do bairro"
                    value={formData.endereco.bairro}
                    onChange={(e) => updateField('endereco.bairro', e.target.value)}
                    className={errors.bairro ? 'border-destructive' : ''}
                  />
                  {errors.bairro && (
                    <p className="text-sm text-destructive">{errors.bairro}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Logo e Cores */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Identidade Visual</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleLogoUpload}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload de Logo (Mock)
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaria">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="w-12 h-10 p-1 border rounded"
                        value={formData.cores.primaria}
                        onChange={(e) => updateField('cores.primaria', e.target.value)}
                      />
                      <Input 
                        placeholder="#F97316"
                        value={formData.cores.primaria}
                        onChange={(e) => updateField('cores.primaria', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secundaria">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="w-12 h-10 p-1 border rounded"
                        value={formData.cores.secundaria}
                        onChange={(e) => updateField('cores.secundaria', e.target.value)}
                      />
                      <Input 
                        placeholder="#111827"
                        value={formData.cores.secundaria}
                        onChange={(e) => updateField('cores.secundaria', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePreviewDocument}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Pré-visualizar Documento
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleRevert}
                disabled={!originalData}
              >
                Reverter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview/Info Card */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview da Identidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 border-2 border-dashed rounded-lg">
              <div 
                className="w-16 h-16 rounded-lg mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: formData.cores.primaria }}
              >
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold">{formData.razaoSocial || "Nome da Empresa"}</h3>
              <p className="text-sm text-muted-foreground">
                {formData.nomeFantasia || "Nome Fantasia"}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>CNPJ: {formData.cnpj || "00.000.000/0000-00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}