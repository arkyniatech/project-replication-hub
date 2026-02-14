import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DeprecatedV1Banner() {
  const navigate = useNavigate();

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-6">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-orange-800">
          <strong className="font-semibold">Versão antiga</strong> — Esta é a versão V1 do formulário de contrato, que será descontinuada em breve.
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/contratos/novo')}
          className="border-orange-300 text-orange-700 hover:bg-orange-100 ml-4"
        >
          Usar V2 (Nova versão) <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}