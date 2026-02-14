import { useState } from 'react';
import { Building2, MapPin, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useMultiunidade } from '@/hooks/useMultiunidade';

interface Loja {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

interface SelecaoLojaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelecaoLojaModal({ open, onOpenChange }: SelecaoLojaModalProps) {
  const { lojasPermitidas, selecionarLoja, canViewAllLojas } = useMultiunidade();
  const [lembraEscolha, setLembraEscolha] = useState(false);
  const [selectedLoja, setSelectedLoja] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canSeeAll = canViewAllLojas();

  const handleEntrarLoja = (lojaIdOrAll: string) => {
    setLoading(true);
    console.log('Entrando na loja:', lojaIdOrAll);
    selecionarLoja(lojaIdOrAll, lembraEscolha);
    // O modal será fechado automaticamente após o reload da página
  };

  const handleSelectLoja = (lojaId: string) => {
    setSelectedLoja(lojaId);
  };

  const handleConfirmarSelecao = () => {
    if (selectedLoja) {
      handleEntrarLoja(selectedLoja);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Escolha a Unidade de Trabalho
          </DialogTitle>
          <DialogDescription>
            Selecione a loja que deseja acessar. Seus dados e operações ficarão restritos à unidade escolhida.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opção "Todas as lojas" para Admin/Gestor */}
          {canSeeAll && (
            <>
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedLoja === 'TODAS' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedLoja('TODAS')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">🏢 Todas as Lojas</CardTitle>
                        <CardDescription className="font-medium text-primary">
                          Visão consolidada (Admin/Gestor)
                        </CardDescription>
                      </div>
                    </div>
                    {selectedLoja === 'TODAS' && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    Acesso a relatórios e dados de todas as unidades
                  </div>
                </CardContent>
              </Card>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    ou escolha uma loja específica
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lojasPermitidas.map((loja) => (
              <Card 
                key={loja.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedLoja === loja.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectLoja(loja.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{loja.nome}</CardTitle>
                        <CardDescription className="font-medium text-primary">
                          Código: {loja.codigo}
                        </CardDescription>
                      </div>
                    </div>
                    {selectedLoja === loja.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm text-muted-foreground">
                    ID: {loja.id}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Checkbox 
              id="lembrar"
              checked={lembraEscolha}
              onCheckedChange={(checked) => setLembraEscolha(checked as boolean)}
            />
            <label 
              htmlFor="lembrar"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Lembrar esta escolha por 24 horas
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={handleConfirmarSelecao}
              disabled={!selectedLoja || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Entrando...
                </div>
              ) : (
                "Entrar na Loja"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}