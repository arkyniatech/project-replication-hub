import { useState } from "react";
import { Zap, Mail, MessageCircle, CreditCard, FileText, Webhook, QrCode, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InterConfigForm } from "@/components/bolepix/InterConfigForm";
import { WhatsAppConfigForm } from "@/components/configuracoes/WhatsAppConfigForm";

interface IntegracaoStatus {
  id: string;
  nome: string;
  descricao: string;
  icon: any;
  status: "ativa" | "configurar" | "indisponivel";
  categoria: "pagamento" | "comunicacao" | "fiscal" | "webhook";
}

const integracoes: IntegracaoStatus[] = [
  {
    id: "banco-inter",
    nome: "Banco Inter (BolePix)",
    descricao: "Emissão de boletos com PIX integrado",
    icon: QrCode,
    status: "configurar",
    categoria: "pagamento"
  },
  {
    id: "email",
    nome: "E-mail (SMTP)",
    descricao: "Envio de e-mails transacionais",
    icon: Mail,
    status: "indisponivel",
    categoria: "comunicacao"
  },
  {
    id: "whatsapp",
    nome: "WhatsApp Business",
    descricao: "Conecte o WhatsApp da loja via QR Code",
    icon: MessageCircle,
    status: "configurar",
    categoria: "comunicacao"
  },
  {
    id: "stripe",
    nome: "Stripe",
    descricao: "Pagamentos com cartão de crédito",
    icon: CreditCard,
    status: "indisponivel",
    categoria: "pagamento"
  },
  {
    id: "nfe",
    nome: "NF-e / NFS-e",
    descricao: "Emissão de notas fiscais eletrônicas",
    icon: FileText,
    status: "indisponivel",
    categoria: "fiscal"
  },
  {
    id: "webhooks",
    nome: "Webhooks",
    descricao: "Notificações em tempo real para sistemas externos",
    icon: Webhook,
    status: "indisponivel",
    categoria: "webhook"
  }
];

export function IntegracoesForm() {
  const [expandedIntegracao, setExpandedIntegracao] = useState<string | null>("banco-inter");

  const categorias = {
    pagamento: "Pagamentos",
    comunicacao: "Comunicação",
    fiscal: "Fiscal",
    webhook: "Webhooks"
  };

  const getStatusBadge = (status: IntegracaoStatus["status"]) => {
    switch (status) {
      case "ativa":
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Ativa</Badge>;
      case "configurar":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Configurar</Badge>;
      case "indisponivel":
        return <Badge variant="outline">Em breve</Badge>;
    }
  };

  const integracoesPorCategoria = Object.entries(categorias).map(([key, label]) => ({
    categoria: key as IntegracaoStatus["categoria"],
    label,
    items: integracoes.filter(i => i.categoria === key)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Integrações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure integrações com serviços externos para expandir as funcionalidades do sistema
        </p>
      </div>

      {integracoesPorCategoria.map(({ categoria, label, items }) => (
        <div key={categoria} className="space-y-4">
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid gap-4">
            {items.map((integracao) => (
              <Card key={integracao.id} className={expandedIntegracao === integracao.id ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <integracao.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          {integracao.nome}
                          {getStatusBadge(integracao.status)}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {integracao.descricao}
                        </CardDescription>
                      </div>
                    </div>
                    {integracao.status !== "indisponivel" && (
                      <Button
                        variant={expandedIntegracao === integracao.id ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setExpandedIntegracao(
                          expandedIntegracao === integracao.id ? null : integracao.id
                        )}
                      >
                        {expandedIntegracao === integracao.id ? "Recolher" : "Configurar"}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {expandedIntegracao === integracao.id && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    {integracao.id === "banco-inter" && (
                      <div className="space-y-4">
                        <Alert>
                          <AlertDescription className="text-sm">
                            Configure suas credenciais do Banco Inter para habilitar a emissão de boletos com PIX.
                            As cobranças ficarão disponíveis no módulo <strong>Contas a Receber</strong>.
                          </AlertDescription>
                        </Alert>
                        <InterConfigForm />
                      </div>
                    )}
                    {integracao.id === "whatsapp" && (
                      <div className="space-y-4">
                        <Alert>
                          <AlertDescription className="text-sm">
                            Conecte o WhatsApp de cada loja para enviar mensagens automáticas aos clientes.
                            Cada loja terá sua própria instância com número independente.
                          </AlertDescription>
                        </Alert>
                        <WhatsAppConfigForm />
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Alert>
        <Zap className="w-4 h-4" />
        <AlertDescription>
          <strong>Integrações futuras:</strong> As integrações marcadas como "Em breve" estarão disponíveis 
          nas próximas atualizações do sistema. Se você precisa de uma integração específica, entre em contato 
          com o suporte.
        </AlertDescription>
      </Alert>
    </div>
  );
}
