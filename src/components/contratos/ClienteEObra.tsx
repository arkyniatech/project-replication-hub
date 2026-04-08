import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MapPin, MessageCircle, CreditCard } from "lucide-react";
import { useState } from "react";
import { CobrancaUnicaModal } from "./CobrancaUnicaModal";
import { useRbac } from "@/hooks/useRbac";

interface Cliente {
  id?: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
}

interface Obra {
  logradouro: string;
  numero: string;
  comp?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

interface ClienteEObraProps {
  cliente: Cliente;
  obra: Obra | null;
}

export function ClienteEObra({ cliente, obra }: ClienteEObraProps) {
  const [cobrancaUnicaOpen, setCobrancaUnicaOpen] = useState(false);
  const { anyOf } = useRbac();

  const canAccessCobranca = anyOf(['financeiro.cr:view', 'financeiro.cr:emitir-bolepix', 'contratos:view']);

  const formatWhatsAppLink = (telefone: string) => {
    const digits = telefone.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </div>
              {canAccessCobranca && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCobrancaUnicaOpen(true)}
                  className="text-xs"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Cobrança
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome/Razão</p>
              <p className="font-medium">{cliente.nome}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Documento</p>
              <p className="font-medium">{cliente.documento}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">E-mail</p>
              <p className="font-medium">{cliente.email}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <div className="flex items-center gap-2">
                <p className="font-medium">{cliente.telefone}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  asChild
                >
                  <a 
                    href={formatWhatsAppLink(cliente.telefone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {obra && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço da Obra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Logradouro</p>
                <p className="font-medium">
                  {obra.logradouro}, {obra.numero}
                  {obra.comp && `, ${obra.comp}`}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Bairro</p>
                <p className="font-medium">{obra.bairro}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Cidade/UF</p>
                <p className="font-medium">{obra.cidade}/{obra.uf}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">CEP</p>
                <p className="font-medium">{obra.cep}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CobrancaUnicaModal
        open={cobrancaUnicaOpen}
        onClose={() => setCobrancaUnicaOpen(false)}
        clienteId={cliente.id || 'temp-client-id'}
        clienteNome={cliente.nome}
        clienteDoc={cliente.documento}
      />
    </>
  );
}