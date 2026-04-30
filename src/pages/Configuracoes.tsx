import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Building2, Users, Hash, Globe, FileText, Settings, DollarSign, Zap, Archive, Bell, Percent, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { OrganizacaoForm } from "@/components/configuracoes/OrganizacaoForm";
import { SegurancaForm } from "@/components/configuracoes/SegurancaForm";
import { LojasForm } from "@/components/configuracoes/LojasForm";
import { UsuariosPerfilForm } from "@/components/configuracoes/UsuariosPerfilForm";
import SequenciasETemplates from "@/modules/config/SequenciasETemplates";
import { LayoutDocumentosForm } from "@/components/configuracoes/LayoutDocumentosForm";
import { ParametrizacoesLocacaoForm } from "@/components/configuracoes/ParametrizacoesLocacaoForm";
import { FinanceiroForm } from "@/components/configuracoes/FinanceiroForm";
import { PoliticasComerciais } from "@/components/configuracoes/PoliticasComerciais";
import { AvisosForm } from "@/components/configuracoes/AvisosForm";
import { IntegracoesForm } from "@/components/configuracoes/IntegracoesForm";
import { MarcasVariacoesForm } from "@/components/configuracoes/MarcasVariacoesForm";
import { toast } from "sonner";
import { APP_CONFIG } from "@/config/app";

// Mock do usuário atual - em produção viria do contexto de auth
const currentUser = {
  id: "1",
  nome: "Admin Sistema",
  perfil: "Admin" as const
};

const placeholderSections = [
  { 
    value: "localizacao", 
    label: "Localização & Idioma", 
    icon: Globe,
    description: "Timezone, moeda, formato de data/número." 
  },
  { 
    value: "auditoria", 
    label: "Auditoria & Backups", 
    icon: Archive,
    description: "Trilha de alterações e política de retenção." 
  }
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("organizacao");

  // Verificar permissões
  if (!["Admin", "Financeiro"].includes(currentUser.perfil)) {
    toast.error("Acesso negado", {
      description: "Você não tem permissão para acessar as configurações."
    });
    navigate("/");
    return null;
  }

  const handleTabChange = (value: string) => {
    // Allow implemented tabs: organizacao, seguranca, lojas, usuarios, numeracao, layout, parametros, financeiro, politicas, avisos, integracoes
    if (!['organizacao', 'seguranca', 'lojas', 'usuarios', 'numeracao', 'layout', 'parametros', 'financeiro', 'politicas', 'avisos', 'integracoes', 'marcas'].includes(value)) {
      toast.info("Funcionalidade em desenvolvimento", {
        description: "Esta seção estará disponível nas próximas etapas."
      });
      return;
    }
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-6">
        {/* Header com Breadcrumb */}
        <div className="flex flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Administração</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Configurações</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie as configurações globais do {APP_CONFIG.system.name}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
            <TabsTrigger 
              value="organizacao" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Organização</span>
            </TabsTrigger>
            <TabsTrigger 
              value="seguranca" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
            <TabsTrigger 
              value="lojas" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Lojas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="usuarios" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger 
              value="numeracao" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Hash className="w-4 h-4" />
              <span className="hidden sm:inline">Numeração</span>
            </TabsTrigger>
            <TabsTrigger 
              value="layout" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Layout</span>
            </TabsTrigger>
            <TabsTrigger 
              value="parametros" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Parametrizações</span>
            </TabsTrigger>
            <TabsTrigger 
              value="financeiro" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger 
              value="politicas" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Percent className="w-4 h-4" />
              <span className="hidden sm:inline">Políticas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="avisos" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Avisos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="integracoes" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
            <TabsTrigger 
              value="marcas" 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Marcas/Variações</span>
            </TabsTrigger>
            {placeholderSections.map((section) => (
              <TabsTrigger 
                key={section.value}
                value={section.value} 
                className="flex flex-col items-center gap-1 p-3 text-xs opacity-60"
              >
                <section.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Organização & Segurança - Implementado */}
          <TabsContent value="organizacao" className="space-y-6">
            <OrganizacaoForm />
          </TabsContent>

          <TabsContent value="seguranca" className="space-y-6">
            <SegurancaForm />
          </TabsContent>

          <TabsContent value="lojas" className="space-y-6">
            <LojasForm />
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-6">
            <UsuariosPerfilForm />
          </TabsContent>

          <TabsContent value="numeracao" className="space-y-6">
            <SequenciasETemplates />
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <LayoutDocumentosForm />
          </TabsContent>

          <TabsContent value="parametros" className="space-y-6">
            <ParametrizacoesLocacaoForm />
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            <FinanceiroForm />
          </TabsContent>

          <TabsContent value="politicas" className="space-y-6">
            <PoliticasComerciais />
          </TabsContent>

          <TabsContent value="avisos" className="space-y-6">
            <AvisosForm />
          </TabsContent>

          <TabsContent value="integracoes" className="space-y-6">
            <IntegracoesForm />
          </TabsContent>

          <TabsContent value="marcas" className="space-y-6">
            <MarcasVariacoesForm />
          </TabsContent>

          {/* Placeholders */}
          {placeholderSections.map((section) => (
            <TabsContent key={section.value} value={section.value} className="space-y-6">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <section.icon className="w-5 h-5 text-primary" />
                    {section.label}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Esta funcionalidade estará disponível nas próximas etapas do desenvolvimento.
                    </AlertDescription>
                  </Alert>
                  <Button disabled variant="outline">
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}