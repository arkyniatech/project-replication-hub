import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileImage, RotateCcw, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useConfigStore } from '@/stores/configStore';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { Protected } from '@/components/rbac/Protected';

const entidades = [
  { key: 'contrato', label: 'Contrato' },
  { key: 'os', label: 'Ordem de Serviço' },
  { key: 'fatura', label: 'Fatura' },
  { key: 'titulo', label: 'Título' },
] as const;

const camposTemplate = [
  { key: 'cliente', label: 'Dados do Cliente' },
  { key: 'itens', label: 'Itens do Contrato' },
  { key: 'tabelas', label: 'Tabelas de Preços' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'assinaturas', label: 'Área de Assinaturas' },
] as const;

export default function SequenciasETemplates() {
  const { lojas } = useMultiunidade();
  const {
    sequenciasPorLoja,
    templates,
    updateSequenciaLoja,
    resetSequenciaVisualizacao,
    updateTemplate,
    restaurarTemplatesPadrao,
  } = useConfigStore();

  const [activeTab, setActiveTab] = useState('numeracao');

  const handleSequenciaChange = (lojaId: string, entidade: string, valor: string) => {
    const num = parseInt(valor) || 1;
    updateSequenciaLoja(lojaId, entidade as any, num);
  };

  const handleResetVisualizacao = (lojaId: string) => {
    resetSequenciaVisualizacao(lojaId);
    toast.success('Visualização resetada para a loja');
  };

  const handleSalvarSequencias = () => {
    toast.success('Sequências salvas com sucesso');
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        updateTemplate({ logo: base64 });
        toast.success('Logo carregado com sucesso');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCorChange = (tipo: 'primaria' | 'secundaria', cor: string) => {
    updateTemplate({
      cores: {
        ...templates.contratoResumo.cores,
        [tipo]: cor,
      },
    });
  };

  const handleCampoVisivel = (campo: string, visivel: boolean) => {
    updateTemplate({
      camposVisiveis: {
        ...templates.contratoResumo.camposVisiveis,
        [campo]: visivel,
      },
    });
  };

  const handleSalvarTemplate = () => {
    toast.success('Template salvo com sucesso');
  };

  const handleRestaurarPadrao = () => {
    restaurarTemplatesPadrao();
    toast.success('Template restaurado ao padrão');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sequências e Templates</h1>
        <p className="text-muted-foreground">
          Configure numeração por loja e templates de documentos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="numeracao">Numeração por Loja</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="numeracao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sequências Numéricas por Loja</CardTitle>
              <CardDescription>
                Configure o próximo número para cada tipo de documento por loja
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Protected perm="settings:sequencias" fallback={
                <div className="text-center py-8 text-muted-foreground">
                  Você não tem permissão para editar sequências
                </div>
              }>
                <div className="space-y-6">
                  {lojas.map((loja) => (
                    <div key={loja.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{loja.nome}</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResetVisualizacao(loja.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Resetar Visualização
                        </Button>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entidade</TableHead>
                            <TableHead>Próximo Número</TableHead>
                            <TableHead>Visualização</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entidades.map((entidade) => {
                            const sequencia = sequenciasPorLoja[loja.id]?.[entidade.key] || 1;
                            return (
                              <TableRow key={entidade.key}>
                                <TableCell className="font-medium">
                                  {entidade.label}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={sequencia}
                                    onChange={(e) => 
                                      handleSequenciaChange(loja.id, entidade.key, e.target.value)
                                    }
                                    className="w-32"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {sequencia.toString().padStart(6, '0')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button onClick={handleSalvarSequencias}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Sequências
                    </Button>
                  </div>
                </div>
              </Protected>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuração */}
            <Card>
              <CardHeader>
                <CardTitle>Quadro Resumo do Contrato</CardTitle>
                <CardDescription>
                  Configure o template para impressão de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Protected perm="settings:templates" fallback={
                  <div className="text-center py-8 text-muted-foreground">
                    Você não tem permissão para editar templates
                  </div>
                }>
                  <div className="space-y-6">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <Label>Logo da Empresa</Label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                          <label className="cursor-pointer">
                            <FileImage className="h-4 w-4 mr-2" />
                            Escolher Logo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </Button>
                        {templates.contratoResumo.logo && (
                          <Badge variant="outline">Logo carregado</Badge>
                        )}
                      </div>
                    </div>

                    {/* Cores */}
                    <div className="space-y-4">
                      <Label>Cores do Template</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cor-primaria" className="text-sm">Cor Primária</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="cor-primaria"
                              type="color"
                              value={templates.contratoResumo.cores.primaria}
                              onChange={(e) => handleCorChange('primaria', e.target.value)}
                              className="w-12 h-8 p-1"
                            />
                            <Input
                              value={templates.contratoResumo.cores.primaria}
                              onChange={(e) => handleCorChange('primaria', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cor-secundaria" className="text-sm">Cor Secundária</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="cor-secundaria"
                              type="color"
                              value={templates.contratoResumo.cores.secundaria}
                              onChange={(e) => handleCorChange('secundaria', e.target.value)}
                              className="w-12 h-8 p-1"
                            />
                            <Input
                              value={templates.contratoResumo.cores.secundaria}
                              onChange={(e) => handleCorChange('secundaria', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Campos Visíveis */}
                    <div className="space-y-4">
                      <Label>Campos Visíveis</Label>
                      <div className="space-y-3">
                        {camposTemplate.map((campo) => (
                          <div key={campo.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={campo.key}
                              checked={templates.contratoResumo.camposVisiveis[campo.key as keyof typeof templates.contratoResumo.camposVisiveis]}
                              onCheckedChange={(checked) => 
                                handleCampoVisivel(campo.key, checked as boolean)
                              }
                            />
                            <Label htmlFor={campo.key} className="text-sm font-normal">
                              {campo.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button onClick={handleSalvarTemplate}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={handleRestaurarPadrao}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar Padrão
                      </Button>
                    </div>
                  </div>
                </Protected>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview do Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 space-y-4 bg-white min-h-[400px]"
                  style={{
                    borderColor: templates.contratoResumo.cores.primaria,
                    '--primary-color': templates.contratoResumo.cores.primaria,
                    '--secondary-color': templates.contratoResumo.cores.secundaria,
                  } as React.CSSProperties}
                >
                  {/* Header com Logo */}
                  <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: templates.contratoResumo.cores.primaria }}>
                    {templates.contratoResumo.logo && (
                      <img 
                        src={templates.contratoResumo.logo} 
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                      />
                    )}
                    <div>
                      <h2 
                        className="text-lg font-bold"
                        style={{ color: templates.contratoResumo.cores.primaria }}
                      >
                        CONTRATO DE LOCAÇÃO
                      </h2>
                      <p className="text-sm text-gray-600">Quadro Resumo</p>
                    </div>
                  </div>

                  {/* Campos Visíveis */}
                  {templates.contratoResumo.camposVisiveis.cliente && (
                    <div className="space-y-2">
                      <h3 
                        className="font-semibold text-sm"
                        style={{ color: templates.contratoResumo.cores.secundaria }}
                      >
                        DADOS DO CLIENTE
                      </h3>
                      <div className="text-xs text-gray-600">
                        <p>Cliente Exemplo Ltda</p>
                        <p>CNPJ: 12.345.678/0001-90</p>
                      </div>
                    </div>
                  )}

                  {templates.contratoResumo.camposVisiveis.itens && (
                    <div className="space-y-2">
                      <h3 
                        className="font-semibold text-sm"
                        style={{ color: templates.contratoResumo.cores.secundaria }}
                      >
                        ITENS DO CONTRATO
                      </h3>
                      <div className="text-xs text-gray-600">
                        <p>• Equipamento A - Período: 7 dias</p>
                        <p>• Equipamento B - Período: 14 dias</p>
                      </div>
                    </div>
                  )}

                  {templates.contratoResumo.camposVisiveis.tabelas && (
                    <div className="space-y-2">
                      <h3 
                        className="font-semibold text-sm"
                        style={{ color: templates.contratoResumo.cores.secundaria }}
                      >
                        VALORES
                      </h3>
                      <div className="text-xs text-gray-600">
                        <p>Subtotal: R$ 1.200,00</p>
                        <p>Total: R$ 1.200,00</p>
                      </div>
                    </div>
                  )}

                  {templates.contratoResumo.camposVisiveis.observacoes && (
                    <div className="space-y-2">
                      <h3 
                        className="font-semibold text-sm"
                        style={{ color: templates.contratoResumo.cores.secundaria }}
                      >
                        OBSERVAÇÕES
                      </h3>
                      <div className="text-xs text-gray-600">
                        <p>Observações do contrato...</p>
                      </div>
                    </div>
                  )}

                  {templates.contratoResumo.camposVisiveis.assinaturas && (
                    <div className="mt-6 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="text-center">
                          <div className="border-b border-gray-300 mb-1 h-6"></div>
                          <p className="text-gray-600">Locador</p>
                        </div>
                        <div className="text-center">
                          <div className="border-b border-gray-300 mb-1 h-6"></div>
                          <p className="text-gray-600">Locatário</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}