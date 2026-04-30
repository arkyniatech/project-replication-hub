import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Paperclip,
  Plus,
  Trash2,
  Shield,
  Save,
  UserPlus,
  UserX,
  UserCheck,
  File,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import { Cliente, Contato, Anexo } from "@/types";
import { legacyClienteToSupabase } from "@/lib/cliente-adapter";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import WhatsAppVerificationModal from "./WhatsAppVerificationModal";
import { 
  formatCPF, 
  formatCNPJ, 
  formatCEP, 
  formatPhone,
  validateCPF,
  validateCNPJ,
  validateEmail,
  validateCEP,
  getAddressByCEP,
  estadosBrasil
} from "@/lib/validations";
import { useNavigate } from "react-router-dom";
import { useMultiunidade } from "@/hooks/useMultiunidade";

interface ClienteFormProps {
  cliente?: Cliente;
  onSave?: (cliente: Cliente) => void;
  onCancel?: () => void;
}

export default function ClienteForm({ cliente, onSave, onCancel }: ClienteFormProps) {
  const [tipo, setTipo] = useState<'PF' | 'PJ'>(cliente?.tipo || 'PF');
  const [contatos, setContatos] = useState<Contato[]>(cliente?.contatos || [
    { id: '1', tipo: 'WhatsApp', valor: '', principal: true, verificado: false },
    { id: '2', tipo: 'Telefone', valor: '', principal: false, verificado: false },
    { id: '3', tipo: 'Email', valor: '', principal: false, verificado: false }
  ]);
  const [anexos, setAnexos] = useState<Anexo[]>(cliente?.anexos || []);
  const [isentoIE, setIsentoIE] = useState(cliente?.isentoIE || false);
  const [lgpdAceito, setLgpdAceito] = useState(cliente?.lgpdAceito || false);
  const [isDirty, setIsDirty] = useState(false);
  const [politicaComercial, setPoliticaComercial] = useState<'P0' | 'P1' | 'P2' | undefined>(cliente?.politicaComercial);
  const [aplicarPoliticaAuto, setAplicarPoliticaAuto] = useState(cliente?.aplicarPoliticaAuto ?? true);
  const [verifyingWhatsApp, setVerifyingWhatsApp] = useState<string | null>(null);
  // Dia de vencimento padrão (1-31, opcional) — pré-preenche o vencimento ao montar contratos
  const [diaVencimentoPadrao, setDiaVencimentoPadrao] = useState<string>(
    (cliente as any)?.diaVencimentoPadrao?.toString() || ''
  );
  // Negociação pontual: desconto fixo, prazo extra e observação que se aplicam automaticamente
  const [negociacaoPontual, setNegociacaoPontual] = useState<{
    descontoPercent: string;
    prazoExtraDias: string;
    observacao: string;
  }>(
    (cliente as any)?.negociacaoPontual || { descontoPercent: '', prazoExtraDias: '', observacao: '' }
  );

  const { toast } = useToast();
  const navigate = useNavigate();
  const { lojaAtual, session } = useMultiunidade();
  const { createCliente, updateCliente } = useSupabaseClientes(lojaAtual?.id);

  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm({
    defaultValues: {
      tipo: cliente?.tipo || 'PF',
      nomeRazao: cliente?.nomeRazao || '',
      nomeFantasia: cliente?.nomeFantasia || '',
      documento: cliente?.documento || '',
      rg: cliente?.rg || '',
      dataNascimento: cliente?.dataNascimento || '',
      // campo "responsavel" removido — não tinha utilidade prática
      inscricaoEstadual: cliente?.inscricaoEstadual || '',
      endereco: {
        cep: cliente?.endereco?.cep || '',
        logradouro: cliente?.endereco?.logradouro || '',
        numero: cliente?.endereco?.numero || '',
        complemento: cliente?.endereco?.complemento || '',
        bairro: cliente?.endereco?.bairro || '',
        cidade: cliente?.endereco?.cidade || '',
        uf: cliente?.endereco?.uf || '',
        pais: cliente?.endereco?.pais || 'Brasil'
      },
      statusCredito: cliente?.statusCredito || 'Em análise',
      observacoes: cliente?.observacoes || ''
    }
  });

  // Watch for form changes
  useEffect(() => {
    const subscription = watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  // Verificar duplicidade de documento - será validado pelo Supabase (unique constraint)
  const checkDuplicateDocument = (documento: string) => {
    // A validação de duplicidade será feita pelo Supabase automaticamente
    // via constraint unique no campo CPF/CNPJ
    return;
  };

  // Formatar e validar documento ao digitar
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    if (tipo === 'PF') {
      value = formatCPF(value);
      if (value.replace(/\D/g, '').length === 11) {
        if (!validateCPF(value)) {
          toast({
            title: "CPF inválido",
            description: "Por favor, verifique o CPF digitado.",
            variant: "destructive"
          });
        } else {
          checkDuplicateDocument(value);
        }
      }
    } else {
      value = formatCNPJ(value);
      if (value.replace(/\D/g, '').length === 14) {
        if (!validateCNPJ(value)) {
          toast({
            title: "CNPJ inválido", 
            description: "Por favor, verifique o CNPJ digitado.",
            variant: "destructive"
          });
        } else {
          checkDuplicateDocument(value);
        }
      }
    }
    
    setValue('documento', value);
    setIsDirty(true);
  };

  // Auto-preenchimento de endereço por CEP
  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = formatCEP(e.target.value);
    setValue('endereco.cep', value);
    
    if (validateCEP(value)) {
      const addressData = await getAddressByCEP(value);
      if (addressData) {
        setValue('endereco.logradouro', addressData.logradouro);
        setValue('endereco.bairro', addressData.bairro);
        setValue('endereco.cidade', addressData.cidade);
        setValue('endereco.uf', addressData.uf);
        toast({
          title: "Endereço preenchido automaticamente",
          description: "Verifique se os dados estão corretos.",
        });
      }
    }
    setIsDirty(true);
  };

  // Adicionar novo contato (Principal automático se for o primeiro do mesmo tipo)
  const addContato = () => {
    const tipo: 'Telefone' | 'WhatsApp' | 'Email' = 'Telefone';
    const jaTemDoTipo = contatos.some(c => c.tipo === tipo);
    const newContato: Contato = {
      id: Date.now().toString(),
      tipo,
      valor: '',
      principal: !jaTemDoTipo
    };
    setContatos([...contatos, newContato]);
    setIsDirty(true);
  };

  // Remover contato
  const removeContato = (id: string) => {
    setContatos(contatos.filter(c => c.id !== id));
    setIsDirty(true);
  };

  // Atualizar contato
  const updateContato = (id: string, field: keyof Contato, value: any) => {
    setContatos(contatos.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
    setIsDirty(true);
  };

  // Definir contato principal — agora ESCOPADO POR TIPO (telefone/whatsapp/email independentes)
  const setPrincipal = (id: string) => {
    const target = contatos.find(c => c.id === id);
    if (!target) return;
    setContatos(contatos.map(c => {
      // Mesmo tipo do alvo: só o alvo fica principal; outros do mesmo tipo desmarcam
      if (c.tipo === target.tipo) {
        return { ...c, principal: c.id === id };
      }
      // Tipos diferentes: preserva o que estava
      return c;
    }));
    setIsDirty(true);
  };

  // Salvar cliente
  const onSubmit = (data: any) => {
    if (!lgpdAceito) {
      toast({
        title: "LGPD obrigatório",
        description: "É necessário aceitar os termos de tratamento de dados para prosseguir.",
        variant: "destructive"
      });
      return;
    }

    // Validar se tem pelo menos um telefone de recados
    const hasTelefone = contatos.some(c => c.tipo === 'Telefone' && c.valor && c.valor.trim() !== '');
    if (!hasTelefone) {
      toast({
        title: "Telefone de Recados obrigatório",
        description: "É necessário informar um telefone de recados.",
        variant: "destructive"
      });
      return;
    }

    // Validar se tem pelo menos um WhatsApp autenticado
    const whatsAppContato = contatos.find(c => c.tipo === 'WhatsApp' && c.valor && c.valor.trim() !== '');
    if (!whatsAppContato) {
      toast({
        title: "WhatsApp obrigatório",
        description: "É necessário informar um WhatsApp do cliente.",
        variant: "destructive"
      });
      return;
    }
    if (!whatsAppContato.verificado) {
      toast({
        title: "WhatsApp não autenticado",
        description: "Clique em 'Autenticar' no contato WhatsApp para validar o número antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    // Validar documento
    if (tipo === 'PF' && !validateCPF(data.documento)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, verifique o CPF digitado.",
        variant: "destructive"
      });
      return;
    }

    if (tipo === 'PJ' && !validateCNPJ(data.documento)) {
      toast({
        title: "CNPJ inválido",
        description: "Por favor, verifique o CNPJ digitado.",
        variant: "destructive"
      });
      return;
    }

    // Se estiver em modo "TODAS", não pode cadastrar - precisa escolher uma loja específica
    if (session.lojaAtivaId === 'TODAS') {
      toast({
        title: 'Ação não permitida',
        description: 'Para cadastrar um cliente, selecione uma loja específica.',
        variant: 'destructive',
      });
      return;
    }

    if (!lojaAtual) {
      toast({
        title: "Erro",
        description: "Nenhuma loja ativa selecionada.",
        variant: "destructive"
      });
      return;
    }

    const agora = new Date().toISOString();
    
    const novoCliente: Cliente = {
      id: cliente?.id || Date.now().toString(),
      tipo,
      lojaId: lojaAtual.id,
      status: data.statusCredito === 'Ativo' ? 'ATIVO' as const : 
              data.statusCredito === 'Suspenso' ? 'SUSPENSO' as const : 
              'EM_ANALISE' as const,
      inadimplente: false,
      nomeRazao: data.nomeRazao,
      documento: data.documento,
      contatos,
      endereco: {
        cep: data.endereco.cep,
        logradouro: data.endereco.logradouro,
        numero: data.endereco.numero,
        bairro: data.endereco.bairro,
        cidade: data.endereco.cidade,
        uf: data.endereco.uf,
        pais: 'Brasil'
      },
      statusCredito: data.statusCredito,
      observacoes: data.observacoes,
      anexos,
      lgpdAceito,
      politicaComercial,
      aplicarPoliticaAuto,
      // Campos novos (existem no Supabase; tipo Cliente é legado)
      ...(({
        diaVencimentoPadrao: diaVencimentoPadrao ? Number(diaVencimentoPadrao) : null,
        negociacaoPontual: (negociacaoPontual.descontoPercent || negociacaoPontual.prazoExtraDias || negociacaoPontual.observacao)
          ? {
              descontoPercent: negociacaoPontual.descontoPercent ? Number(negociacaoPontual.descontoPercent) : 0,
              prazoExtraDias: negociacaoPontual.prazoExtraDias ? Number(negociacaoPontual.prazoExtraDias) : 0,
              observacao: negociacaoPontual.observacao || ''
            }
          : null,
      }) as any),
      auditoria: {
        criadoPor: 'Usuário Admin', // Mock
        criadoEm: cliente?.auditoria?.criadoEm || agora,
        atualizadoEm: agora
      },
      // Campos específicos
      ...(tipo === 'PF' ? {
        nome: data.nomeRazao,
        cpf: data.documento,
        rg: data.rg,
        dataNascimento: data.dataNascimento
      } : {
        razaoSocial: data.nomeRazao,
        nomeFantasia: data.nomeFantasia,
        cnpj: data.documento,
        inscricaoEstadual: data.inscricaoEstadual,
        isentoIE
      }),
      // Para compatibilidade
      email: contatos.find(c => c.tipo === 'Email')?.valor || '',
      telefone: contatos.find(c => c.tipo === 'Telefone')?.valor || '',
      createdAt: cliente?.createdAt || agora,
      updatedAt: agora
    };

    // Converter para formato Supabase
    const supabaseData = legacyClienteToSupabase(novoCliente);

    if (cliente?.id) {
      updateCliente.mutate(
        { id: cliente.id, ...supabaseData },
        {
          onSuccess: () => {
            setIsDirty(false);
            onSave?.(novoCliente);
          },
          onError: (error: any) => {
            toast({
              title: "Erro ao atualizar cliente",
              description: error.message || "Ocorreu um erro ao salvar as alterações.",
              variant: "destructive"
            });
          }
        }
      );
    } else {
      createCliente.mutate(supabaseData, {
        onSuccess: () => {
          setIsDirty(false);
          onSave?.(novoCliente);
        },
        onError: (error: any) => {
          const isRLS = error?.message?.includes('row-level security');
          toast({
            title: "Erro ao criar cliente",
            description: isRLS 
              ? "Você não tem permissão para cadastrar clientes nesta loja. Verifique suas permissões." 
              : (error.message || "Ocorreu um erro ao cadastrar o cliente."),
            variant: "destructive"
          });
        }
      });
    }

    return; // Evita executar o código do toast abaixo

  };

  // Salvar e criar novo
  const handleSaveAndNew = (data: any) => {
    onSubmit(data);
    // Reset form after save
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Inativar cliente
  const handleInactivate = () => {
    if (!cliente) return;
    
    if (confirm('Tem certeza que deseja suspender este cliente?')) {
      const updated = { 
        ...cliente, 
        status: 'SUSPENSO' as const,
        statusCredito: 'Suspenso' as const 
      };
      const supabaseData = legacyClienteToSupabase(updated);
      
      updateCliente.mutate(
        { id: cliente.id, ...supabaseData },
        {
          onSuccess: () => {
            toast({
              title: "Cliente suspenso",
              description: "O status do cliente foi alterado para Suspenso.",
              variant: "destructive"
            });
            onSave?.(updated);
          }
        }
      );
    }
  };

  // Ativar cliente
  const handleActivate = () => {
    if (!cliente) return;
    
    if (confirm('Deseja ativar este cliente?')) {
      const updated = { 
        ...cliente, 
        status: 'ATIVO' as const,
        statusCredito: 'Ativo' as const 
      };
      const supabaseData = legacyClienteToSupabase(updated);
      
      updateCliente.mutate(
        { id: cliente.id, ...supabaseData },
        {
          onSuccess: () => {
            toast({
              title: "Cliente ativado",
              description: "O status do cliente foi alterado para Ativo.",
            });
            onSave?.(updated);
          }
        }
      );
    }
  };

  // Gerar proposta
  const handleGenerateProposal = () => {
    if (!cliente || cliente.statusCredito === 'Suspenso') {
      toast({
        title: "Cliente não habilitado",
        description: "Apenas clientes com status 'Ativo' podem gerar propostas.",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/contratos/novo?clienteId=${cliente.id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <p className="text-muted-foreground">
            Preencha os dados do {tipo === 'PF' ? 'cliente pessoa física' : 'cliente pessoa jurídica'}
          </p>
        </div>
        
        {/* Seletor PF/PJ */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={tipo === 'PF' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setTipo('PF');
              setValue('tipo', 'PF');
              setIsDirty(true);
            }}
          >
            <User className="w-4 h-4 mr-2" />
            Pessoa Física
          </Button>
          <Button
            type="button"
            variant={tipo === 'PJ' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setTipo('PJ');
              setValue('tipo', 'PJ');
              setIsDirty(true);
            }}
          >
            <Building className="w-4 h-4 mr-2" />
            Pessoa Jurídica
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["cliente", "contatos", "endereco", "outros"]} className="space-y-4">
        {/* Modal de Verificação WhatsApp */}
        <WhatsAppVerificationModal
          open={verifyingWhatsApp !== null}
          onOpenChange={(open) => !open && setVerifyingWhatsApp(null)}
          phoneNumber={contatos.find(c => c.id === verifyingWhatsApp)?.valor || ''}
          lojaId={lojaAtual?.id}
          onVerified={() => {
            if (verifyingWhatsApp) {
              updateContato(verifyingWhatsApp, 'verificado', true);
              toast({
                title: "WhatsApp verificado!",
                description: "O número foi autenticado com sucesso.",
              });
            }
          }}
        />
        {/* Seção Cliente */}
        <AccordionItem value="cliente">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              {tipo === 'PF' ? <User className="w-5 h-5" /> : <Building className="w-5 h-5" />}
              Dados do {tipo === 'PF' ? 'Cliente' : 'Empresa'}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tipo === 'PF' ? (
                <>
                  <div className="lg:col-span-2">
                    <Label htmlFor="nomeRazao">Nome Completo *</Label>
                    <Input
                      id="nomeRazao"
                      {...register('nomeRazao', { required: 'Nome é obrigatório' })}
                      className="shadow-input border-input-border"
                    />
                    {errors.nomeRazao && (
                      <p className="text-sm text-destructive mt-1">{errors.nomeRazao.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="documento">CPF *</Label>
                    <Input
                      id="documento"
                      placeholder="000.000.000-00"
                      {...register('documento', { required: 'CPF é obrigatório' })}
                      onChange={handleDocumentChange}
                      className="shadow-input border-input-border"
                    />
                    {errors.documento && (
                      <p className="text-sm text-destructive mt-1">{errors.documento.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      {...register('rg')}
                      className="shadow-input border-input-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      {...register('dataNascimento', { required: tipo === 'PF' ? 'Data de Nascimento é obrigatória' : false })}
                      className="shadow-input border-input-border"
                    />
                    {errors.dataNascimento && (
                      <p className="text-sm text-destructive mt-1">{errors.dataNascimento.message as string}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="lg:col-span-2">
                    <Label htmlFor="nomeRazao">Razão Social *</Label>
                    <Input
                      id="nomeRazao"
                      {...register('nomeRazao', { required: 'Razão Social é obrigatória' })}
                      className="shadow-input border-input-border"
                    />
                    {errors.nomeRazao && (
                      <p className="text-sm text-destructive mt-1">{errors.nomeRazao.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                    <Input
                      id="nomeFantasia"
                      {...register('nomeFantasia')}
                      className="shadow-input border-input-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="documento">CNPJ *</Label>
                    <Input
                      id="documento"
                      placeholder="00.000.000/0000-00"
                      {...register('documento', { required: 'CNPJ é obrigatório' })}
                      onChange={handleDocumentChange}
                      className="shadow-input border-input-border"
                    />
                    {errors.documento && (
                      <p className="text-sm text-destructive mt-1">{errors.documento.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                      <Input
                        id="inscricaoEstadual"
                        {...register('inscricaoEstadual')}
                        disabled={isentoIE}
                        className="shadow-input border-input-border"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="isentoIE"
                        checked={isentoIE}
                        onCheckedChange={(checked) => {
                          setIsentoIE(checked);
                          if (checked) setValue('inscricaoEstadual', '');
                          setIsDirty(true);
                        }}
                      />
                      <Label htmlFor="isentoIE" className="text-sm">Isento</Label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção Contatos */}
        <AccordionItem value="contatos">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contatos
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1.5">
              {contatos.map((contato, index) => {
                const isRequired = index < 2; // Telefone e WhatsApp obrigatórios
                const isWhatsApp = contato.tipo === 'WhatsApp';
                const isVerified = contato.verificado;
                const principalLabel =
                  contato.tipo === 'WhatsApp' ? 'WhatsApp principal' :
                  contato.tipo === 'Email' ? 'E-mail principal' :
                  'Telefone principal';

                return (
                  <div
                    key={contato.id}
                    className={`flex items-center gap-2 px-2.5 py-2 border rounded-md transition-colors ${
                      isRequired
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    {/* Tipo: largura fixa */}
                    <div className="w-[150px] shrink-0">
                      <Select
                        value={contato.tipo}
                        onValueChange={(value: 'Telefone' | 'WhatsApp' | 'Email') =>
                          updateContato(contato.id, 'tipo', value)
                        }
                      >
                        <SelectTrigger className="shadow-input border-input-border h-9">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[200]">
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="Telefone">Telefone (Recados)</SelectItem>
                          <SelectItem value="Email">E-mail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor: ocupa o resto */}
                    <div className="flex-1 min-w-0">
                      <Input
                        value={contato.valor}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (contato.tipo === 'Telefone' || contato.tipo === 'WhatsApp') {
                            value = formatPhone(value);
                          }
                          updateContato(contato.id, 'valor', value);
                        }}
                        placeholder={
                          contato.tipo === 'Email' ? 'email@exemplo.com' :
                          contato.tipo === 'Telefone' ? '(11) 1234-5678' : '(11) 12345-6789'
                        }
                        className="shadow-input border-input-border h-9"
                      />
                    </div>

                    {/* Autenticar (só WhatsApp) */}
                    {isWhatsApp && contato.valor && (
                      <Button
                        type="button"
                        size="sm"
                        variant={isVerified ? "outline" : "default"}
                        onClick={() => setVerifyingWhatsApp(contato.id)}
                        className="shrink-0 h-9"
                        title="Autenticar WhatsApp"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        {isVerified ? 'Verificado' : 'Autenticar'}
                      </Button>
                    )}

                    {/* Principal (escopado por tipo) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Checkbox
                        id={`principal-${contato.id}`}
                        checked={!!contato.principal}
                        onCheckedChange={() => setPrincipal(contato.id)}
                      />
                      <Label
                        htmlFor={`principal-${contato.id}`}
                        className="text-xs cursor-pointer whitespace-nowrap"
                        title={principalLabel}
                      >
                        Principal
                      </Label>
                    </div>

                    {/* Remover (só extras) */}
                    {!isRequired && contatos.length > 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContato(contato.id)}
                        className="text-destructive hover:text-destructive h-9 w-9 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
              
              <Button
                type="button"
                variant="outline"
                onClick={addContato}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Contato Adicional
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção Endereço */}
        <AccordionItem value="endereco">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="endereco.cep">CEP *</Label>
                <Input
                  id="endereco.cep"
                  placeholder="00000-000"
                  {...register('endereco.cep', { required: 'CEP é obrigatório' })}
                  onChange={handleCEPChange}
                  className="shadow-input border-input-border"
                />
                {errors.endereco?.cep && (
                  <p className="text-sm text-destructive mt-1">{errors.endereco.cep.message}</p>
                )}
              </div>

              <div className="lg:col-span-2">
                <Label htmlFor="endereco.logradouro">Logradouro *</Label>
                <Input
                  id="endereco.logradouro"
                  {...register('endereco.logradouro', { required: 'Logradouro é obrigatório' })}
                  className="shadow-input border-input-border"
                />
                {errors.endereco?.logradouro && (
                  <p className="text-sm text-destructive mt-1">{errors.endereco.logradouro.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endereco.numero">Número *</Label>
                <Input
                  id="endereco.numero"
                  {...register('endereco.numero', { required: 'Número é obrigatório' })}
                  className="shadow-input border-input-border"
                />
                {errors.endereco?.numero && (
                  <p className="text-sm text-destructive mt-1">{errors.endereco.numero.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endereco.complemento">Complemento</Label>
                <Input
                  id="endereco.complemento"
                  {...register('endereco.complemento')}
                  className="shadow-input border-input-border"
                />
              </div>

              <div>
                <Label htmlFor="endereco.bairro">Bairro *</Label>
                <Input
                  id="endereco.bairro"
                  {...register('endereco.bairro', { required: 'Bairro é obrigatório' })}
                  className="shadow-input border-input-border"
                />
                {errors.endereco?.bairro && (
                  <p className="text-sm text-destructive mt-1">{errors.endereco.bairro.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endereco.cidade">Cidade *</Label>
                <Input
                  id="endereco.cidade"
                  {...register('endereco.cidade', { required: 'Cidade é obrigatória' })}
                  className="shadow-input border-input-border"
                />
                {errors.endereco?.cidade && (
                  <p className="text-sm text-destructive mt-1">{errors.endereco.cidade.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endereco.uf">Estado *</Label>
                <Select
                  value={getValues('endereco.uf')}
                  onValueChange={(value) => {
                    setValue('endereco.uf', value);
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger className="shadow-input border-input-border">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasil.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.endereco?.uf && (
                  <p className="text-sm text-destructive mt-1">{errors.endereco.uf.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endereco.pais">País</Label>
                <Input
                  id="endereco.pais"
                  {...register('endereco.pais')}
                  defaultValue="Brasil"
                  className="shadow-input border-input-border"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção Condições & Políticas */}
        <AccordionItem value="politicas">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Condições & Políticas
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="politicaComercial">Política Comercial</Label>
                    <Select
                      value={politicaComercial || 'NENHUMA'}
                      onValueChange={(value) => {
                        setPoliticaComercial(value === 'NENHUMA' ? undefined : value as 'P0' | 'P1' | 'P2');
                        setIsDirty(true);
                      }}
                    >
                      <SelectTrigger className="shadow-input border-input-border">
                        <SelectValue placeholder="Selecione uma política" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NENHUMA">Nenhuma política</SelectItem>
                        <SelectItem value="P0">P0 — 5% + Agrupar dia 30 → Venc. dia 10</SelectItem>
                        <SelectItem value="P1">P1 — 10% + Agrupar dia 30 → Venc. dia 5</SelectItem>
                        <SelectItem value="P2">P2 — 15% + Duas janelas (15/20 e 01/05)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      A política comercial define descontos e regras de faturamento agrupado para este cliente.
                    </p>
                  </div>

                  {politicaComercial && (
                    <div className="flex items-start space-x-3 p-3 bg-background rounded border">
                      <Switch
                        id="aplicarAuto"
                        checked={aplicarPoliticaAuto}
                        onCheckedChange={(checked) => {
                          setAplicarPoliticaAuto(checked);
                          setIsDirty(true);
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor="aplicarAuto" className="text-sm font-medium cursor-pointer">
                          Aplicar automaticamente
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Quando ativado, a política será aplicada automaticamente em novos contratos e renovações.
                        </p>
                      </div>
                    </div>
                  )}

                  {politicaComercial && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                      <h4 className="text-sm font-medium mb-2">Resumo da Política {politicaComercial}</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {politicaComercial === 'P0' && (
                          <>
                            <li>• Desconto de 5% em todos os produtos</li>
                            <li>• Faturamento agrupado: dia 30 do mês</li>
                            <li>• Vencimento padrão: dia 10 do mês seguinte</li>
                          </>
                        )}
                        {politicaComercial === 'P1' && (
                          <>
                            <li>• Desconto de 10% em todos os produtos</li>
                            <li>• Faturamento agrupado: dia 30 do mês</li>
                            <li>• Vencimento padrão: dia 5 do mês seguinte</li>
                          </>
                        )}
                        {politicaComercial === 'P2' && (
                          <>
                            <li>• Desconto de 15% em todos os produtos</li>
                            <li>• Janela 1 (01-14): fatura dia 15, vence dia 20 do mesmo mês</li>
                            <li>• Janela 2 (15-30): fatura dia 1, vence dia 5 do mês seguinte</li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Dia de vencimento padrão acordado com o cliente */}
              <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                <div>
                  <Label htmlFor="diaVencPadrao" className="text-sm font-medium">
                    Dia de vencimento padrão (1–31)
                  </Label>
                  <Input
                    id="diaVencPadrao"
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Ex.: 10"
                    value={diaVencimentoPadrao}
                    onChange={(e) => {
                      const v = e.target.value;
                      const num = Number(v);
                      if (v === '' || (num >= 1 && num <= 31)) {
                        setDiaVencimentoPadrao(v);
                        setIsDirty(true);
                      }
                    }}
                    className="shadow-input border-input-border max-w-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Quando preenchido, novos contratos deste cliente já trarão este dia como vencimento padrão.
                  </p>
                </div>
              </div>

              {/* Negociação pontual — exceções comerciais específicas do cliente */}
              <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 mt-1 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Negociação pontual</Label>
                    <p className="text-xs text-muted-foreground">
                      Configurações específicas deste cliente que serão aplicadas automaticamente nos contratos, sem depender da memória do vendedor.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="negDesconto" className="text-xs">Desconto adicional (%)</Label>
                    <Input
                      id="negDesconto"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      placeholder="Ex.: 5"
                      value={negociacaoPontual.descontoPercent}
                      onChange={(e) => {
                        setNegociacaoPontual({ ...negociacaoPontual, descontoPercent: e.target.value });
                        setIsDirty(true);
                      }}
                      className="shadow-input border-input-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="negPrazo" className="text-xs">Prazo extra (dias)</Label>
                    <Input
                      id="negPrazo"
                      type="number"
                      min={0}
                      placeholder="Ex.: 7"
                      value={negociacaoPontual.prazoExtraDias}
                      onChange={(e) => {
                        setNegociacaoPontual({ ...negociacaoPontual, prazoExtraDias: e.target.value });
                        setIsDirty(true);
                      }}
                      className="shadow-input border-input-border"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="negObs" className="text-xs">Observação</Label>
                  <Textarea
                    id="negObs"
                    rows={2}
                    placeholder="Ex.: Cliente VIP — sempre confirmar entrega com 24h de antecedência"
                    value={negociacaoPontual.observacao}
                    onChange={(e) => {
                      setNegociacaoPontual({ ...negociacaoPontual, observacao: e.target.value });
                      setIsDirty(true);
                    }}
                    className="shadow-input border-input-border"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção Outros */}
        <AccordionItem value="outros">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Outros Dados
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="statusCredito">Status de Crédito</Label>
                  <Select
                    value={getValues('statusCredito')}
                    onValueChange={(value: 'Ativo' | 'Suspenso' | 'Em análise') => {
                      setValue('statusCredito', value);
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger className="shadow-input border-input-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em análise">Em Análise</SelectItem>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  rows={4}
                  placeholder="Informações adicionais sobre o cliente..."
                  {...register('observacoes')}
                  className="shadow-input border-input-border"
                />
              </div>

              {/* LGPD */}
              <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="lgpd"
                  checked={lgpdAceito}
                  onCheckedChange={(checked) => {
                    setLgpdAceito(checked as boolean);
                    setIsDirty(true);
                  }}
                />
                <div>
                  <Label htmlFor="lgpd" className="text-sm font-medium">
                    Concordo com o tratamento dos dados pessoais *
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    De acordo com a Lei Geral de Proteção de Dados (LGPD), o cliente autoriza o uso de seus dados para fins de prestação de serviços.
                  </p>
                </div>
              </div>

              {/* Auditoria (apenas para clientes existentes) */}
              {cliente && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Auditoria
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Criado por: {cliente.auditoria.criadoPor}</p>
                    <p>Criado em: {new Date(cliente.auditoria.criadoEm).toLocaleString()}</p>
                    <p>Última atualização: {new Date(cliente.auditoria.atualizadoEm).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Botões de Ação */}
      <div className="flex flex-col md:flex-row gap-4 justify-between pt-6 border-t">
        {cliente && cliente.statusCredito === 'Ativo' && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleGenerateProposal}
            className="w-full md:w-auto"
          >
            <File className="w-4 h-4 mr-2" />
            Gerar Proposta
          </Button>
        )}
        
        <div className="flex flex-col md:flex-row gap-2 ml-auto">
          {cliente && cliente.statusCredito !== 'Ativo' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleActivate}
              className="w-full md:w-auto border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Ativar
            </Button>
          )}
          {cliente && cliente.statusCredito === 'Ativo' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleInactivate}
              className="w-full md:w-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <UserX className="w-4 h-4 mr-2" />
              Inativar
            </Button>
          )}
          
          <Button
            type="submit"
            className="w-full md:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
          
          <Button
            type="button"
            onClick={handleSubmit(handleSaveAndNew)}
            variant="secondary"
            className="w-full md:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Salvar e Novo
          </Button>
        </div>
      </div>
    </form>
  );
}