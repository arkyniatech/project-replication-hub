import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { ChecklistExec } from "../types";
import {
  templateParaItensExec,
  motivoBloqueioLiberacao,
  ROTULO_BLOQUEIO,
  type ChecklistTemplateRow,
} from "@/lib/checklist-os-utils";

interface ChecklistRunnerProps {
  osId: string;
  /** Template já resolvido pela tela; null = nenhum aplicável. */
  template: ChecklistTemplateRow | null;
  /** Checklist já executado e gravado em `ordens_servico.checklist`, se houver. */
  checklistSalvo?: ChecklistExec | null;
  salvando?: boolean;
  onSave: (osId: string, checklist: ChecklistExec) => void;
}

export default function ChecklistRunner({
  osId,
  template,
  checklistSalvo,
  salvando,
  onSave,
}: ChecklistRunnerProps) {
  // Itens vêm do template. Sem template não há checklist para preencher —
  // mostrar itens de exemplo seria pedir uma assinatura em cima de nada.
  const [checklist, setChecklist] = useState<Partial<ChecklistExec>>(
    checklistSalvo || {
      tipo: template?.tipo ?? 'PREVENTIVA',
      itens: templateParaItensExec(template?.itens),
      testeMinOk: false,
      assinaturaMecanico: '',
      resultado: 'NAO_APTO'
    }
  );

  if (!template && !checklistSalvo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-foreground">
              Nenhum template de checklist aplicável a esta OS
            </p>
            <p className="text-sm mt-1">
              Cadastre um template do tipo {checklistSalvo?.tipo ?? 'correspondente'} — genérico
              ou para o modelo deste equipamento — em Manutenção &gt; Checklists.
            </p>
            <p className="text-sm mt-2">
              Sem checklist, o equipamento não pode ser liberado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    const checklistCompleto: ChecklistExec = {
      id: `chk-${Date.now()}`,
      osId,
      dtFim: new Date().toISOString(),
      ...checklist as ChecklistExec
    };

    onSave(osId, checklistCompleto);
  };

  const bloqueio = motivoBloqueioLiberacao(checklist);
  const totalCriticos = (checklist.itens || []).filter((i) => i.critico).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Checklist {checklist.tipo}</span>
          {totalCriticos > 0 && (
            <Badge variant="outline" className="font-normal">
              {totalCriticos} {totalCriticos === 1 ? 'item crítico' : 'itens críticos'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.itens?.map((item, index) => (
          <div key={item.idItem} className="flex items-start gap-3 p-3 border rounded">
            <Checkbox
              id={`item-${item.idItem}`}
              checked={item.ok || false}
              onCheckedChange={(checked) => {
                const novosItens = [...(checklist.itens || [])];
                novosItens[index] = { ...item, ok: !!checked };
                setChecklist(prev => ({ ...prev, itens: novosItens }));
              }}
            />
            <div className="flex-1">
              <label
                htmlFor={`item-${item.idItem}`}
                className="font-medium flex items-center gap-2 cursor-pointer"
              >
                {item.titulo}
                {item.critico && (
                  <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    CRÍTICO
                  </span>
                )}
              </label>
              <Textarea
                placeholder="Observações..."
                value={item.obs || ''}
                onChange={(e) => {
                  const novosItens = [...(checklist.itens || [])];
                  novosItens[index] = { ...item, obs: e.target.value };
                  setChecklist(prev => ({ ...prev, itens: novosItens }));
                }}
                className="mt-2 text-sm"
              />
            </div>
          </div>
        ))}

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Checkbox
              id="teste-minimo"
              checked={checklist.testeMinOk}
              onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, testeMinOk: !!checked }))}
            />
            <label htmlFor="teste-minimo" className="font-medium cursor-pointer">
              Teste mínimo OK
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="resultado-apto"
              checked={checklist.resultado === 'APTO'}
              onCheckedChange={(checked) =>
                setChecklist(prev => ({ ...prev, resultado: checked ? 'APTO' : 'NAO_APTO' }))
              }
            />
            <label htmlFor="resultado-apto" className="font-medium cursor-pointer">
              Equipamento apto para locação
            </label>
          </div>

          <div>
            <label htmlFor="assinatura-mecanico" className="block font-medium mb-2">
              Assinatura do Mecânico
            </label>
            <Input
              id="assinatura-mecanico"
              value={checklist.assinaturaMecanico}
              onChange={(e) => setChecklist(prev => ({ ...prev, assinaturaMecanico: e.target.value }))}
              placeholder="Nome do mecânico responsável"
            />
          </div>

          {/* Diz o que falta antes de o mecânico tentar liberar e tomar um toast
              de erro — a mutation continua sendo quem decide. */}
          {bloqueio && (
            <p className="text-sm text-muted-foreground border rounded p-3">
              {ROTULO_BLOQUEIO[bloqueio]}
            </p>
          )}

          <Button onClick={handleSave} className="w-full" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar Checklist'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
