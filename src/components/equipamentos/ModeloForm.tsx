import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissionChecks } from "@/hooks/useRbacPermissions";
import { PERIODOS, diffTabelaPrecos, hasAnyPrice as hasAnyPriceUtil } from "@/lib/equipamentos-utils";
import { useSupabaseLojas } from "@/modules/rh/hooks/useSupabaseLojas";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { ConfiguracaoLocacaoSection } from "./ConfiguracaoLocacaoSection";

// Helper function to format money
const formatMoney = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formatação de entrada em modo caixa registradora (centavos)
const formatCurrencyInput = (digits: string | undefined): string => {
  if (!digits || digits === '') return '0,00';
  const numValue = parseInt(digits, 10);
  if (isNaN(numValue) || numValue === 0) return '0,00';
  
  // Trata como centavos: "150" = 150 centavos = R$ 1,50
  const reais = Math.floor(numValue / 100);
  const centavos = numValue % 100;
  const reaisFormatted = reais.toLocaleString('pt-BR');
  const centavosFormatted = centavos.toString().padStart(2, '0');
  
  return `${reaisFormatted},${centavosFormatted}`;
};

// Parse de entrada para número (converte centavos em reais)
const parseCurrencyInput = (digits: string | undefined): number => {
  if (!digits || digits === '') return 0;
  const numValue = parseInt(digits, 10);
  if (isNaN(numValue)) return 0;
  
  // Converte centavos para reais: "1500" = 1500 centavos = 15.00 reais
  return numValue / 100;
};

const modeloSchema = z.object({
  grupoId: z.string().min(1, "Selecione um grupo"),
  nomeComercial: z.string().min(1, "Nome comercial é obrigatório"),
  fotos: z.string().optional(),
  linkManual: z.string().optional(),
  linkVideo: z.string().optional(),
});

type ModeloFormData = z.infer<typeof modeloSchema>;

interface ModeloFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modeloId?: string | null;
  onSuccess?: () => void;
}

const PERIODOS_CONSTANTS = PERIODOS;

export function ModeloForm({ open, onOpenChange, modeloId, onSuccess }: ModeloFormProps) {
  const { modelos, createModelo, updateModelo, addHistoricoPreco } = useSupabaseModelos();
  const { grupos } = useSupabaseGrupos();
  const { lojas: systemLojas, isLoading: lojasLoading } = useSupabaseLojas();
  const { toast } = useToast();
  const { can } = usePermissionChecks();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [precos, setPrecos] = useState<Record<string, Record<string, number>>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState<Record<string, string>>({});
  const [cloneFromLoja, setCloneFromLoja] = useState("");

  const isEditing = Boolean(modeloId);
  const modelo = modeloId ? modelos.find(m => m.id === modeloId) : null;
  
  // Check if user has permission to edit equipment models/prices
  const canEdit = can('equipamentos:edit');

  const form = useForm<ModeloFormData>({
    resolver: zodResolver(modeloSchema),
    defaultValues: {
      grupoId: "",
      nomeComercial: "",
      fotos: "",
      linkManual: "",
      linkVideo: "",
    },
  });

  // Reset form when modal opens/closes or modelo changes
  useEffect(() => {
    if (open && modelo) {
      // Convert snake_case fields from Supabase to form fields
      const especificacoes = modelo.especificacoes as any || {};
      form.reset({
        grupoId: modelo.grupo_id,
        nomeComercial: modelo.nome_comercial,
        fotos: especificacoes.fotos?.[0] || "",
        linkManual: especificacoes.links?.manual || "",
        linkVideo: especificacoes.links?.video || "",
      });
      setPrecos(modelo.tabela_por_loja as any || {});
    } else if (open) {
      form.reset();
      // Initialize empty price table
      const emptyPrecos: Record<string, Record<string, number>> = {};
      systemLojas.forEach(loja => {
        emptyPrecos[loja.id] = {
          DIARIA: 0,
          SEMANA: 0,
          QUINZENA: 0,
          D21: 0,
          MES: 0,
        };
      });
      setPrecos(emptyPrecos);
    }
  }, [open, modelo, form, systemLojas]);

  const validateNomeUnico = (nome: string, grupoId: string) => {
    const exists = modelos.some(m => 
      m.id !== modeloId && 
      m.grupo_id === grupoId &&
      m.nome_comercial.toLowerCase() === nome.toLowerCase()
    );
    return !exists;
  };

  // Prefixo único validation removed - código agora é automático

  const hasAnyPrice = () => {
    return hasAnyPriceUtil(precos);
  };

  const updatePreco = (lojaId: string, periodo: string, valor: string) => {
    const numValue = parseCurrencyInput(valor);
    setPrecos(prev => ({
      ...prev,
      [lojaId]: {
        ...prev[lojaId],
        [periodo]: numValue,
      }
    }));
  };

  const handleClonePrecos = () => {
    if (!cloneFromLoja) return;
    
    const tabelaOrigem = precos[cloneFromLoja];
    if (!tabelaOrigem) return;

    const novosPrecos = { ...precos };
    systemLojas.forEach(loja => {
      if (loja.id !== cloneFromLoja) {
        novosPrecos[loja.id] = { ...tabelaOrigem };
      }
    });
    
    setPrecos(novosPrecos);
    toast({
      title: "Preços clonados",
      description: `Preços da ${systemLojas.find(l => l.id === cloneFromLoja)?.nome} foram aplicados a todas as lojas.`,
    });
  };

  const resetPrecos = () => {
    const emptyPrecos: Record<string, Record<string, number>> = {};
    systemLojas.forEach(loja => {
      emptyPrecos[loja.id] = {
        DIARIA: 0,
        SEMANA: 0,
        QUINZENA: 0,
        D21: 0,
        MES: 0,
      };
    });
    setPrecos(emptyPrecos);
    toast({
      title: "Preços resetados",
      description: "Todos os preços foram zerados.",
    });
  };

  const onSubmit = async (data: ModeloFormData) => {
    console.log("=== ModeloForm onSubmit started ===");
    console.log("Form data:", data);
    console.log("Current permissions - canEdit:", canEdit);
    console.log("Is editing:", isEditing);
    console.log("Current precos:", precos);
    console.log("Has any price:", hasAnyPrice());
    
    setIsSubmitting(true);

    try {
      // Check permission first
      if (!canEdit) {
        console.log("Permission denied - canEdit is false");
        toast({
          title: "Sem permissão",
          description: "Apenas perfis Gestor/Admin podem editar modelos e preços.",
          variant: "destructive",
        });
        return;
      }

      // Validations
      const nomeUnico = validateNomeUnico(data.nomeComercial, data.grupoId);
      console.log("Nome único validation:", nomeUnico);
      if (!nomeUnico) {
        console.log("Nome não é único, setting error");
        form.setError("nomeComercial", { 
          message: "Já existe um modelo com este nome neste grupo" 
        });
        return;
      }

      // Prefixo validation removed - código agora é automático

      const hasPrice = hasAnyPrice();
      console.log("Has any price validation:", hasPrice);
      if (!hasPrice) {
        console.log("No prices configured, showing toast");
        toast({
          title: "Atenção",
          description: "Pelo menos uma loja deve ter algum preço configurado.",
          variant: "destructive",
        });
        return;
      }

      console.log("All validations passed, proceeding with save");

      // Prepare data in snake_case format for Supabase
      const especificacoes = {
        fotos: data.fotos ? [data.fotos] : [],
        links: {
          manual: data.linkManual,
          video: data.linkVideo,
        },
      };

      const modeloData = {
        grupo_id: data.grupoId,
        nome_comercial: data.nomeComercial,
        prefixo_codigo: data.grupoId.substring(0, 3).toUpperCase(), // Generate prefix from grupo
        tabela_por_loja: precos,
        especificacoes: especificacoes,
        ativo: true,
      };

      console.log("Final modelo data:", modeloData);

      if (isEditing && modeloId) {
        console.log("Updating existing modelo with ID:", modeloId);
        
        // Record price changes for history
        const modeloAnterior = modelo;
        if (modeloAnterior?.tabela_por_loja) {
          const changes = diffTabelaPrecos(modeloAnterior.tabela_por_loja as any, precos, systemLojas);
          console.log("Price changes detected:", changes);
          
          // Add individual history entries for each change
          for (const change of changes) {
            await addHistoricoPreco.mutateAsync({
              modelo_id: modeloId,
              loja_id: change.lojaId,
              periodo: change.periodo,
              valor_anterior: change.valorAnterior,
              valor_novo: change.valorNovo,
              descricao: `${change.lojaNome} - ${PERIODOS_CONSTANTS.find(p => p.key === change.periodo)?.label}: ${change.valorAnterior.toFixed(2)} → ${change.valorNovo.toFixed(2)}`,
              usuario: "Sistema",
            });
          }
        }
        
        await updateModelo.mutateAsync({ id: modeloId, ...modeloData });
        
        toast({
          title: "Modelo atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        console.log("Creating new modelo");
        await createModelo.mutateAsync(modeloData as any);
        
        toast({
          title: "Modelo criado",
          description: "O novo modelo foi criado com sucesso.",
        });
      }

      console.log("Save successful, calling onSuccess");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error during save:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o modelo.",
        variant: "destructive",
      });
    } finally {
      console.log("=== ModeloForm onSubmit finished ===");
      setIsSubmitting(false);
    }
  };


  const gruposAtivos = grupos.filter(g => g.ativo);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-6xl mx-auto max-h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>
                {isEditing ? "Editar Modelo" : "Novo Modelo"}
              </DrawerTitle>
              <DrawerDescription>
                {isEditing 
                  ? "Atualize as informações do modelo e preços por loja."
                  : "Crie um novo modelo com preços específicos por loja."
                }
              </DrawerDescription>
            </div>
            
            {/* Header Save Button - Always visible */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  console.log("Header save clicked, submitting form...");
                  form.handleSubmit(onSubmit)();
                }}
                disabled={isSubmitting}
                size="sm"
              >
                {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </div>
        </DrawerHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" id="modelo-form">
              
              {/* Identificação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Identificação</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grupoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um grupo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {gruposAtivos.map(grupo => (
                              <SelectItem key={grupo.id} value={grupo.id}>
                                {grupo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nomeComercial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Comercial</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Betoneira 350L" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Mídia & Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mídia & Links (Opcionais)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="fotos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Foto (URL)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkManual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manual (URL)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkVideo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vídeo (URL)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Tabela de Preços */}
              {systemLojas.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tabela de Preços por Loja</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Carregando configurações das lojas...
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground">Aguarde...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                     <div className="flex items-center gap-3">
                       <CardTitle className="text-lg">Tabela de Preços por Loja</CardTitle>
                       {!canEdit && (
                         <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                           Somente leitura
                         </Badge>
                       )}
                     </div>
                     <p className="text-sm text-muted-foreground">
                       Configure os preços para cada período e loja
                       {!canEdit && (
                         <span className="text-amber-600 font-medium"> • Seu perfil não permite editar preços (requer Gestor/Admin)</span>
                       )}
                     </p>
                   </div>
                  <div className="flex gap-2">
                    <div className="flex gap-2 items-center">
                      <Select value={cloneFromLoja} onValueChange={setCloneFromLoja}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Origem" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemLojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>
                              {loja.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={handleClonePrecos}
                         disabled={!cloneFromLoja || !canEdit}
                       >
                         <Copy className="h-4 w-4 mr-2" />
                         Clonar para Todas
                       </Button>
                     </div>
                     <Button
                       type="button"
                       variant="outline" 
                       size="sm"
                       onClick={resetPrecos}
                        disabled={!canEdit}
                     >
                       Resetar
                     </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!hasAnyPrice() && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        Pelo menos uma loja deve ter algum preço configurado
                      </p>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-3 font-medium border-b">Loja</th>
                           {PERIODOS_CONSTANTS.map(periodo => (
                            <th key={periodo.key} className="text-center p-3 font-medium border-b">
                              {periodo.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {systemLojas.map((loja) => (
                          <tr key={loja.id} className="border-b">
                            <td className="p-3 font-medium">{loja.nome}</td>
                            {PERIODOS_CONSTANTS.map(periodo => (
                              <td key={periodo.key} className="p-2">
                                 <TooltipProvider>
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <div className="relative">
                                          <Input
                                            type="text"
                                            value={
                                              editingCell === `${loja.id}-${periodo.key}`
                                                ? formatCurrencyInput(rawInput[`${loja.id}-${periodo.key}`] || '0')
                                                : formatMoney(precos[loja.id]?.[periodo.key] || 0)
                                            }
                                              onFocus={(e) => {
                                                if (canEdit) {
                                                const cellKey = `${loja.id}-${periodo.key}`;
                                                setEditingCell(cellKey);
                                                
                                                // Converte reais para centavos para rawInput
                                                const currentValue = precos[loja.id]?.[periodo.key] || 0;
                                                const centavos = Math.round(currentValue * 100);
                                                const initialDigits = centavos === 0 ? '' : centavos.toString();
                                                
                                                setRawInput(prev => ({
                                                  ...prev,
                                                  [cellKey]: initialDigits
                                                }));
                                                setTimeout(() => e.target.select(), 0);
                                              }
                                            }}
                              onBlur={() => {
                                const cellKey = `${loja.id}-${periodo.key}`;
                                
                                // 1. Primeiro sai do modo de edição
                                setEditingCell(null);
                                
                                // 2. Depois persiste o valor (se houver)
                                if (rawInput[cellKey] !== undefined) {
                                  updatePreco(loja.id, periodo.key, rawInput[cellKey]);
                                  
                                  // 3. Por último limpa o rawInput
                                  setRawInput(prev => {
                                    const next = { ...prev };
                                    delete next[cellKey];
                                    return next;
                                  });
                                }
                              }}
                              onChange={(e) => {
                                                 const cellKey = `${loja.id}-${periodo.key}`;
                                                 if (editingCell === cellKey) {
                                                   const newDigits = e.target.value.replace(/\D/g, '');
                                                   
                                                   // Sempre atualiza com os dígitos extraídos (permite substituição completa)
                                                   setRawInput(prev => ({
                                                     ...prev,
                                                     [cellKey]: newDigits
                                                   }));
                                                 }
                                               }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const cellKey = `${loja.id}-${periodo.key}`;
                  
                  // Persiste o valor antes de navegar
                  if (rawInput[cellKey] !== undefined) {
                    updatePreco(loja.id, periodo.key, rawInput[cellKey]);
                  }
                  
                  // Limpa estado
                  setEditingCell(null);
                  setRawInput(prev => {
                    const next = { ...prev };
                    delete next[cellKey];
                    return next;
                  });
                  
                  // Busca inputs focáveis
                  const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
                  const currentIndex = inputs.indexOf(e.target as HTMLInputElement);
                  
                  // Shift+Tab = anterior, Tab = próximo
                  const targetIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
                  const targetInput = inputs[targetIndex] as HTMLInputElement;
                  
                  if (targetInput) {
                    setTimeout(() => targetInput.focus(), 0);
                  }
                }
                
                // Permite navegação e edição normal
                if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                  return;
                }
                
                // Bloqueia caracteres não-numéricos
                if (!/^\d$/.test(e.key) && !['Tab', 'Enter', 'Escape'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
                                            className="w-32 text-right"
                                           placeholder={editingCell === `${loja.id}-${periodo.key}` ? "0,00" : "R$ 0,00"}
                                           disabled={!canEdit}
                                           readOnly={!canEdit}
                                         />
                                          {!canEdit && (
                                           <div className="absolute inset-0 bg-muted/30 rounded cursor-not-allowed" />
                                         )}
                                       </div>
                                     </TooltipTrigger>
                                     {!canEdit && (
                                       <TooltipContent>
                                         <p>Apenas Gestor pode editar preços</p>
                                       </TooltipContent>
                                     )}
                                   </Tooltip>
                                 </TooltipProvider>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                 </CardContent>
               </Card>
              )}

              {/* Configuração de Locação */}
              {isEditing && modelo && (
                <ConfiguracaoLocacaoSection
                  caucaoPadrao={modelo.caucao_padrao || 0}
                  waiverProtecaoPercent={modelo.waiver_protecao_percent || 0}
                  taxaLimpezaPadrao={modelo.taxa_limpeza_padrao || 0}
                  tempoPaddingHoras={modelo.tempo_padding_horas || 3}
                  toleranciaAtrasoHoras={modelo.tolerancia_atraso_horas || 1}
                  multaDiariaAtraso={modelo.multa_diaria_atraso || 0}
                  politicaCancelamento={modelo.politica_cancelamento || ''}
                  onChange={async (field, value) => {
                    if (!canEdit) return;
                    try {
                      await updateModelo.mutateAsync({
                        id: modeloId,
                        [field]: value,
                      });
                      toast({
                        title: "Atualizado",
                        description: "Configuração salva com sucesso",
                      });
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Não foi possível salvar",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              )}

            </form>
          </Form>
        </div>

        {/* Sticky Footer with Actions - Always visible */}
        <div className="flex-shrink-0 border-t bg-background px-6 py-4">
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => {
                console.log("Footer save clicked, submitting form...");
                const formElement = document.getElementById('modelo-form') as HTMLFormElement;
                if (formElement) {
                  formElement.requestSubmit();
                } else {
                  console.log("Form element not found, using form.handleSubmit");
                  form.handleSubmit(onSubmit)();
                }
              }}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}