import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useBolePixStore } from '@/stores/bolePixStore';
import { EmitChargePayload } from '@/types/bolepix';
import { Loader2, CreditCard, QrCode } from 'lucide-react';

const emitirSchema = z.object({
  // Sacado
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ é obrigatório'),
  email: z.string().email('E-mail inválido'),
  // Endereço (opcional)
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),
  // Cobrança
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  vencimento: z.string().min(1, 'Vencimento é obrigatório'),
  multa: z.number().min(0).max(100).optional(),
  juros: z.number().min(0).max(100).optional(),
  instrucoes: z.string().optional(),
  pixHabilitado: z.boolean(),
});

type EmitirFormData = z.infer<typeof emitirSchema>;

interface EmitirBolePixModalProps {
  open: boolean;
  onClose: () => void;
  titulo: any;
  onSuccess: (cobrancaData: any) => void;
}

export function EmitirBolePixModal({
  open,
  onClose,
  titulo,
  onSuccess
}: EmitirBolePixModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { gateway, generateIdempotencyKey } = useBolePixStore();

  const form = useForm<EmitirFormData>({
    resolver: zodResolver(emitirSchema),
    defaultValues: {
      nome: titulo?.clienteNome || '',
      cpfCnpj: titulo?.clienteDoc || '',
      email: titulo?.clienteEmail || '',
      valor: titulo?.valor || 0,
      vencimento: titulo?.vencimento || '',
      pixHabilitado: true,
      multa: 2,
      juros: 1,
    },
  });

  const onSubmit = async (data: EmitirFormData) => {
    setLoading(true);
    
    try {
      const payload: EmitChargePayload = {
        valor: data.valor,
        vencimento: data.vencimento,
        sacado: {
          nome: data.nome,
          cpfCnpj: data.cpfCnpj,
          email: data.email,
          endereco: data.logradouro ? {
            logradouro: data.logradouro,
            numero: data.numero || '',
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            uf: data.uf || '',
            cep: data.cep || '',
          } : undefined,
        },
        multa: data.multa,
        juros: data.juros,
        instrucoes: data.instrucoes,
        pixHabilitado: data.pixHabilitado,
        idempotencyKey: generateIdempotencyKey(titulo.id, data.vencimento),
        seuNumero: titulo.numero || titulo.id,
      };

      const result = await gateway.emitCharge(payload);
      
      const cobrancaData = {
        provider: 'inter' as const,
        metodo: 'boleto_pix' as const,
        status: 'REQUESTED' as const,
        idempotencyKey: payload.idempotencyKey,
        codigoSolicitacao: result.codigoSolicitacao,
        history: [{
          tsISO: new Date().toISOString(),
          event: 'EMISSAO_SOLICITADA',
          payloadSummary: {
            valor: payload.valor,
            vencimento: payload.vencimento,
            pixHabilitado: payload.pixHabilitado
          }
        }]
      };

      onSuccess(cobrancaData);
      
      toast({
        title: "BolePix solicitado",
        description: "A cobrança está sendo processada pelo banco. Você será notificado quando estiver pronta.",
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao emitir BolePix:', error);
      toast({
        title: "Erro ao emitir",
        description: "Não foi possível processar a solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const idempotencyKey = generateIdempotencyKey(titulo?.id || '', form.watch('vencimento') || '');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Emitir BolePix - Banco Inter
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Título Info */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Título: <strong>{titulo?.numero || titulo?.id}</strong></span>
                <span>Valor: <strong>R$ {titulo?.valor?.toFixed(2)}</strong></span>
              </div>
              <div className="text-xs text-muted-foreground">
                Chave de Idempotência: <code className="text-xs">{idempotencyKey}</code>
              </div>
            </div>

            {/* Sacado */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Dados do Sacado</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cpfCnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Cobrança */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Dados da Cobrança</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vencimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="multa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Multa (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          max="100"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="juros"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Juros (% a.m.)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          max="100"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="instrucoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instruções do Boleto</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pixHabilitado"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="space-y-1">
                      <FormLabel className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        PIX Habilitado
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Gerar QR Code PIX junto com o boleto
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Emitir BolePix
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}