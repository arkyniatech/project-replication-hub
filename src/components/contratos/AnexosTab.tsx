import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Paperclip, Upload, FileText, Image, Download, Trash2, Eye } from "lucide-react";
import { AnexoContrato, Contrato } from "@/types";
import { UploadAnexoModal } from "./UploadAnexoModal";

interface AnexosTabProps {
  contrato: Contrato;
  onContratoUpdate: () => void;
}

export default function AnexosTab({ contrato, onContratoUpdate }: AnexosTabProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { toast } = useToast();
  const { can } = usePermissions();

  // Mock anexos - in real app would come from contrato.anexos
  const anexos: AnexoContrato[] = [
    {
      id: "1",
      contratoId: String(contrato.id),
      nome: "Contrato_Assinado.pdf",
      url: "mock-url", // Required by base Anexo interface
      tipo: "pdf",
      tamanho: 2456789,
      tag: "CONTRATO",
      observacao: "Contrato principal assinado pelo cliente",
      base64: "mock-base64-data",
      usuarioId: "1",
      usuarioNome: "João Silva",
      createdAt: new Date().toISOString()
    },
    {
      id: "2",
      contratoId: String(contrato.id),
      nome: "Foto_Equipamento.jpg",
      url: "mock-url", // Required by base Anexo interface
      tipo: "jpg",
      tamanho: 1234567,
      tag: "OS",
      observacao: "Foto do equipamento antes da entrega",
      base64: "mock-base64-data",
      usuarioId: "2",
      usuarioNome: "Maria Santos",
      createdAt: new Date().toISOString()
    }
  ];

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
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="w-8 h-8 text-blue-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'CONTRATO':
        return 'bg-blue-100 text-blue-800';
      case 'ASSINATURA':
        return 'bg-green-100 text-green-800';
      case 'OS':
        return 'bg-orange-100 text-orange-800';
      case 'OUTROS':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownload = (anexo: AnexoContrato) => {
    // Mock download - in real app would handle base64 or file URL
    toast({
      title: "Download iniciado",
      description: `Baixando ${anexo.nome}...`
    });
  };

  const handlePreview = (anexo: AnexoContrato) => {
    // Mock preview - in real app would open modal with file preview
    toast({
      title: "Visualizando arquivo",
      description: `Abrindo ${anexo.nome}...`
    });
  };

  const handleDelete = (anexo: AnexoContrato) => {
    if (!canDelete) return;
    
    // Mock delete - in real app would remove from storage and update contract
    toast({
      title: "Anexo removido",
      description: `${anexo.nome} foi removido do contrato`
    });
    
    // Would trigger timeline event: ANEXO_REMOVIDO
    onContratoUpdate();
  };

  const handleUploadSuccess = () => {
    toast({
      title: "Anexo adicionado",
      description: "Arquivo carregado com sucesso"
    });
    
    // Would trigger timeline event: ANEXO_ADICIONADO
    onContratoUpdate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Anexos e Documentos
          </CardTitle>
          {canUpload && (
            <Button onClick={() => setShowUploadModal(true)}>
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
            <div className="space-y-4">
              {anexos.map((anexo) => (
                <div key={anexo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    {getFileIcon(anexo.tipo)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{anexo.nome}</h4>
                        <Badge variant="secondary" className={getTagColor(anexo.tag)}>
                          {anexo.tag}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(anexo.tamanho)} • {anexo.usuarioNome} • {new Date(anexo.createdAt).toLocaleString('pt-BR')}
                      </p>
                      {anexo.observacao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {anexo.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(anexo)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(anexo)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(anexo)}
                        className="text-destructive hover:text-destructive"
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
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}