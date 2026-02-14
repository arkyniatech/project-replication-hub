import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFinanceiroStore } from '@/stores/financeiroStore';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import type { Conta } from '@/types/financeiro';

const formSchema = z.object({
  origemId: z.string().min(1, 'Selecione a conta de origem'),
  destinoId: z.string().min(1, 'Selecione a conta de destino'),
  valor: z.number().min(0.01, 'Valor deve ser maior que zero'),
  taxa: z.number().min(0).optional(),
  data: z.date(),
  descricao: z.string().optional(),
  centrosCusto: z.string().optional(),
  ref: z.string().optional(),
}).refine((data) => data.origemId !== data.destinoId, {
  message: 'Conta de origem deve ser diferente da conta de destino',
  path: ['destinoId'],
});

type FormData = z.infer<typeof formSchema>;

interface NovaTransferenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NovaTransferenciaModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: NovaTransferenciaModalProps) {
  const { lojaAtual } = useMultiunidade();
  const { 
    getContasByLoja, 
    createTransfer, 
    efetivarTransfer,
    config
  } = useFinanceiroStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const lojaId = lojaAtual?.id || '1';
  const contas = getContasByLoja(lojaId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: new Date(),
      taxa: 0,
      valor: 0,
    },
  });

  const contaOrigem = form.watch('origemId');
  const contaDestino = form.watch('destinoId');
  const valor = form.watch('valor');
  const taxa = form.watch('taxa') || 0;

  const getContaById = (id: string): Conta | undefined => 
    contas.find(c => c.id === id);

  const contaOrigemData = getContaById(contaOrigem);
  const saldoSuficiente = contaOrigemData 
    ? contaOrigemData.saldoAtual >= (valor + taxa)
    : true;

  const onSubmit = async (data: FormData) => {
    if (!saldoSuficiente && !config.allowOverdraft) {
      toast.error('Saldo insuficiente na conta de origem');
      return;
    }

    setIsLoading(true);
    
    try {
      const transferId = createTransfer({
        lojaId,
        origemId: data.origemId,
        destinoId: data.destinoId,
        valor: data.valor,
        taxa: data.taxa,
        data: format(data.data, 'yyyy-MM-dd'),
        status: 'PENDENTE',
        createdBy: 'user', // Mock user
        descricao: data.descricao,
        centrosCusto: data.centrosCusto,
        ref: data.ref,
      });

      // Se a data é hoje ou no passado, efetivar imediatamente
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataTransfer = new Date(data.data);
      dataTransfer.setHours(0, 0, 0, 0);

      if (dataTransfer <= hoje) {
        efetivarTransfer(transferId);
        toast.success('Transferência efetuada com sucesso!');
      } else {
        toast.success('Transferência agendada com sucesso!');
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao criar transferência');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrocarContas = () => {
    const origem = form.getValues('origemId');
    const destino = form.getValues('destinoId');
    form.setValue('origemId', destino);
    form.setValue('destinoId', origem);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Transferência</DialogTitle>
          <DialogDescription>
            Transferir valores entre contas da mesma empresa/unidade
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contas Origem e Destino */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta de Origem *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            <div className="flex flex-col">
                              <span>{conta.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {conta.banco} • Saldo: R$ {conta.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta de Destino *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            <div className="flex flex-col">
                              <span>{conta.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {conta.banco} • Saldo: R$ {conta.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botão trocar contas */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTrocarContas}
                disabled={!contaOrigem || !contaDestino}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Trocar Contas
              </Button>
            </div>

            {/* Valores */}
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
                        min="0.01"
                        placeholder="0,00"
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
                name="taxa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa/IOF (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor adicional debitado da origem
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Data */}
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Efetivação *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-[240px] pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                          ) : (
                            <span>Selecionar data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date('1900-01-01')}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Se for hoje ou anterior, será efetuada imediatamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição e Referência */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre a transferência..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência Interna</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Nota 123, Pedido 456..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validações visuais */}
            {contaOrigemData && valor > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Saldo atual:</span>
                    <span className="font-mono">
                      R$ {contaOrigemData.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total a debitar:</span>
                    <span className="font-mono">
                      R$ {(valor + taxa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Saldo após:</span>
                    <span className={cn(
                      'font-mono',
                      saldoSuficiente ? 'text-green-600' : 'text-red-600'
                    )}>
                      R$ {(contaOrigemData.saldoAtual - valor - taxa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                
                {!saldoSuficiente && !config.allowOverdraft && (
                  <div className="mt-2 text-sm text-red-600">
                    ⚠️ Saldo insuficiente para esta operação
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || (!saldoSuficiente && !config.allowOverdraft)}
              >
                {isLoading ? 'Processando...' : 'Criar Transferência'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}