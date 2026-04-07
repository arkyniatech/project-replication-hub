import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Key, FileText, Webhook, TestTube, Building, AlertTriangle, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface InterCredential {
  id: string;
  loja_id: string;
  client_id: string;
  ambiente: string;
  webhook_url: string | null;
  ativo: boolean;
  certificado_pem_encrypted: string | null;
  chave_privada_pem_encrypted: string | null;
  created_at: string;
}

export function InterConfigForm() {
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLojaId, setSelectedLojaId] = useState<string | null>(null);
  const [credential, setCredential] = useState<InterCredential | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  
  const { lojasPermitidas } = useMultiunidade();
  const { toast } = useToast();

  // Auto-select first loja
  useEffect(() => {
    if (!selectedLojaId && lojasPermitidas.length > 0) {
      setSelectedLojaId(lojasPermitidas[0].id);
    }
  }, [lojasPermitidas, selectedLojaId]);

  // Load credentials when loja changes
  useEffect(() => {
    if (!selectedLojaId) return;
    loadCredentials(selectedLojaId);
  }, [selectedLojaId]);

  const loadCredentials = async (lojaId: string) => {
    setLoadingCreds(true);
    try {
      const { data, error } = await supabase
        .from('inter_credentials')
        .select('*')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading credentials:', error);
      }
      setCredential(data as InterCredential | null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingCreds(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLojaId) return;

    const formData = new FormData(e.currentTarget);
    const clientId = formData.get('clientId') as string;
    const clientSecret = formData.get('clientSecret') as string;
    const ambiente = formData.get('ambiente') as string;
    const webhookUrl = formData.get('webhookUrl') as string;

    if (!clientId || !clientSecret) {
      toast({ title: 'Preencha Client ID e Client Secret', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Read certificate files as text
      let certPem: string | undefined;
      let keyPem: string | undefined;
      
      if (certFile) {
        certPem = await certFile.text();
      }
      if (keyFile) {
        keyPem = await keyFile.text();
      }

      // Call edge function to save credentials securely
      const { data, error } = await supabase.functions.invoke('inter-proxy', {
        body: {
          action: 'save-credentials',
          loja_id: selectedLojaId,
          payload: {
            client_id: clientId,
            client_secret: clientSecret,
            ambiente: ambiente || 'sandbox',
            webhook_url: webhookUrl || null,
            certificado_pem: certPem || undefined,
            chave_privada_pem: keyPem || undefined,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Credenciais salvas com sucesso!' });
      await loadCredentials(selectedLojaId);
      setCertFile(null);
      setKeyFile(null);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedLojaId) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('inter-proxy', {
        body: { action: 'test-connection', loja_id: selectedLojaId },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: 'Conexão OK!', description: data.message });
      } else {
        toast({ title: 'Falha na conexão', description: data?.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const webhookBaseUrl = `https://otpbnwpnprgdncexvksx.supabase.co/functions/v1/inter-webhook`;

  return (
    <div className="space-y-6">
      {/* Loja Selector */}
      {lojasPermitidas.length > 1 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selecionar Loja</Label>
          <Select value={selectedLojaId || ''} onValueChange={setSelectedLojaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a loja" />
            </SelectTrigger>
            <SelectContent>
              {lojasPermitidas.map((loja) => (
                <SelectItem key={loja.id} value={loja.id}>
                  {loja.nome} ({loja.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status */}
      {loadingCreds ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : credential ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Credenciais configuradas para esta loja. Ambiente:{' '}
            <Badge variant={credential.ambiente === 'producao' ? 'default' : 'secondary'}>
              {credential.ambiente === 'producao' ? 'Produção' : 'Sandbox'}
            </Badge>
            {credential.certificado_pem_encrypted && (
              <span className="ml-2">• Certificado ✓</span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma credencial configurada para esta loja. Preencha os dados abaixo.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Warning */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Segurança:</strong> Credenciais são enviadas diretamente para o servidor via Edge Function.
          Nunca são armazenadas no navegador. Certificados mTLS são criptografados no banco.
        </AlertDescription>
      </Alert>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Credenciais de API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID *</Label>
                <Input
                  id="clientId"
                  name="clientId"
                  placeholder="Obtido no Internet Banking Inter"
                  defaultValue={credential?.client_id || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret *</Label>
                <Input
                  id="clientSecret"
                  name="clientSecret"
                  type="password"
                  placeholder={credential ? '••••••••' : 'Obtido no Internet Banking Inter'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ambiente">Ambiente</Label>
                <select
                  id="ambiente"
                  name="ambiente"
                  defaultValue={credential?.ambiente || 'sandbox'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="sandbox">Sandbox (Homologação)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">URL do Webhook</Label>
                <Input
                  id="webhookUrl"
                  name="webhookUrl"
                  value={webhookBaseUrl}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Cadastre esta URL no painel do Inter
                </p>
              </div>
            </div>

            {/* Certificate Upload */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Certificado (.crt / .pem)</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".crt,.pem,.cer"
                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
                {certFile && (
                  <p className="text-xs text-green-600">✓ {certFile.name}</p>
                )}
                {!certFile && credential?.certificado_pem_encrypted && (
                  <p className="text-xs text-muted-foreground">✓ Certificado já configurado</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Chave Privada (.key)</Label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".key,.pem"
                    onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
                {keyFile && (
                  <p className="text-xs text-green-600">✓ {keyFile.name}</p>
                )}
                {!keyFile && credential?.chave_privada_pem_encrypted && (
                  <p className="text-xs text-muted-foreground">✓ Chave já configurada</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar Credenciais'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !credential}
              >
                {testing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testando...</>
                ) : (
                  <><TestTube className="mr-2 h-4 w-4" /> Testar Conexão</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook do Inter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Cadastre a URL abaixo no painel de APIs do Banco Inter para receber notificações automáticas
            de pagamento, emissão e cancelamento de boletos.
          </p>
          <div className="flex items-center gap-2">
            <Input value={webhookBaseUrl} readOnly className="bg-muted font-mono text-xs" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(webhookBaseUrl);
                toast({ title: 'URL copiada!' });
              }}
            >
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
