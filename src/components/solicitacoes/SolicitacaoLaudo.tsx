import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseSolicitacoes } from '@/hooks/useSupabaseSolicitacoes';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import type { TipoLaudo } from '@/types/solicitacao-manutencao';

interface SolicitacaoLaudoProps {
  solicitacaoId: string;
  laudo?: {
    tipo: TipoLaudo;
    conclusao: string;
    fotos?: string[];
    estimativa_valor?: number;
  };
}

export function SolicitacaoLaudo({ solicitacaoId, laudo }: SolicitacaoLaudoProps) {
  const { registrarLaudo, isRegistrandoLaudo } = useSupabaseSolicitacoes();
  const [formData, setFormData] = useState({
    tipo: laudo?.tipo || 'DESGASTE' as TipoLaudo,
    conclusao: laudo?.conclusao || '',
    estimativa_valor: laudo?.estimativa_valor || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.conclusao.trim()) {
      return;
    }

    try {
      await registrarLaudo({
        id: solicitacaoId,
        laudo: {
          tipo: formData.tipo,
          conclusao: formData.conclusao,
          estimativa_valor: formData.estimativa_valor > 0 ? formData.estimativa_valor : undefined,
        },
      });
    } catch (error) {
      console.error('Erro ao registrar laudo:', error);
    }
  };

  return (
    <div className="space-y-4">
      {laudo ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className={`p-2 rounded-lg ${
                laudo.tipo === 'MAU_USO' ? 'bg-destructive/10 text-destructive' :
                laudo.tipo === 'DESGASTE' ? 'bg-orange-500/10 text-orange-600' :
                'bg-muted text-muted-foreground'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {laudo.tipo === 'MAU_USO' ? 'Mau Uso Identificado' :
                   laudo.tipo === 'DESGASTE' ? 'Desgaste Natural' :
                   'Outros'}
                </h3>
                {laudo.estimativa_valor && laudo.estimativa_valor > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Estimativa: R$ {laudo.estimativa_valor.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{laudo.conclusao}</p>
            </div>
          </div>

          {laudo.tipo === 'MAU_USO' && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Laudo de mau uso registrado. Uma tarefa foi enviada ao Comercial para avaliação de aditivo de cobrança.
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Nenhum laudo registrado</p>
              <p className="text-sm text-muted-foreground">
                Registre um laudo técnico após diagnóstico do equipamento
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Laudo *</Label>
            <select
              id="tipo"
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoLaudo })}
              className="w-full rounded-md border bg-background px-3 py-2"
              required
            >
              <option value="DESGASTE">Desgaste Natural</option>
              <option value="MAU_USO">Mau Uso</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusao">Conclusão do Laudo *</Label>
            <Textarea
              id="conclusao"
              value={formData.conclusao}
              onChange={(e) => setFormData({ ...formData, conclusao: e.target.value })}
              placeholder="Descreva o diagnóstico técnico..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimativa">Estimativa de Valor (R$)</Label>
            <input
              id="estimativa"
              type="number"
              step="0.01"
              min="0"
              value={formData.estimativa_valor}
              onChange={(e) => setFormData({ ...formData, estimativa_valor: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </div>

          <Button type="submit" disabled={isRegistrandoLaudo} className="w-full">
            {isRegistrandoLaudo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Laudo
          </Button>
        </form>
      )}
    </div>
  );
}
