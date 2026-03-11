import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Edit2, Trash2, DollarSign, RotateCcw, Calendar, User, Link2, MoreHorizontal, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Contrato, AditivoContratual } from "@/types";
import NovoAditivoModal from "./NovoAditivoModal";
import VisualizarAditivoModal from "./VisualizarAditivoModal";
import { usePermissions } from "@/hooks/usePermissions";
import { useSupabaseAditivos } from "@/hooks/useSupabaseAditivos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AditivosTabProps {
  contrato: Contrato;
  onContratoUpdate: () => void;
}

export default function AditivosTab({ contrato, onContratoUpdate }: AditivosTabProps) {
  const [showNovoAditivoModal, setShowNovoAditivoModal] = useState(false);
  const [aditivoEditando, setAditivoEditando] = useState<any>(null);
  const [aditivoVisualizando, setAditivoVisualizando] = useState<any>(null);
  const { toast } = useToast();
  const { can } = usePermissions();
  
  const { aditivos: aditivosSupabase, isLoading, deleteAditivo } = useSupabaseAditivos(String(contrato?.id));

  const aditivos = useMemo(() => {
    if (!aditivosSupabase) return [];
    return aditivosSupabase.map((aditivo: any) => ({
      id: aditivo.id,
      contratoId: aditivo.contrato_id,
      numero: aditivo.numero,
      tipo: aditivo.tipo,
      descricao: aditivo.descricao,
      justificativa: aditivo.justificativa,
      valor: Number(aditivo.valor),
      vinculacao: aditivo.vinculacao,
      itemId: aditivo.item_id,
      status: aditivo.status,
      criadoEm: aditivo.criado_em,
      criadoPor: aditivo.criado_por || 'Sistema',
    }));
  }, [aditivosSupabase]);

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      RENOVACAO: "Renovação",
      DESCONTO: "Desconto",
      TAXA: "Taxa",
      AJUSTE: "Ajuste",
      OUTRO: "Outro"
    };
    return labels[tipo] || tipo;
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'RENOVACAO': return <RotateCcw className="w-4 h-4" />;
      case 'DESCONTO': return <DollarSign className="w-4 h-4" />;
      case 'TAXA': return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTipoBgClass = (tipo: string) => {
    switch (tipo) {
      case 'RENOVACAO': return 'bg-primary/10 text-primary';
      case 'DESCONTO': return 'bg-success/15 text-success';
      case 'TAXA': return 'bg-warning/15 text-warning';
      case 'AJUSTE': return 'bg-info/15 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleEditarAditivo = (aditivo: any) => {
    if (!can('contratos', 'editar')) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para editar aditivos", variant: "destructive" });
      return;
    }
    setAditivoEditando(aditivo);
    setShowNovoAditivoModal(true);
  };

  const handleRemoverAditivo = async (aditivoId: string) => {
    if (!can('contratos', 'editar')) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para remover aditivos", variant: "destructive" });
      return;
    }
    await deleteAditivo.mutateAsync(aditivoId);
    onContratoUpdate();
  };

  const handleGerarPDF = (aditivo: AditivoContratual) => {
    console.log('📄 Gerando PDF do aditivo:', aditivo);
    toast({ title: "PDF gerado", description: "PDF do aditivo foi gerado com sucesso (mock)" });
  };

  const valorTotal = aditivos.reduce((total, aditivo) => {
    return aditivo.status === 'ATIVO' ? total + aditivo.valor : total;
  }, 0);

  const aditivosAtivos = aditivos.filter(a => a.status === 'ATIVO').length;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                Aditivos Contratuais
              </CardTitle>
              {aditivos.length > 0 && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground ml-[42px]">
                  <span className="flex items-center gap-1">
                    {aditivosAtivos} ativo{aditivosAtivos !== 1 ? 's' : ''}
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
            {can('contratos', 'criar') && (
              <Button 
                onClick={() => {
                  setAditivoEditando(null);
                  setShowNovoAditivoModal(true);
                }}
                className="gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Novo Aditivo
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {aditivos.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1.5 text-foreground">Nenhum aditivo registrado</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Aditivos formalizam alterações como renovações, descontos ou taxas adicionais ao contrato.
              </p>
              {can('contratos', 'criar') && (
                <Button 
                  onClick={() => setShowNovoAditivoModal(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Aditivo
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {aditivos.map((aditivo, index) => (
                <div
                  key={aditivo.id}
                  className="group px-6 py-4 hover:bg-muted/40 transition-colors duration-150"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getTipoBgClass(aditivo.tipo)}`}>
                      {getTipoIcon(aditivo.tipo)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{aditivo.numero}</span>
                        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0">
                          {getTipoLabel(aditivo.tipo)}
                        </Badge>
                        <Badge 
                          variant={aditivo.status === 'ATIVO' ? 'default' : 'secondary'} 
                          className="text-[10px] font-medium px-2 py-0"
                        >
                          {aditivo.status}
                        </Badge>
                      </div>

                      {aditivo.descricao && (
                        <p className="text-sm text-foreground leading-snug">{aditivo.descricao}</p>
                      )}

                      {aditivo.justificativa && (
                        <p className="text-xs text-muted-foreground italic leading-snug">{aditivo.justificativa}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(aditivo.criadoEm).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {aditivo.criadoPor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {aditivo.vinculacao === 'CONTRATO' ? 'Contrato' : `Item ${aditivo.itemId}`}
                        </span>
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right shrink-0">
                      <span className={`text-sm font-semibold ${aditivo.valor >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {aditivo.valor >= 0 ? '+' : ''}R$ {Math.abs(aditivo.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setAditivoVisualizando(aditivo)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleGerarPDF(aditivo)}
                        title="Gerar PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      {can('contratos', 'editar') && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditarAditivo(aditivo)}
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoverAditivo(aditivo.id)}
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NovoAditivoModal
        contrato={contrato}
        aditivo={aditivoEditando}
        open={showNovoAditivoModal}
        onOpenChange={setShowNovoAditivoModal}
        onSuccess={() => {
          onContratoUpdate();
          setAditivoEditando(null);
        }}
      />

      <VisualizarAditivoModal
        aditivo={aditivoVisualizando}
        open={!!aditivoVisualizando}
        onOpenChange={(open) => { if (!open) setAditivoVisualizando(null); }}
        onEditar={(aditivo) => {
          setAditivoEditando(aditivo);
          setShowNovoAditivoModal(true);
        }}
        itensContrato={contrato.itens}
      />
    </>
  );
}
