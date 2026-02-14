import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadAnexoModalProps {
  contratoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UploadAnexoModal({ contratoId, open, onOpenChange, onSuccess }: UploadAnexoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tag, setTag] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  // Reset form when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFile(null);
      setTag('');
      setObservacao('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo permitido: 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      setError('Tipo de arquivo não permitido. Use: PDF, JPG, PNG');
      return;
    }

    setError('');
    setSelectedFile(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
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

  const handleSubmit = async () => {
    if (!selectedFile || !tag) {
      setError('Selecione um arquivo e uma tag');
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock file upload - convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });

      // Mock save to storage
      const anexo = {
        id: Date.now().toString(),
        contratoId,
        nome: selectedFile.name,
        tipo: selectedFile.name.split('.').pop()?.toLowerCase() || '',
        tamanho: selectedFile.size,
        tag: tag as 'CONTRATO' | 'ASSINATURA' | 'OS' | 'OUTROS',
        observacao: observacao.trim() || undefined,
        base64,
        usuarioId: "1", // Mock user
        usuarioNome: "João Silva", // Mock user
        createdAt: new Date().toISOString()
      };

      // In real app, would save to storage and update contract
      console.log('Anexo criado:', anexo);

      // Mock delay for upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      onSuccess();
      handleOpenChange(false);
      
    } catch (err) {
      setError('Erro ao fazer upload do arquivo');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Anexo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Arquivo</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    {getFileIcon(selectedFile)}
                    <div className="flex-1">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                        setError('');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Clique para selecionar arquivo</p>
                    <p className="text-sm text-muted-foreground">
                      PDF, JPG ou PNG (máx. 10MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Tag Selection */}
          <div className="space-y-2">
            <Label htmlFor="tag">Tag *</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTRATO">Contrato</SelectItem>
                <SelectItem value="ASSINATURA">Assinatura</SelectItem>
                <SelectItem value="OS">OS</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Descreva o conteúdo do arquivo (opcional)"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedFile || !tag || isLoading}
            >
              {isLoading ? "Carregando..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}