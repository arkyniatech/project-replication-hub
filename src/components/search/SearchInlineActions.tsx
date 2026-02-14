import { 
  CreditCard, 
  FileText, 
  RotateCcw, 
  Receipt, 
  DollarSign, 
  Wrench,
  MessageCircle,
  Package,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface InlineAction {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action: () => void;
}

interface SearchInlineActionsProps {
  type: 'cliente' | 'contrato' | 'titulo' | 'equipamento';
  item: any;
  onAction?: () => void;
}

export function SearchInlineActions({ type, item, onAction }: SearchInlineActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAction = (actionFn: () => void) => {
    actionFn();
    onAction?.();
  };

  const getActions = (): InlineAction[] => {
    switch (type) {
      case 'cliente':
        return [
          {
            id: 'novo-contrato',
            icon: FileText,
            label: 'Novo Contrato',
            shortcut: 'Shift+↵',
            disabled: item.statusCredito === 'Suspenso',
            action: () => navigate(`/contratos/novo?cliente=${item.id}`)
          },
          {
            id: 'cobrar',
            icon: MessageCircle,
            label: 'Cobrar',
            disabled: !item.inadimplente,
            action: () => navigate(`/contas-receber?cliente=${item.id}`)
          }
        ];
        
      case 'contrato':
        return [
          {
            id: 'renovar',
            icon: RotateCcw,
            label: 'Renovar',
            shortcut: 'Alt+R',
            disabled: item.status !== 'Ativo',
            action: () => toast({ title: "Renovação", description: "Modal de renovação em desenvolvimento" })
          },
          {
            id: 'devolucao',
            icon: Package,
            label: 'Devolução',
            shortcut: 'Alt+D',
            disabled: item.status !== 'Ativo',
            action: () => toast({ title: "Devolução", description: "Modal de devolução em desenvolvimento" })
          },
          {
            id: 'faturar',
            icon: Receipt,
            label: 'Faturar',
            disabled: item.status !== 'Ativo',
            action: () => navigate(`/faturas?contrato=${item.id}`)
          }
        ];
        
      case 'titulo':
        return [
          {
            id: 'receber',
            icon: CreditCard,
            label: 'Receber',
            shortcut: 'Alt+$',
            disabled: item.status === 'Quitado',
            action: () => navigate(`/contas-receber?tab=titulos&action=receber&titulo=${item.id}`)
          },
          {
            id: 'segunda-via',
            icon: Copy,
            label: '2ª via',
            shortcut: 'Alt+2',
            action: () => toast({ title: "2ª via", description: "Abrindo prévia da fatura" })
          },
          {
            id: 'cobrar',
            icon: MessageCircle,
            label: 'Cobrar',
            disabled: item.status === 'Quitado',
            action: () => toast({ title: "Cobrar", description: "Modal de cobrança em desenvolvimento" })
          }
        ];
        
      case 'equipamento':
        return [
          {
            id: 'manutencao',
            icon: Wrench,
            label: 'Enviar p/ Manutenção',
            shortcut: 'Alt+M',
            disabled: item.status === 'Manutenção' || item.status === 'Baixado',
            action: () => toast({ title: "Manutenção", description: "Equipamento enviado para manutenção" })
          },
          {
            id: 'criar-contrato',
            icon: FileText,
            label: 'Criar Contrato',
            disabled: item.status !== 'Disponível',
            action: () => navigate(`/contratos/novo?equipamento=${item.id}`)
          }
        ];
        
      default:
        return [];
    }
  };

  const actions = getActions().filter(action => !action.disabled);

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
      <TooltipProvider>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                  onClick={() => handleAction(action.action)}
                  aria-label={action.label}
                  tabIndex={-1}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {action.label}
                  {action.shortcut && ` (${action.shortcut})`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}