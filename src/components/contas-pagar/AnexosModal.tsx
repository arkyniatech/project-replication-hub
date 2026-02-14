import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSupabaseTitulosPagar } from '@/hooks/useSupabaseTitulosPagar';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import { Upload, Download, Trash2, Edit2, FileText, Image, File, X } from 'lucide-react';

interface AnexosModalProps {
  open: boolean;
  onClose: () => void;
  tipo: 'titulo' | 'parcela';
  id: string | null;
  nome: string;
}

interface Anexo {
  id: string;
  nome: string;
  tamanho: number;
  tipo: string;
  dataUpload: string;
  usuario: string;
}

function getFileIcon(tipo: string) {
  if (tipo.startsWith('image/')) {
    return <Image className="w-8 h-8 text-blue-500" />;
  } else if (tipo === 'application/pdf') {
    return <FileText className="w-8 h-8 text-red-500" />;
  } else {
    return <File className="w-8 h-8 text-gray-500" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function AnexosModal({ open, onClose, tipo, id, nome }: AnexosModalProps) {
  const { titulos, updateTitulo } = useSupabaseTitulosPagar();
  const { parcelas, updateParcela } = useSupabaseParcelasPagar();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');

  useEffect(() => {
    if (!open || !id) return;

    if (tipo === 'titulo') {
      const titulo = titulos.find(t => t.id === id);
      if (titulo?.anexos && Array.isArray(titulo.anexos)) {
        setAnexos(titulo.anexos as Anexo[]);
      }
    } else if (tipo === 'parcela') {
      const parcela = parcelas.find(p => p.id === id);
      if (parcela?.anexos && Array.isArray(parcela.anexos)) {
        setAnexos(parcela.anexos as Anexo[]);
      }
    }
  }, [open, id, tipo, titulos, parcelas]);

  if (!open || !id) return null;

  const adicionarAnexos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const novosAnexos = files.map(file => ({
      id: `anexo-${Date.now()}-${Math.random()}`,
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      dataUpload: new Date().toISOString(),
      usuario: 'Admin'
    }));

    const anexosAtualizados = [...anexos, ...novosAnexos];
    setAnexos(anexosAtualizados);

    try {
      if (tipo === 'titulo') {
        await updateTitulo.mutateAsync({
          id,
          anexos: anexosAtualizados
        });
      } else if (tipo === 'parcela') {
        await updateParcela.mutateAsync({
          id,
          anexos: anexosAtualizados
        });
      }

      toast.success(`${files.length} anexo(s) adicionado(s)`);
    } catch (error) {
      toast.error("Erro ao adicionar anexos");
    }
  };

  const baixarAnexo = (anexo: Anexo) => {
    toast.info(`Baixando ${anexo.nome}...`);
  };

  const iniciarEdicaoNome = (anexo: Anexo) => {
    setEditandoId(anexo.id);
    setNovoNome(anexo.nome);
  };

  const salvarNovoNome = async (anexoId: string) => {
    if (!novoNome.trim()) {
      toast.error("O nome do arquivo não pode estar vazio");
      return;
    }

    const anexosAtualizados = anexos.map(anexo => 
      anexo.id === anexoId ? { ...anexo, nome: novoNome.trim() } : anexo
    );
    
    setAnexos(anexosAtualizados);

    try {
      if (tipo === 'titulo') {
        await updateTitulo.mutateAsync({ id, anexos: anexosAtualizados });
      } else {
        await updateParcela.mutateAsync({ id, anexos: anexosAtualizados });
      }
      
      setEditandoId(null);
      setNovoNome('');
      toast.success("Nome atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar nome");
    }
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNovoNome('');
  };

  const removerAnexo = async (anexoId: string) => {
    const anexo = anexos.find(a => a.id === anexoId);
    const anexosAtualizados = anexos.filter(a => a.id !== anexoId);
    
    setAnexos(anexosAtualizados);

    try {
      if (tipo === 'titulo') {
        await updateTitulo.mutateAsync({ id, anexos: anexosAtualizados });
      } else {
        await updateParcela.mutateAsync({ id, anexos: anexosAtualizados });
      }
      
      toast.success(`${anexo?.nome} removido`);
    } catch (error) {
      toast.error("Erro ao remover anexo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Anexos - {nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload de Novos Anexos */}
          <Card>
            <CardContent className="p-6">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Adicionar Anexos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Formatos aceitos: PDF, JPG, PNG (máx. 10MB por arquivo)
                </p>
                
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={adicionarAnexos}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Selecionar Arquivos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Anexos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Anexos Existentes ({anexos.length})
            </h3>
            
            {anexos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum anexo encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anexos.map((anexo) => (
                  <Card key={anexo.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getFileIcon(anexo.tipo)}
                        
                        <div className="flex-1 min-w-0">
                          {editandoId === anexo.id ? (
                            <div className="space-y-2">
                              <Input
                                value={novoNome}
                                onChange={(e) => setNovoNome(e.target.value)}
                                className="text-sm"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => salvarNovoNome(anexo.id)}
                                >
                                  Salvar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={cancelarEdicao}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-sm truncate" title={anexo.nome}>
                                {anexo.nome}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(anexo.tamanho)} • 
                                {new Date(anexo.dataUpload).toLocaleDateString('pt-BR')} • 
                                {anexo.usuario}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {editandoId !== anexo.id && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => baixarAnexo(anexo)}
                              title="Baixar"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => iniciarEdicaoNome(anexo)}
                              title="Renomear"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removerAnexo(anexo.id)}
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end pt-4 border-t">
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}