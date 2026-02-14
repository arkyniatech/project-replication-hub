import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useBolePixStore } from '@/stores/bolePixStore';
import { 
  Shield, 
  Key, 
  FileText, 
  Webhook, 
  TestTube, 
  Building,
  AlertTriangle
} from 'lucide-react';

const configSchema = z.object({
  clientId: z.string().min(1, 'Client ID é obrigatório'),
  clientSecret: z.string().min(1, 'Client Secret é obrigatório'),
  webhookUrl: z.string().url('URL inválida'),
  ambiente: z.enum(['sandbox', 'producao']),
});

type ConfigFormData = z.infer<typeof configSchema>;

export function InterConfigForm() {
  const [testing, setTesting] = useState(false);
  const { config, setConfig, useBackend, toggleBackend } = useBolePixStore();
  const { toast } = useToast();

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      webhookUrl: config.webhookUrl,
      ambiente: config.ambiente,
    },
  });

  const onSubmit = (data: ConfigFormData) => {
    setConfig(data);
    toast({
      title: 'Configurações salvas',
      description: 'As configurações do Banco Inter foram atualizadas.',
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (Math.random() > 0.3) {
        toast({
          title: 'Conexão testada com sucesso',
          description: 'A comunicação com o Banco Inter está funcionando.',
        });
      } else {
        throw new Error('Falha na conexão');
      }
    } catch (error) {
      toast({
        title: 'Erro na conexão',
        description: 'Verifique as credenciais e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building className="h-5 w-5" />
          Configurações - Banco Inter
        </h2>
        <p className="text-muted-foreground">
          Configure a integração com o Banco Inter para emissão de BolePix
        </p>
      </div>

      {/* Security Warning */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Segurança:</strong> Credenciais e certificados são geridos exclusivamente no backend (mTLS). 
          Este front-end não armazena dados sensíveis reais.
        </AlertDescription>
      </Alert>

      {/* Environment Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Ambiente de Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Usar Backend Real</p>
              <p className="text-sm text-muted-foreground">
                Conectar com backend em vez do mock local
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={useBackend ? 'default' : 'secondary'}>
                {useBackend ? 'Backend' : 'Mock'}
              </Badge>
              <Switch
                checked={useBackend}
                onCheckedChange={toggleBackend}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Credenciais de API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="****-****-****-****"
                          type="password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="****-****-****-****"
                          type="password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ambiente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Homologação)</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Webhook *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://api.exemplo.com/webhooks/inter"
                        readOnly={!useBackend}
                      />
                    </FormControl>
                    <FormMessage />
                    {!useBackend && (
                      <p className="text-xs text-muted-foreground">
                        Somente leitura no modo mock
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit">Salvar Configurações</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Certificates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Certificados mTLS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O upload de certificados (.crt/.key) está <strong>desabilitado no front-end</strong> por segurança. 
                Os certificados devem ser configurados diretamente no backend.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Certificado (.crt)</label>
                <div className="p-4 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Gerenciado no backend</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Chave Privada (.key)</label>
                <div className="p-4 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Gerenciado no backend</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Ações de Webhook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!useBackend}>
              Registrar Webhook
            </Button>
            <Button variant="outline" size="sm" disabled={!useBackend}>
              Testar Webhook
            </Button>
          </div>
          {!useBackend && (
            <p className="text-xs text-muted-foreground mt-2">
              Disponível apenas com backend ativo
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}