// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIAS = [
  { value: "TENSAO", label: "Tensão (V)" },
  { value: "COMBUSTIVEL", label: "Combustível" },
  { value: "CAPACIDADE", label: "Capacidade" },
  { value: "ESTADO", label: "Estado / Condição" },
];

interface Marca { id: string; nome: string; ativo: boolean; }
interface Variacao { id: string; categoria: string; valor: string; ordem: number; ativo: boolean; }

export function MarcasVariacoesForm() {
  const { toast } = useToast();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [variacoes, setVariacoes] = useState<Variacao[]>([]);
  const [novaMarca, setNovaMarca] = useState("");
  const [editingMarca, setEditingMarca] = useState<{ id: string; nome: string } | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState(CATEGORIAS[0].value);
  const [novoValor, setNovoValor] = useState("");
  const [editingVar, setEditingVar] = useState<{ id: string; valor: string } | null>(null);

  const carregar = async () => {
    const [{ data: m }, { data: v }] = await Promise.all([
      supabase.from("marcas_equipamentos").select("*").order("nome"),
      supabase.from("variacoes_equipamento").select("*").order("ordem"),
    ]);
    setMarcas(m || []);
    setVariacoes(v || []);
  };

  useEffect(() => { carregar(); }, []);

  // ----- Marcas -----
  const adicionarMarca = async () => {
    const nome = novaMarca.trim();
    if (!nome) return;
    const { error } = await supabase.from("marcas_equipamentos").insert({ nome });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNovaMarca("");
    toast({ title: "Marca cadastrada", description: nome });
    carregar();
  };

  const salvarMarca = async () => {
    if (!editingMarca) return;
    const { error } = await supabase
      .from("marcas_equipamentos")
      .update({ nome: editingMarca.nome.trim() })
      .eq("id", editingMarca.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setEditingMarca(null);
    carregar();
  };

  const excluirMarca = async (id: string) => {
    if (!confirm("Excluir esta marca?")) return;
    const { error } = await supabase.from("marcas_equipamentos").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    carregar();
  };

  const toggleMarca = async (m: Marca) => {
    await supabase.from("marcas_equipamentos").update({ ativo: !m.ativo }).eq("id", m.id);
    carregar();
  };

  // ----- Variações -----
  const variacoesCat = variacoes.filter((v) => v.categoria === categoriaAtiva);

  const adicionarVariacao = async () => {
    const valor = novoValor.trim();
    if (!valor) return;
    const ordem = (variacoesCat[variacoesCat.length - 1]?.ordem || 0) + 1;
    const { error } = await supabase
      .from("variacoes_equipamento")
      .insert({ categoria: categoriaAtiva, valor, ordem });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNovoValor("");
    carregar();
  };

  const salvarVariacao = async () => {
    if (!editingVar) return;
    await supabase
      .from("variacoes_equipamento")
      .update({ valor: editingVar.valor.trim() })
      .eq("id", editingVar.id);
    setEditingVar(null);
    carregar();
  };

  const excluirVariacao = async (id: string) => {
    if (!confirm("Excluir esta variação?")) return;
    await supabase.from("variacoes_equipamento").delete().eq("id", id);
    carregar();
  };

  const toggleVariacao = async (v: Variacao) => {
    await supabase.from("variacoes_equipamento").update({ ativo: !v.ativo }).eq("id", v.id);
    carregar();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="marcas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marcas">Marcas</TabsTrigger>
          <TabsTrigger value="variacoes">Variações</TabsTrigger>
        </TabsList>

        {/* MARCAS */}
        <TabsContent value="marcas">
          <Card>
            <CardHeader>
              <CardTitle>Marcas de Equipamentos</CardTitle>
              <CardDescription>
                Cadastre as marcas (fabricantes) que serão usadas no cadastro de equipamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da marca (ex: Bosch, Honda...)"
                  value={novaMarca}
                  onChange={(e) => setNovaMarca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionarMarca()}
                />
                <Button onClick={adicionarMarca}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {marcas.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    Nenhuma marca cadastrada ainda.
                  </p>
                )}
                {marcas.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3">
                    {editingMarca?.id === m.id ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={editingMarca.nome}
                          onChange={(e) => setEditingMarca({ ...editingMarca, nome: e.target.value })}
                        />
                        <Button size="sm" onClick={salvarMarca}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingMarca(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.nome}</span>
                          {!m.ativo && <Badge variant="secondary">Inativa</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleMarca(m)}>
                            {m.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingMarca({ id: m.id, nome: m.nome })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => excluirMarca(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VARIAÇÕES */}
        <TabsContent value="variacoes">
          <Card>
            <CardHeader>
              <CardTitle>Variações Padrão</CardTitle>
              <CardDescription>
                Padronize valores de tensão, combustível, capacidade e estado para uso nos equipamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={`Novo valor para ${CATEGORIAS.find(c => c.value === categoriaAtiva)?.label}`}
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionarVariacao()}
                />
                <Button onClick={adicionarVariacao}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {variacoesCat.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    Nenhuma variação cadastrada nesta categoria.
                  </p>
                )}
                {variacoesCat.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3">
                    {editingVar?.id === v.id ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={editingVar.valor}
                          onChange={(e) => setEditingVar({ ...editingVar, valor: e.target.value })}
                        />
                        <Button size="sm" onClick={salvarVariacao}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingVar(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{v.valor}</span>
                          {!v.ativo && <Badge variant="secondary">Inativa</Badge>}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleVariacao(v)}>
                            {v.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingVar({ id: v.id, valor: v.valor })}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => excluirVariacao(v.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MarcasVariacoesForm;
