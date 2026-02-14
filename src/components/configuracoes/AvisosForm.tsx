import { useState } from "react";
import { useSupabaseAvisos, type AvisoSistema } from "@/hooks/useSupabaseAvisos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit3, Eye, EyeOff, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const tipoOptions = [
  { value: 'info', label: 'Informativo', icon: Info, color: 'text-blue-600' },
  { value: 'warning', label: 'Aviso', icon: AlertTriangle, color: 'text-amber-600' },
  { value: 'success', label: 'Sucesso', icon: CheckCircle, color: 'text-green-600' },
  { value: 'urgent', label: 'Urgente', icon: AlertCircle, color: 'text-red-600' },
];

interface AvisoFormData {
  texto: string;
  tipo: 'info' | 'warning' | 'success' | 'urgent';
  prioridade: number;
  data_inicio: string;
  data_fim: string;
}

const initialFormData: AvisoFormData = {
  texto: '',
  tipo: 'info',
  prioridade: 1,
  data_inicio: '',
  data_fim: '',
};

export function AvisosForm() {
  const { 
    todosAvisos,
    configHeader,
    isLoading,
    addAviso, 
    updateAviso, 
    deleteAviso, 
    toggleAviso,
    updateConfigHeader 
  } = useSupabaseAvisos();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AvisoFormData>(initialFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.texto.trim()) {
      toast.error("O texto do aviso é obrigatório");
      return;
    }

    if (formData.texto.length > 150) {
      toast.error("O texto deve ter no máximo 150 caracteres");
      return;
    }

    const avisoData = {
      texto: formData.texto.trim(),
      tipo: formData.tipo,
      prioridade: formData.prioridade,
      ativo: true,
      data_inicio: formData.data_inicio || undefined,
      data_fim: formData.data_fim || undefined,
    };

    if (editingId) {
      updateAviso({ id: editingId, updates: avisoData });
    } else {
      addAviso(avisoData);
    }

    setFormData(initialFormData);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (aviso: AvisoSistema) => {
    setFormData({
      texto: aviso.texto,
      tipo: aviso.tipo,
      prioridade: aviso.prioridade,
      data_inicio: aviso.data_inicio || '',
      data_fim: aviso.data_fim || '',
    });
    setEditingId(aviso.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setShowForm(false);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    deleteAviso(id);
  };

  const getTipoOption = (tipo: string) => {
    return tipoOptions.find(opt => opt.value === tipo) || tipoOptions[0];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Configure como os avisos são exibidos no header do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="exibir-logo">Exibir logo ERP</Label>
              <Switch
                id="exibir-logo"
                checked={configHeader?.exibir_logo ?? true}
                onCheckedChange={(checked) => 
                  updateConfigHeader({ exibir_logo: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="animacao">Animações</Label>
              <Switch
                id="animacao"
                checked={configHeader?.animacao ?? true}
                onCheckedChange={(checked) => 
                  updateConfigHeader({ animacao: checked })
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tempo-rotacao">Tempo de rotação (segundos)</Label>
              <Input
                id="tempo-rotacao"
                type="number"
                min="3"
                max="30"
                value={configHeader?.tempo_rotacao ?? 5}
                onChange={(e) => 
                  updateConfigHeader({ tempo_rotacao: parseInt(e.target.value) || 5 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Avisos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Avisos do Sistema</CardTitle>
              <CardDescription>
                Gerencie os avisos que aparecerão no header para todos os usuários
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Aviso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!todosAvisos || todosAvisos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum aviso cadastrado. Clique em "Novo Aviso" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Texto</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todosAvisos
                  .sort((a, b) => b.prioridade - a.prioridade)
                  .map((aviso) => {
                    const tipoOption = getTipoOption(aviso.tipo);
                    const IconComponent = tipoOption.icon;
                    
                    return (
                      <TableRow key={aviso.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAviso(aviso.id)}
                            className="p-1"
                          >
                            {aviso.ativo ? (
                              <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-4 h-4 ${tipoOption.color}`} />
                            <span className="text-sm">{tipoOption.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm truncate">{aviso.texto}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {aviso.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {aviso.data_inicio && (
                              <div>Início: {new Date(aviso.data_inicio).toLocaleDateString()}</div>
                            )}
                            {aviso.data_fim && (
                              <div>Fim: {new Date(aviso.data_fim).toLocaleDateString()}</div>
                            )}
                            {!aviso.data_inicio && !aviso.data_fim && (
                              <span>Permanente</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(aviso)}
                              className="p-1"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(aviso.id)}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Aviso */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Aviso' : 'Novo Aviso'}</CardTitle>
            <CardDescription>
              {editingId ? 'Modifique os dados do aviso' : 'Preencha os dados do novo aviso'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="texto">Texto do Aviso *</Label>
                <Textarea
                  id="texto"
                  value={formData.texto}
                  onChange={(e) => setFormData(prev => ({ ...prev, texto: e.target.value }))}
                  placeholder="Digite o texto que aparecerá no header..."
                  maxLength={150}
                  rows={3}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {formData.texto.length}/150 caracteres
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className={`w-4 h-4 ${option.color}`} />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={formData.prioridade.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Baixa</SelectItem>
                      <SelectItem value="2">2 - Normal</SelectItem>
                      <SelectItem value="3">3 - Média</SelectItem>
                      <SelectItem value="4">4 - Alta</SelectItem>
                      <SelectItem value="5">5 - Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data-inicio">Data de Início (opcional)</Label>
                  <Input
                    id="data-inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data-fim">Data de Fim (opcional)</Label>
                  <Input
                    id="data-fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Atualizar' : 'Criar'} Aviso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
