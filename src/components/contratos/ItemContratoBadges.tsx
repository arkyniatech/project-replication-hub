import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisponibilidadeBadge } from "./DisponibilidadeBadge";
import { ConflitoDisponibilidadeModal } from "./ConflitoDisponibilidadeModal";
import { useDisponibilidadeRT } from "@/hooks/useDisponibilidadeRT";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ItemContratoBadgesProps {
  equipamentoId?: string;
  modeloId?: string;
  tipoControle: 'SERIALIZADO' | 'SALDO';
  quantidade: number;
  periodo: {
    inicio: string;
    fim: string;
  };
  equipamentoNome: string;
  contratoId?: string;
  onConflictoResolvido?: (resolucao: 'ignorar' | 'alternativa' | 'cancelar', dados?: any) => void;
  disabled?: boolean;
}

export function ItemContratoBadges({
  equipamentoId,
  modeloId,
  tipoControle,
  quantidade,
  periodo,
  equipamentoNome,
  contratoId,
  onConflictoResolvido,
  disabled = false
}: ItemContratoBadgesProps) {
  const [showConflitoModal, setShowConflitoModal] = useState(false);
  
  const { resultado, loading } = useDisponibilidadeRT({
    equipamentoId,
    modeloId,
    tipoControle,
    quantidade,
    periodo,
    contratoAtualId: contratoId
  });

  const handleBadgeClick = () => {
    if (disabled || loading) return;
    
    // Só abre modal se há conflitos ou não está disponível
    if (!resultado.disponivel || resultado.conflitos.length > 0) {
      setShowConflitoModal(true);
    }
  };

  const handleIgnorarConflito = () => {
    onConflictoResolvido?.('ignorar');
  };

  const handleUsarAlternativa = (alternativa: any) => {
    onConflictoResolvido?.('alternativa', alternativa);
  };

  const handleCancelar = () => {
    onConflictoResolvido?.('cancelar');
  };

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        Verificando...
      </Badge>
    );
  }

  return (
    <>
      <div 
        className={`inline-block ${!disabled && (!resultado.disponivel || resultado.conflitos.length > 0) ? 'cursor-pointer' : ''}`}
        onClick={handleBadgeClick}
      >
        <DisponibilidadeBadge 
          resultado={resultado}
          className={disabled ? 'opacity-50' : ''}
        />
      </div>

      <ConflitoDisponibilidadeModal
        open={showConflitoModal}
        onOpenChange={setShowConflitoModal}
        resultado={resultado}
        equipamentoNome={equipamentoNome}
        onIgnorarConflito={handleIgnorarConflito}
        onUsarAlternativa={handleUsarAlternativa}
        onCancelar={handleCancelar}
      />
    </>
  );
}