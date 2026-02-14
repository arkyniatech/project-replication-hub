import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Edit2, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Contrato, AditivoContratual, EventoTimeline, Titulo } from "@/types";
import NovoAditivoModal from "./NovoAditivoModal";
import { usePermissions } from "@/hooks/usePermissions";
import { useSupabaseAditivos } from "@/hooks/useSupabaseAditivos";

interface AditivosTabProps {
  contrato: Contrato;
  onContratoUpdate: () => void;
}

export default function AditivosTab({ contrato, onContratoUpdate }: AditivosTabProps) {
  const [showNovoAditivoModal, setShowNovoAditivoModal] = useState(false);
  const [aditivoEditando, setAditivoEditando] = useState<any>(null);
  const { toast } = useToast();
  const { can } = usePermissions();
  
  // Usar hook do Supabase
  const { aditivos: aditivosSupabase, isLoading, deleteAditivo } = useSupabaseAditivos(String(contrato?.id));

  // Mapear aditivos do Supabase para formato local
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

  const getTipoBadgeVariant = (tipo: string) => {
    const variants: Record<string, any> = {
      RENOVACAO: "default",
      DESCONTO: "success",
      TAXA: "warning",
      AJUSTE: "secondary",
      OUTRO: "outline"
    };
    return variants[tipo] || "default";
  };

  const handleEditarAditivo = (aditivo: any) => {
    if (!can('contratos', 'editar')) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para editar aditivos",
        variant: "destructive"
      });
      return;
    }
    setAditivoEditando(aditivo);
    setShowNovoAditivoModal(true);
  };

  const handleRemoverAditivo = async (aditivoId: string) => {
    if (!can('contratos', 'editar')) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para remover aditivos",
        variant: "destructive"
      });
      return;
    }

    await deleteAditivo.mutateAsync(aditivoId);
    onContratoUpdate();
  };

  const handleGerarPDF = (aditivo: AditivoContratual) => {
    // Simular geração de PDF do aditivo
    console.log('📄 Gerando PDF do aditivo:', aditivo);
    
    toast({
      title: "PDF gerado",
      description: "PDF do aditivo foi gerado com sucesso (mock)"
    });
  };

  const valorTotal = aditivos.reduce((total, aditivo) => {
    return aditivo.status === 'ATIVO' ? total + aditivo.valor : total;
  }, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Aditivos Contratuais
            </CardTitle>
            {can('contratos', 'criar') && (
              <Button 
                onClick={() => {
                  setAditivoEditando(null);
                  setShowNovoAditivoModal(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Aditivo
              </Button>
            )}
          </div>
          {aditivos.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total de aditivos: {aditivos.length}</span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Valor total: R$ {valorTotal.toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {aditivos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum aditivo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Ainda não há aditivos para este contrato. 
                Aditivos são usados para formalizar alterações como descontos, taxas ou outras modificações.
              </p>
              {can('contratos', 'criar') && (
                <Button 
                  onClick={() => setShowNovoAditivoModal(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Aditivo
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vinculação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aditivos.map((aditivo) => (
                  <TableRow key={aditivo.id}>
                    <TableCell className="font-medium">{aditivo.numero}</TableCell>
                    <TableCell>
                      <Badge className={getTipoBadgeVariant(aditivo.tipo)}>
                        {getTipoLabel(aditivo.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{aditivo.descricao}</p>
                        <p className="text-sm text-muted-foreground">{aditivo.justificativa}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${aditivo.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {aditivo.valor >= 0 ? '+' : ''}R$ {aditivo.valor.toLocaleString('pt-BR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {aditivo.vinculacao === 'CONTRATO' ? 'Contrato' : `Item ${aditivo.itemId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aditivo.status === 'ATIVO' ? 'default' : 'secondary'}>
                        {aditivo.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(aditivo.criadoEm).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{aditivo.criadoPor}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGerarPDF(aditivo)}
                          className="gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          PDF
                        </Button>
                        {can('contratos', 'editar') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditarAditivo(aditivo)}
                              className="gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoverAditivo(aditivo.id)}
                              className="gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remover
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </>
  );
}