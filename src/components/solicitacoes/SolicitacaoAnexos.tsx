import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { Upload, FileImage, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SolicitacaoAnexo } from '@/types/solicitacao-manutencao';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SolicitacaoAnexosProps {
  solicitacaoId: string;
  anexos: SolicitacaoAnexo[];
}

export function SolicitacaoAnexos({ solicitacaoId, anexos }: SolicitacaoAnexosProps) {
  const { uploadAnexo, isUploadingAnexo } = useSupabaseSolicitacoes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<'FOTO' | 'DOC' | null>(null);

  const handleUpload = async (tipo: 'FOTO' | 'DOC') => {
    setUploadingType(tipo);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingType) return;

    try {
      await uploadAnexo({
        solicitacaoId,
        file,
        tipo: uploadingType,
      });
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadingType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (anexo: SolicitacaoAnexo) => {
    try {
      const { data, error } = await supabase.storage
        .from('manutencao-anexos')
        .download(anexo.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = anexo.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={() => handleUpload('FOTO')}
          disabled={isUploadingAnexo}
          variant="outline"
        >
          {isUploadingAnexo && uploadingType === 'FOTO' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileImage className="mr-2 h-4 w-4" />
          )}
          Adicionar Foto
        </Button>
        <Button
          onClick={() => handleUpload('DOC')}
          disabled={isUploadingAnexo}
          variant="outline"
        >
          {isUploadingAnexo && uploadingType === 'DOC' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Adicionar Documento
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={uploadingType === 'FOTO' ? 'image/*' : '.pdf,.doc,.docx'}
      />

      {anexos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Upload className="h-12 w-12 mb-2 opacity-50" />
          <p>Nenhum anexo ainda</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              className="group relative rounded-lg border bg-card p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-2">
                {anexo.tipo === 'FOTO' ? (
                  <FileImage className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{anexo.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(anexo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {anexo.size_bytes && (
                    <p className="text-xs text-muted-foreground">
                      {(anexo.size_bytes / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(anexo)}
                  className="h-7"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
