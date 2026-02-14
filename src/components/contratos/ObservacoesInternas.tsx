import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, FileText } from "lucide-react";

interface ObservacoesInternasProps {
  contratoId: string;
  observacoes?: string;
  onSave: (texto: string) => void;
}

export function ObservacoesInternas({
  contratoId,
  observacoes = "",
  onSave
}: ObservacoesInternasProps) {
  const [texto, setTexto] = useState(observacoes);
  const [showSaved, setShowSaved] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setTexto(observacoes);
  }, [observacoes]);

  const handleChange = (value: string) => {
    setTexto(value);
    setIsTyping(true);
    setShowSaved(false);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleBlur = () => {
    if (texto !== observacoes) {
      onSave(texto);
      setShowSaved(true);
      
      // Hide "Salvo" feedback after 2 seconds
      setTimeout(() => setShowSaved(false), 2000);
    }
    setIsTyping(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Observações Internas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`obs-${contratoId}`} className="text-sm text-muted-foreground">
              Observações internas (visível apenas internamente)
            </Label>
            
            {showSaved && (
              <div className="flex items-center gap-1 text-emerald-600 text-xs">
                <Check className="h-3 w-3" />
                <span>Salvo</span>
              </div>
            )}
          </div>
          
          <Textarea
            id={`obs-${contratoId}`}
            placeholder="Digite suas observações internas sobre este contrato..."
            value={texto}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="min-h-[100px] resize-none"
            rows={4}
          />
          
          {isTyping && (
            <p className="text-xs text-muted-foreground">
              As alterações serão salvas automaticamente...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}