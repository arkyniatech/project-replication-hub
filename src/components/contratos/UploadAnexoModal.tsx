import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Image, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentoAnexo } from "./AnexosTab";

interface UploadAnexoModalProps {
  contratoId: string;
  documentosAtuais: DocumentoAnexo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function UploadAnexoModal({ contratoId, documentosAtuais, open, onOpenChange, onSuccess }: UploadAnexoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tag, setTag] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo permitido: 10MB');
      return;
    }

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
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-destructive" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return <Image className="w-8 h-8 text-primary" />;
    return <FileText className="w-8 h-8 text-muted-foreground" />;
  };

  const handleSubmit = async () => {
    if (!selectedFile || !tag) {
      setError('Selecione um arquivo e uma tag');
      return;
    }

    setIsLoading(true);

    try {
      // Get current user name
      const { data: { user } } = await supabase.auth.getUser();
      let usuarioNome = 'Usuário';
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('pessoa_id, pessoas(nome)')
          .eq('id', user.id)
          .single();
        if (profile?.pessoas && typeof profile.pessoas === 'object' && 'nome' in profile.pessoas) {
          usuarioNome = (profile.pessoas as any).nome || 'Usuário';
        }
      }

      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const uniqueName = `${Date.now()}_${selectedFile.name}`;
      const storagePath = `${contratoId}/${uniqueName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('contratos-anexos')
        .upload(storagePath, selectedFile);

      if (uploadError) throw uploadError;

      // Build metadata
      const novoDoc: DocumentoAnexo = {
        id: crypto.randomUUID(),
        nome: selectedFile.name,
        path: storagePath,
        tipo: fileExt,
        tamanho: selectedFile.size,
        tag: tag as DocumentoAnexo['tag'],
        observacao: observacao.trim() || undefined,
        usuarioNome,
        createdAt: new Date().toISOString(),
      };

      // Append to contratos.documentos
      const updatedDocs = [...documentosAtuais, novoDoc];
      const { error: dbError } = await supabase
        .from('contratos')
        .update({ documentos: updatedDocs as any })
        .eq('id', contratoId);

      if (dbError) throw dbError;

      toast({ title: "Anexo adicionado", description: `${selectedFile.name} foi salvo com sucesso` });
      onSuccess();
      handleOpenChange(false);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao fazer upload do arquivo');
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
                      <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); setSelectedFile(null); setError(''); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Clique para selecionar arquivo</p>
                    <p className="text-sm text-muted-foreground">PDF, JPG ou PNG (máx. 10MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>

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
                <SelectItem value="FOTO">Foto</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!selectedFile || !tag || isLoading}>
              {isLoading ? "Enviando..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
