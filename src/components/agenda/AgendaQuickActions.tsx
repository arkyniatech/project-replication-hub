import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Eye, Plus } from 'lucide-react';
import { AgendaDia } from '@/types/disponibilidade';
import { useToast } from '@/hooks/use-toast';

interface AgendaQuickActionsProps {
  dia: AgendaDia;
  equipamentoId: string;
  equipamentoNome: string;
  tipo: 'SERIE' | 'SALDO';
}

export function AgendaQuickActions({ 
  dia, 
  equipamentoId, 
  equipamentoNome, 
  tipo 
}: AgendaQuickActionsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAbrirContrato = () => {
    if (dia.contratoNumero) {
      toast({
        title: "Abrindo contrato",
        description: `Contrato ${dia.contratoNumero} - ${dia.clienteNome}`,
      });
      
      // Simular navegação para contrato
      setTimeout(() => {
        window.open(`/contratos/${dia.contratoNumero}`, '_blank');
      }, 500);
    }
  };

  const handlePreReservar = async () => {
    setLoading(true);
    
    try {
      // Simular criação de pré-reserva
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Pré-reserva criada",
        description: `${equipamentoNome} pré-reservado para ${new Date(dia.dateISO).toLocaleDateString('pt-BR')}`,
      });
      
      // Emit event to update agenda
      window.dispatchEvent(new CustomEvent('agenda:pre-reserva', {
        detail: { 
          equipamentoId, 
          dataISO: dia.dateISO,
          tipo 
        }
      }));
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a pré-reserva.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisualizarDetalhes = () => {
    toast({
      title: "Detalhes do período",
      description: `${equipamentoNome} em ${new Date(dia.dateISO).toLocaleDateString('pt-BR')}`,
    });
  };

  const getStatusColor = () => {
    switch (dia.status) {
      case 'LOCADO': return 'bg-red-100 text-red-800 border-red-200';
      case 'RESERVADO': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'REVISAO': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DISPONIVEL': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (dia.status) {
      case 'LOCADO': return 'Locado';
      case 'RESERVADO': return 'Reservado';
      case 'REVISAO': return 'Em Revisão';
      case 'DISPONIVEL': return 'Disponível';
      default: return 'N/A';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge className={getStatusColor()}>
          {getStatusText()}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(dia.dateISO).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {dia.contratoNumero && dia.clienteNome && (
        <div className="text-xs space-y-1">
          <p className="font-medium">Contrato: {dia.contratoNumero}</p>
          <p className="text-muted-foreground">Cliente: {dia.clienteNome}</p>
        </div>
      )}

      <div className="flex gap-1">
        {dia.contratoNumero ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAbrirContrato}
            className="flex-1 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            Abrir Contrato
          </Button>
        ) : dia.status === 'DISPONIVEL' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreReservar}
            disabled={loading}
            className="flex-1 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {loading ? 'Reservando...' : 'Pré-reservar'}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVisualizarDetalhes}
            className="flex-1 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Detalhes
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2">
              •••
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleVisualizarDetalhes}>
              <Eye className="h-4 w-4 mr-2" />
              Visualizar Detalhes
            </DropdownMenuItem>
            
            {dia.status === 'DISPONIVEL' && (
              <DropdownMenuItem onClick={handlePreReservar} disabled={loading}>
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Reservando...' : 'Pré-reservar'}
              </DropdownMenuItem>
            )}
            
            {dia.contratoNumero && (
              <DropdownMenuItem onClick={handleAbrirContrato}>
                <FileText className="h-4 w-4 mr-2" />
                Abrir Contrato
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}