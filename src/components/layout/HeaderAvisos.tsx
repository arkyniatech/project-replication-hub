import { useState, useEffect } from "react";
import { useSupabaseAvisos } from "@/hooks/useSupabaseAvisos";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
const tipoIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  urgent: AlertCircle
};
const tipoClasses = {
  info: "text-blue-600 bg-blue-50 border-blue-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  success: "text-green-600 bg-green-50 border-green-200",
  urgent: "text-red-600 bg-red-50 border-red-200"
};
export function HeaderAvisos() {
  const {
    getAvisosAtivos,
    configHeader
  } = useSupabaseAvisos();
  const [avisoAtual, setAvisoAtual] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const avisosAtivos = getAvisosAtivos();

  // Rotação automática de avisos
  useEffect(() => {
    if (avisosAtivos.length <= 1) return;
    const interval = setInterval(() => {
      if (configHeader?.animacao) {
        setIsVisible(false);
        setTimeout(() => {
          setAvisoAtual(prev => (prev + 1) % avisosAtivos.length);
          setIsVisible(true);
        }, 150);
      } else {
        setAvisoAtual(prev => (prev + 1) % avisosAtivos.length);
      }
    }, (configHeader?.tempo_rotacao ?? 5) * 1000);
    return () => clearInterval(interval);
  }, [avisosAtivos.length, configHeader]);

  // Se não há avisos ativos, mostra o fallback
  if (avisosAtivos.length === 0) {
    return <div className="flex items-center gap-2">
        {configHeader?.exibir_logo && <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">LH</span>
          </div>}
        <span className="font-semibold text-lg">{APP_CONFIG.system.name}</span>
      </div>;
  }
  const aviso = avisosAtivos[avisoAtual];
  const IconComponent = tipoIcons[aviso.tipo];
  return <div className="flex items-center gap-3 min-w-0">
      {configHeader?.exibir_logo}
      
      <div className={cn("flex items-center gap-2 min-w-0 transition-opacity duration-150", configHeader?.animacao && !isVisible && "opacity-0")}>
        <IconComponent className={cn("w-4 h-4 flex-shrink-0", {
        "text-blue-600": aviso.tipo === 'info',
        "text-amber-600": aviso.tipo === 'warning',
        "text-green-600": aviso.tipo === 'success',
        "text-red-600": aviso.tipo === 'urgent'
      })} />
        
        <span className="font-medium text-sm truncate">
          {aviso.texto}
        </span>
        
        {avisosAtivos.length > 1 && <Badge variant="secondary" className="text-xs px-1.5 py-0.5 flex-shrink-0">
            {avisoAtual + 1}/{avisosAtivos.length}
          </Badge>}
      </div>
    </div>;
}