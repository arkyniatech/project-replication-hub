import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { Loader2 } from 'lucide-react';
import type { CriarSolicitacaoDTO, TipoSolicitacao, PrioridadeSolicitacao } from '@/types/solicitacao-manutencao';

interface SolicitacaoModalProps {
  open: boolean;
  onClose: () => void;
  solicitacaoId?: string;
}

export function SolicitacaoModal({ open, onClose, solicitacaoId }: SolicitacaoModalProps) {
  const { useSolicitacao, criarSolicitacao, isCriando } = useSupabaseSolicitacoes();
  const { data: solicitacao, isLoading } = useSolicitacao(solicitacaoId || '');

  const [formData, setFormData] = useState<Partial<CriarSolicitacaoDTO>>({
    loja_id: 'loja-mock-id', // Em produção, pegar do contexto
    tipo: 'SUPORTE_CAMPO',
    prioridade: 'MEDIA',
    sintomas: '',
    cliente_nome: '',
    itens: [],
  });

  useEffect(() => {
    if (solicitacao) {
      setFormData({
        loja_id: solicitacao.loja_id,
        contrato_id: solicitacao.contrato_id,
        cliente_id: solicitacao.cliente_id,
        cliente_nome: solicitacao.cliente_nome,
        tipo: solicitacao.tipo,
        prioridade: solicitacao.prioridade,
        sintomas: solicitacao.sintomas,
        itens: solicitacao.itens.map((item) => ({
          tipo: item.tipo,
          equip_id: item.equip_id || undefined,
          modelo_id: item.modelo_id,
          grupo_id: item.grupo_id,
          qtd: item.qtd,
          codigo_interno: item.codigo_interno || undefined,
        })),
      });
    }
  }, [solicitacao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_nome || !formData.sintomas) {
      return;
    }

    try {
      await criarSolicitacao({
        loja_id: formData.loja_id!,
        contrato_id: formData.contrato_id || 'mock-contrato-id', // Mock
        cliente_id: formData.cliente_id || 'mock-cliente-id', // Mock
        cliente_nome: formData.cliente_nome,
        tipo: formData.tipo as TipoSolicitacao,
        prioridade: formData.prioridade as PrioridadeSolicitacao,
        sintomas: formData.sintomas,
        itens: formData.itens || [],
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {solicitacaoId ? 'Editar Solicitação' : 'Nova Solicitação de Manutenção'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Cliente *</Label>
              <Input
                id="cliente_nome"
                value={formData.cliente_nome || ''}
                onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                placeholder="Nome do cliente"
                required
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Solicitação *</Label>
              <select
                id="tipo"
                value={formData.tipo || 'SUPORTE_CAMPO'}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoSolicitacao })}
                className="w-full rounded-md border bg-background px-3 py-2"
                required
              >
                <option value="SUPORTE_CAMPO">Suporte em Campo</option>
                <option value="TROCA_COM_SUBSTITUICAO">Troca com Substituição</option>
              </select>
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade *</Label>
              <select
                id="prioridade"
                value={formData.prioridade || 'MEDIA'}
                onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as PrioridadeSolicitacao })}
                className="w-full rounded-md border bg-background px-3 py-2"
                required
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>

            {/* Sintomas */}
            <div className="space-y-2">
              <Label htmlFor="sintomas">Sintomas / Descrição *</Label>
              <Textarea
                id="sintomas"
                value={formData.sintomas || ''}
                onChange={(e) => setFormData({ ...formData, sintomas: e.target.value })}
                placeholder="Descreva o problema relatado..."
                rows={4}
                required
              />
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {solicitacaoId ? 'Salvar' : 'Criar Solicitação'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
