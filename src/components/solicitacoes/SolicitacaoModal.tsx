import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { useSupabaseClientes } from '@/hooks/useSupabaseClientes';
import { useSupabaseContratos } from '@/hooks/useSupabaseContratos';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { Loader2 } from 'lucide-react';
import type { CriarSolicitacaoDTO, TipoSolicitacao, PrioridadeSolicitacao } from '@/types/solicitacao-manutencao';

interface SolicitacaoModalProps {
  open: boolean;
  onClose: () => void;
  solicitacaoId?: string;
}

const nomeCliente = (c: any): string =>
  c?.tipo === 'PF' ? (c?.nome || c?.nome_razao || 'Cliente') : (c?.razao_social || c?.nome || 'Cliente');

export function SolicitacaoModal({ open, onClose, solicitacaoId }: SolicitacaoModalProps) {
  const { useSolicitacao, criarSolicitacao, isCriando } = useSupabaseSolicitacoes();
  const { data: solicitacao, isLoading } = useSolicitacao(solicitacaoId || '');

  const { lojaAtual } = useMultiunidade();
  const lojaId = lojaAtual?.id || '';

  const [clienteId, setClienteId] = useState('');
  const [contratoId, setContratoId] = useState('');
  const [tipo, setTipo] = useState<TipoSolicitacao>('SUPORTE_CAMPO');
  const [prioridade, setPrioridade] = useState<PrioridadeSolicitacao>('MEDIA');
  const [sintomas, setSintomas] = useState('');

  const { clientes = [] } = useSupabaseClientes(lojaId);
  // Contratos do cliente selecionado (para linkar o contrato à solicitação — #44).
  const { contratos = [] } = useSupabaseContratos(lojaId, clienteId || undefined);

  // Pré-preenche no modo edição
  useEffect(() => {
    if (solicitacao) {
      setClienteId(solicitacao.cliente_id || '');
      setContratoId(solicitacao.contrato_id || '');
      setTipo(solicitacao.tipo);
      setPrioridade(solicitacao.prioridade);
      setSintomas(solicitacao.sintomas);
    }
  }, [solicitacao]);

  // Ao trocar de cliente, limpa o contrato selecionado (não pertence ao novo cliente).
  const handleClienteChange = (id: string) => {
    setClienteId(id);
    setContratoId('');
  };

  const clienteSelecionado = clientes.find((c: any) => c.id === clienteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lojaId || !clienteId || !contratoId || !sintomas.trim()) {
      return;
    }

    try {
      await criarSolicitacao({
        loja_id: lojaId,
        contrato_id: contratoId,
        cliente_id: clienteId,
        cliente_nome: nomeCliente(clienteSelecionado),
        tipo,
        prioridade,
        sintomas: sintomas.trim(),
        itens: [],
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
    }
  };

  const podeEnviar = !!lojaId && !!clienteId && !!contratoId && !!sintomas.trim() && !isCriando;

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
              <Label htmlFor="cliente">Cliente *</Label>
              <select
                id="cliente"
                value={clienteId}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                required
              >
                <option value="">Selecione o cliente...</option>
                {clientes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {nomeCliente(c)}{c.documento ? ` — ${c.documento}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Contrato (linkado ao cliente) */}
            <div className="space-y-2">
              <Label htmlFor="contrato">Contrato *</Label>
              <select
                id="contrato"
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 disabled:opacity-50"
                required
                disabled={!clienteId}
              >
                <option value="">
                  {!clienteId
                    ? 'Selecione o cliente primeiro'
                    : contratos.length === 0
                      ? 'Nenhum contrato para este cliente'
                      : 'Selecione o contrato...'}
                </option>
                {contratos.map((ct: any) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.numero}{ct.status ? ` — ${ct.status}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Solicitação *</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoSolicitacao)}
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
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as PrioridadeSolicitacao)}
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
                value={sintomas}
                onChange={(e) => setSintomas(e.target.value)}
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
              <Button type="submit" disabled={!podeEnviar}>
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
