import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sugerirHorarios } from "@/lib/contratos-v2-utils";

interface AssistenteHorariosProps {
  janela: 'MANHA' | 'TARDE';
  onSelect: (horario: string) => void;
}

export function AssistenteHorarios({ janela, onSelect }: AssistenteHorariosProps) {
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const gerarSugestoes = async () => {
    setLoading(true);
    
    // Mock delay para simular processamento
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const novasSugestoes = Array.from({ length: 3 }, () => 
      sugerirHorarios(janela)
    ).filter((horario, index, arr) => arr.indexOf(horario) === index); // Remove duplicatas
    
    setSugestoes(novasSugestoes);
    setLoading(false);
  };

  const handleSelect = (horario: string) => {
    onSelect(horario);
    setSugestoes([]); // Limpar sugestões após seleção
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistente de Horários</span>
          <Badge variant="secondary" className="text-xs">
            {janela === 'MANHA' ? 'Manhã' : 'Tarde'}
          </Badge>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={gerarSugestoes}
          disabled={loading}
          className="gap-2"
        >
          <Zap className="h-3 w-3" />
          {loading ? 'Calculando...' : 'Sugerir Horário'}
        </Button>
      </div>

      {sugestoes.length > 0 && (
        <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Horários sugeridos para {janela === 'MANHA' ? 'manhã' : 'tarde'}:
            </span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {sugestoes.map((horario, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSelect(horario)}
                className="h-8 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {horario}
              </Button>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            💡 Sugestões baseadas em otimização de rota e disponibilidade
          </p>
        </div>
      )}
    </div>
  );
}