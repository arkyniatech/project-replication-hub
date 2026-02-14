import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProximoPassoSnackbarProps {
  tipo: 'recebimento-parcial' | 'fatura-emitida' | 'manutencao-agendada';
  dados?: any;
  onAction?: () => void;
}

export default function ProximoPassoSnackbar({ tipo, dados, onAction }: ProximoPassoSnackbarProps) {
  const [visible, setVisible] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se usuário optou por não mostrar hoje
    const hoje = new Date().toISOString().split('T')[0];
    const naoMostrarHoje = localStorage.getItem(`proximoPasso_${tipo}_${hoje}`) === 'false';
    
    if (naoMostrarHoje) {
      setVisible(false);
      return;
    }

    // Countdown de 5 segundos
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setVisible(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tipo]);

  const handleAction = () => {
    setVisible(false);
    onAction?.();
    
    switch (tipo) {
      case 'recebimento-parcial':
        toast({
          title: "2ª via gerada",
          description: "Segunda via do saldo foi gerada (mock).",
        });
        break;
      case 'fatura-emitida':
        toast({
          title: "WhatsApp enviado",
          description: "Fatura enviada por WhatsApp (mock).",
        });
        break;
      case 'manutencao-agendada':
        toast({
          title: "Agendamento aberto",
          description: "Modal de devolução/substituição aberto.",
        });
        break;
    }
  };

  const handleNaoMostrarHoje = () => {
    const hoje = new Date().toISOString().split('T')[0];
    localStorage.setItem(`proximoPasso_${tipo}_${hoje}`, 'false');
    setVisible(false);
  };

  const getContent = () => {
    switch (tipo) {
      case 'recebimento-parcial':
        return {
          titulo: "Recebimento parcial registrado",
          pergunta: "Gerar 2ª via do saldo?",
          acao: "📄 2ª Via"
        };
      case 'fatura-emitida':
        return {
          titulo: "Fatura emitida com sucesso",
          pergunta: "Enviar agora por WhatsApp?",
          acao: "📱 Enviar"
        };
      case 'manutencao-agendada':
        return {
          titulo: "Manutenção agendada",
          pergunta: "Agendar devolução/substituição?",
          acao: "📅 Agendar"
        };
      default:
        return { titulo: "", pergunta: "", acao: "" };
    }
  };

  if (!visible) return null;

  const content = getContent();

  return (
    <div className="fixed top-20 right-4 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm z-50 animate-in slide-in-from-top">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{content.titulo}</span>
        <button 
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {content.pergunta} ({countdown}s)
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAction}>
          {content.acao}
        </Button>
        <Button size="sm" variant="outline" onClick={handleNaoMostrarHoje}>
          Não hoje
        </Button>
      </div>
    </div>
  );
}