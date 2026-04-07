import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  Plus, 
  Search, 
  Edit, 
  History,
  Package,
  Settings,
  Eye,
  ArrowLeft
} from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { GrupoForm } from "@/components/equipamentos/GrupoForm";
import { ModeloForm } from "@/components/equipamentos/ModeloForm";
import { HistoricoPrecos } from "@/components/equipamentos/HistoricoPrecos";

export default function CatalogoGruposModelos() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("grupos");
  const [searchGrupos, setSearchGrupos] = useState("");
  const [searchModelos, setSearchModelos] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filtroGrupoModelo, setFiltroGrupoModelo] = useState("");
  
  // Modals
  const [grupoFormOpen, setGrupoFormOpen] = useState(false);
  const [modeloFormOpen, setModeloFormOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<string | null>(null);
  const [editingModelo, setEditingModelo] = useState<string | null>(null);
  const [historicoModeloId, setHistoricoModeloId] = useState<string>("");

  const { grupos, isLoading: isLoadingGrupos } = useSupabaseGrupos();
  const { modelos, isLoading: isLoadingModelos } = useSupabaseModelos();
  const { equipamentos } = useSupabaseEquipamentos();

  // Navigation
  const handleBack = () => {
    navigate('/equipamentos');
  };

  // Keyboard shortcuts
  useKeyboardShortcut('g', () => {
    setEditingGrupo(null);
    setGrupoFormOpen(true);
  });

  useKeyboardShortcut('m', () => {
    setEditingModelo(null);
    setModeloFormOpen(true);
  });

  useKeyboardShortcut('Escape', handleBack);

  // Filtered data
  const filteredGrupos = grupos.filter(grupo => {
    const matchesSearch = grupo.nome.toLowerCase().includes(searchGrupos.toLowerCase());
    const matchesActive = showInactive || grupo.ativo;
    return matchesSearch && matchesActive;
  });

  const filteredModelos = modelos.filter(modelo => {
    const matchesSearch = modelo.nome_comercial.toLowerCase().includes(searchModelos.toLowerCase());
    const matchesGrupo = !filtroGrupoModelo || modelo.grupo_id === filtroGrupoModelo;
    return matchesSearch && matchesGrupo;
  });

  // Helpers
  const getEquipamentosCount = (grupoId: string) => {
    return equipamentos.filter(e => e.grupo_id === grupoId).length;
  };

  const getGrupoName = (grupoId: string) => {
    return grupos.find(g => g.id === grupoId)?.nome || "N/A";
  };

  const hasPrecos = (modelo: any) => {
    if (!modelo.tabela_por_loja) return false;
    return Object.values(modelo.tabela_por_loja).some((tabela: any) => 
      Object.values(tabela).some((preco: any) => preco > 0)
    );
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/equipamentos/tabela-precos')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Tabela de Preços
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setEditingGrupo(null);
              setGrupoFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
            <kbd className="ml-2 text-xs opacity-70">G</kbd>
          </Button>
          
          <Button
            onClick={() => {
              setEditingModelo(null);
              setModeloFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Modelo
            <kbd className="ml-2 text-xs opacity-70">M</kbd>
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader className="pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grupos">Grupos</TabsTrigger>
              <TabsTrigger value="modelos">Modelos</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab: Grupos */}
            <TabsContent value="grupos" className="space-y-4">
              {/* Filtros Grupos */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar grupos..."
                    value={searchGrupos}
                    onChange={(e) => setSearchGrupos(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Button
                  variant={showInactive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowInactive(!showInactive)}
                >
                  Mostrar Inativos
                </Button>
              </div>

              {/* Lista de Grupos */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Equipamentos</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingGrupos ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          Carregando grupos...
                        </td>
                      </tr>
                    ) : filteredGrupos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          Nenhum grupo encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredGrupos.map((grupo) => (
                        <tr key={grupo.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-medium">{grupo.nome}</td>
                          <td className="p-3">
                            <Badge variant={grupo.ativo ? "default" : "secondary"}>
                              {grupo.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {getEquipamentosCount(grupo.id)} item(s)
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingGrupo(grupo.id);
                                setGrupoFormOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Tab: Modelos */}
            <TabsContent value="modelos" className="space-y-4">
              {/* Filtros Modelos */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar modelos..."
                    value={searchModelos}
                    onChange={(e) => setSearchModelos(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  value={filtroGrupoModelo}
                  onChange={(e) => setFiltroGrupoModelo(e.target.value)}
                >
                  <option value="">Todos os grupos</option>
                  {grupos.filter(g => g.ativo).map(grupo => (
                    <option key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de Modelos */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome Comercial</th>
                      <th className="text-left p-3 font-medium">Grupo</th>
                      <th className="text-left p-3 font-medium">Preços</th>
                      <th className="text-right p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingModelos ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Carregando modelos...
                        </td>
                      </tr>
                    ) : filteredModelos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          {grupos.length === 0 ? (
                            <div className="space-y-3">
                              <p>Nenhum grupo/modelo encontrado</p>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingGrupo(null);
                                    setGrupoFormOpen(true);
                                  }}
                                >
                                  + Novo Grupo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingModelo(null);
                                    setModeloFormOpen(true);
                                  }}
                                >
                                  + Novo Modelo
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                💡 Dica: em dev, alterne para perfil Gestor/Admin no seletor de perfil para editar preços
                              </p>
                            </div>
                          ) : (
                            <p>Nenhum modelo encontrado</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredModelos.map((modelo) => (
                        <tr key={modelo.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 font-medium">{modelo.nome_comercial}</td>
                          <td className="p-3">
                            {grupos.find(g => g.id === modelo.grupo_id)?.nome || "N/A"}
                          </td>
                          <td className="p-3">
                            <Badge variant={hasPrecos(modelo) ? "default" : "destructive"}>
                              {hasPrecos(modelo) ? "Configurado" : "Pendente"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingModelo(modelo.id);
                                  setModeloFormOpen(true);
                                }}
                                title="Editar modelo e preços"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setHistoricoModeloId(modelo.id);
                                  setHistoricoOpen(true);
                                }}
                                title="Ver histórico de preços"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <GrupoForm
        open={grupoFormOpen}
        onOpenChange={setGrupoFormOpen}
        grupoId={editingGrupo}
        onSuccess={() => setGrupoFormOpen(false)}
      />
      
      <ModeloForm
        open={modeloFormOpen}
        onOpenChange={setModeloFormOpen}
        modeloId={editingModelo}
        onSuccess={() => setModeloFormOpen(false)}
      />
      
      <HistoricoPrecos
        open={historicoOpen}
        onOpenChange={setHistoricoOpen}
        modeloId={historicoModeloId}
      />
    </div>
  );
}