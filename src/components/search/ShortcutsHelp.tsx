import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Keyboard, Search, FileText } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isShortcutsDisabled: boolean;
  onToggleShortcuts: () => void;
}

export function ShortcutsHelp({ 
  open, 
  onOpenChange, 
  isShortcutsDisabled, 
  onToggleShortcuts 
}: ShortcutsHelpProps) {
  const shortcuts = [
    {
      category: "Busca",
      icon: Search,
      items: [
        { key: "Ctrl + /", description: "Abrir busca global" },
        { key: "Ctrl + K", description: "Abrir busca global (alternativo)" },
        { key: "Esc", description: "Fechar busca" },
        { key: "↑ ↓", description: "Navegar resultados" },
        { key: "Enter", description: "Abrir item selecionado" },
        { key: "Shift + Enter", description: "Ação secundária" },
      ]
    },
    {
      category: "Busca Avançada",
      icon: FileText,
      items: [
        { key: "@cliente", description: "Filtrar apenas clientes" },
        { key: "@contrato", description: "Filtrar apenas contratos" },
        { key: "@titulo", description: "Filtrar apenas títulos" },
        { key: "@equip", description: "Filtrar apenas equipamentos" },
        { key: "#vencidos", description: "Títulos vencidos" },
        { key: "#ativos", description: "Contratos ativos" },
        { key: "#disponiveis", description: "Equipamentos disponíveis" },
      ]
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Acelere seu trabalho com atalhos de teclado e busca inteligente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Estado dos atalhos globais:
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={isShortcutsDisabled ? "destructive" : "default"}>
                {isShortcutsDisabled ? "Desabilitados" : "Habilitados"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleShortcuts}
              >
                {isShortcutsDisabled ? "Habilitar" : "Desabilitar"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            {shortcuts.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.category} className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-sm">
                    <Icon className="h-4 w-4" />
                    {section.category}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{item.description}</span>
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground">Dicas:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Os atalhos só funcionam quando não há campos de texto em foco</li>
              <li>Use @ para filtrar por tipo: @cliente João, @contrato LOC-001</li>
              <li>Use # para filtros especiais: #vencidos, #ativos, #disponiveis</li>
              <li>Digite códigos diretos: LOC-001, FAT-123 para ir direto ao item</li>
              <li>Shift + Enter executa ações secundárias nos resultados</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}