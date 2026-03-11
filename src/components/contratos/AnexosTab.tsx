import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Paperclip, Upload, FileText, Image, Download, Trash2, Eye, AlertCircle } from "lucide-react";
import { UploadAnexoModal } from "./UploadAnexoModal";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DocumentoAnexo {
  id: string;
  nome: string;
  path: string;
  tipo: string;
  tamanho: number;
  tag: 'CONTRATO' | 'ASSINATURA' | 'OS' | 'FOTO' | 'OUTROS';
  observacao?: string;
  usuarioNome: string;
  createdAt: string;
}

interface AnexosTabProps {
  contrato: {
    id: string;
    status: string;
    documentos?: DocumentoAnexo[];
  };
  onContratoUpdate: () => void;
}

export default function AnexosTab({ contrato, onContratoUpdate }: AnexosTabProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { can } = usePermissions();

  const anexos: DocumentoAnexo[] = (contrato.documentos as DocumentoAnexo[] | undefined) || [];
  const canUpload = can('contratos', 'edit') && contrato.status !== 'ENCERRADO';
  const canDelete = can('contratos', 'edit') && contrato.status !== 'ENCERRADO';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-destructive" />;
      case 'jpg': case 'jpeg': case 'png':
        return <Image className="w-8 h-8 text-primary" />;
      default:
        return <FileText className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'CONTRATO': return 'bg-primary/10 text-primary border-primary/20';
      case 'ASSINATURA': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'OS': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'FOTO': return 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('contratos-anexos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDownload = (anexo: DocumentoAnexo) => {
    const url = getPublicUrl(anexo.path);
    const a = document.createElement('a');
    a.href = url;
    a.download = anexo.nome;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = (anexo: DocumentoAnexo) => {
    const url = getPublicUrl(anexo.path);
    window.open(url, '_blank');
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const anexo = anexos.find(a => a.id === deletingId);
    if (!anexo) return;

    setIsDeleting(true);
    try {
      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('contratos-anexos')
        .remove([anexo.path]);

      if (storageError) throw storageError;

      // Update contratos.documentos (remove from array)
      const updatedDocs = anexos.filter(a => a.id !== deletingId);
      const { error: dbError } = await supabase
        .from('contratos')
        .update({ documentos: updatedDocs as any })
        .eq('id', contrato.id);

      if (dbError) throw dbError;

      toast({ title: "Anexo removido", description: `${anexo.nome} foi removido` });
      onContratoUpdate();
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: "Erro ao remover", description: "Tente novamente", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Paperclip className="w-5 h-5" />
            Anexos e Documentos
            {anexos.length > 0 && (
              <Badge variant="secondary" className="ml-2">{anexos.length}</Badge>
            )}
          </CardTitle>
          {canUpload && (
            <Button size="sm" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {anexos.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nenhum anexo encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload de fotos, laudos e documentos relacionados ao contrato
              </p>
              {canUpload && (
                <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {anexos.map((anexo) => (
                <div key={anexo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    {getFileIcon(anexo.tipo)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{anexo.nome}</h4>
                        <Badge variant="outline" className={`shrink-0 ${getTagColor(anexo.tag)}`}>
                          {anexo.tag}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(anexo.tamanho)} • {anexo.usuarioNome} • {new Date(anexo.createdAt).toLocaleString('pt-BR')}
                      </p>
                      {anexo.observacao && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          {anexo.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(anexo)} title="Visualizar">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(anexo)} title="Download">
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(anexo.id)}
                        className="text-destructive hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadAnexoModal
        contratoId={String(contrato.id)}
        documentosAtuais={anexos}
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onSuccess={onContratoUpdate}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
