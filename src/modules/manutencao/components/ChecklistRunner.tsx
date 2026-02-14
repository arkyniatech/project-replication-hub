import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChecklistExec, OSOficina } from "../types";

interface ChecklistRunnerProps {
  os: OSOficina;
  onSave: (osId: string, checklist: ChecklistExec) => void;
}

export default function ChecklistRunner({ os, onSave }: ChecklistRunnerProps) {
  const [checklist, setChecklist] = useState<Partial<ChecklistExec>>(
    os.checklist || {
      tipo: 'PREVENTIVA',
      itens: [
        { idItem: '1', titulo: 'Verificar nível de óleo', critico: true },
        { idItem: '2', titulo: 'Testar funcionamento', critico: true },
        { idItem: '3', titulo: 'Limpar filtros', critico: false },
      ],
      testeMinOk: false,
      assinaturaMecanico: '',
      resultado: 'NAO_APTO'
    }
  );

  const handleSave = () => {
    const checklistCompleto: ChecklistExec = {
      id: `chk-${Date.now()}`,
      osId: os.id,
      dtFim: new Date().toISOString(),
      ...checklist as ChecklistExec
    };
    
    onSave(os.id, checklistCompleto);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist {checklist.tipo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.itens?.map((item, index) => (
          <div key={item.idItem} className="flex items-start gap-3 p-3 border rounded">
            <Checkbox 
              checked={item.ok || false}
              onCheckedChange={(checked) => {
                const novosItens = [...(checklist.itens || [])];
                novosItens[index] = { ...item, ok: !!checked };
                setChecklist(prev => ({ ...prev, itens: novosItens }));
              }}
            />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                {item.titulo}
                {item.critico && <span className="text-red-500 text-xs">CRÍTICO</span>}
              </div>
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
              checked={checklist.testeMinOk}
              onCheckedChange={(checked) => setChecklist(prev => ({ ...prev, testeMinOk: !!checked }))}
            />
            <label className="font-medium">Teste mínimo OK</label>
          </div>

          <div>
            <label className="block font-medium mb-2">Assinatura do Mecânico</label>
            <Input 
              value={checklist.assinaturaMecanico}
              onChange={(e) => setChecklist(prev => ({ ...prev, assinaturaMecanico: e.target.value }))}
              placeholder="Nome do mecânico responsável"
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Salvar Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}