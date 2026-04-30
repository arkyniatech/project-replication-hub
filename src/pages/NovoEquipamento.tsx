import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Copy,
  Trash2,
  Wrench,
  Info,
  Upload,
  X,
  Eye,
  FileText,
  Plus,
  Settings,
  DollarSign,
  FileBarChart,
  Cpu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Anexo } from "@/types";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { useSupabaseEquipamentos } from "@/hooks/useSupabaseEquipamentos";
import { useSupabaseModelos } from "@/hooks/useSupabaseModelos";
import { useSupabaseGrupos } from "@/hooks/useSupabaseGrupos";
import { useSupabaseLojas } from "@/modules/rh/hooks/useSupabaseLojas";
import { formatMoney, parseMoneyBR } from "@/lib/equipamentos-utils";
import { DadosTecnicosSection } from "@/components/equipamentos/DadosTecnicosSection";
import { DadosPatrimoniaisSection } from "@/components/equipamentos/DadosPatrimoniaisSection";
import { DadosFiscaisSection } from "@/components/equipamentos/DadosFiscaisSection";

const checklistsDisponiveis = [
  'Entrega',
  'Devolução',
  'Manutenção',
  'Inspeção',
  'Limpeza'
];

interface FormData {
  codigo: string;
  grupoId: string;
  modeloId: string;
  marcaId: string;
  nome: string;
  numeroSerie: string;
  valorIndenizacao: string;
  situacao: 'DISPONIVEL' | 'MANUTENCAO' | 'RESERVADO' | 'BAIXADO';
  lojaId: string;
  tipoControle: 'SERIALIZADO' | 'SALDO';
  quantidade: string;
  observacoes: string;
  // Fase 1: Dados Técnicos
  potencia?: string;
  tensao?: string;
  peso_kg?: number;
  dimensoes_cm?: string;
  capacidade?: string;
  combustivel?: string;
  // Fase 3: Dados Patrimoniais
  ano_fabricacao?: number;
  data_aquisicao?: string;
  valor_aquisicao?: number;
  vida_util_meses?: number;
  condicao?: string;
  // Fase 4: Dados Fiscais
  ncm?: string;
  cfop?: string;
  aliquota_iss?: number;
  aliquota_icms?: number;
  cst_icms?: string;
}

export default function NovoEquipamento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const isEditMode = !!id;

  const [checklistsSelecionados, setChecklistsSelecionados] = useState<string[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    codigo: '',
    grupoId: '',
    modeloId: '',
    marcaId: '',
    nome: '',
    numeroSerie: '',
    valorIndenizacao: '',
    situacao: 'DISPONIVEL',
    lojaId: '',
    tipoControle: 'SERIALIZADO',
    quantidade: '1',
    observacoes: '',
    // Fase 1
    potencia: '',
    tensao: '',
    peso_kg: undefined,
    dimensoes_cm: '',
    capacidade: '',
    combustivel: '',
    // Fase 3
    ano_fabricacao: undefined,
    data_aquisicao: '',
    valor_aquisicao: undefined,
    vida_util_meses: 60,
    condicao: 'BOM',
    // Fase 4
    ncm: '',
    cfop: '',
    aliquota_iss: 5.0,
    aliquota_icms: 18.0,
    cst_icms: '',
  });

  // Hooks do Supabase
  const { grupos } = useSupabaseGrupos();
  const { lojas } = useSupabaseLojas();
  const {
    createEquipamento,
    updateEquipamento,
    gerarCodigo,
    equipamentos: equipamentosExistentes,
    useEquipamento
  } = useSupabaseEquipamentos(
    formData.lojaId || undefined,
    undefined,
    formData.modeloId || undefined
  );

  // Hook para buscar modelos baseado no grupo selecionado
  const { modelos: modelosDisponiveis } = useSupabaseModelos(formData.grupoId || undefined);

  // Buscar equipamento se estiver em modo de edição
  const { data: equipamentoExistente, isLoading: loadingEquipamento } = useEquipamento(id || '');
  const { modelos: todosModelos } = useSupabaseModelos();

  // Atalho para novo equipamento
  useKeyboardShortcut('e', () => {
    if (window.location.pathname === '/equipamentos') {
      navigate('/equipamentos/novo');
    }
  });

  // Gerar código automaticamente quando grupo e loja são selecionados
  useEffect(() => {
    const gerarCodigoAutomatico = async () => {
      if (formData.grupoId && formData.lojaId && !formData.codigo && !isEditMode) {
        try {
          const codigoGerado = await gerarCodigo.mutateAsync({
            lojaId: formData.lojaId,
            grupoId: formData.grupoId
          });
          setFormData(prev => ({ ...prev, codigo: codigoGerado }));
        } catch (error) {
          console.error('Erro ao gerar código:', error);
        }
      }
    };

    gerarCodigoAutomatico();
  }, [formData.grupoId, formData.lojaId, isEditMode]);

  useEffect(() => {
    // Selecionar primeira loja por padrão se houver
    if (lojas.length > 0 && !formData.lojaId && !isEditMode) {
      setFormData(prev => ({ ...prev, lojaId: lojas[0].id }));
    }
  }, [lojas, isEditMode]);

  // Carregar dados do equipamento em modo de edição
  useEffect(() => {
    if (isEditMode && equipamentoExistente && todosModelos.length > 0) {
      const modelo = todosModelos.find(m => m.id === equipamentoExistente.modelo_id);

      // Extrair quantidade para SALDO
      let quantidade = '1';
      if (equipamentoExistente.tipo === 'SALDO' && equipamentoExistente.saldos_por_loja) {
        const saldos = equipamentoExistente.saldos_por_loja as Record<string, { qtd: number }>;
        const lojaId = equipamentoExistente.loja_atual_id;
        quantidade = String(saldos[lojaId]?.qtd || 1);
      }

      setFormData({
        codigo: equipamentoExistente.codigo_interno || '',
        grupoId: equipamentoExistente.grupo_id || '',
        modeloId: equipamentoExistente.modelo_id || '',
        marcaId: (equipamentoExistente as any).marca_id || '',
        nome: modelo?.nome_comercial || '',
        numeroSerie: equipamentoExistente.numero_serie || '',
        valorIndenizacao: formatMoney(equipamentoExistente.valor_indenizacao || 0),
        situacao: equipamentoExistente.status_global as FormData['situacao'],
        lojaId: equipamentoExistente.loja_atual_id || '',
        tipoControle: equipamentoExistente.tipo as FormData['tipoControle'],
        quantidade,
        observacoes: equipamentoExistente.observacoes || '',
      });
    }
  }, [isEditMode, equipamentoExistente, todosModelos]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatarMoeda = (valor: string) => {
    const numero = valor.replace(/\D/g, '');
    if (numero === '') return '';

    const valorFormatado = (parseInt(numero) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return valorFormatado;
  };

  const adicionarAnexo = () => {
    const novoAnexo: Anexo = {
      id: `anexo-${Date.now()}`,
      nome: `documento-${anexos.length + 1}.pdf`,
      url: `#mock-url-${anexos.length + 1}`,
      tipo: 'application/pdf'
    };
    setAnexos([...anexos, novoAnexo]);

    toast({
      title: "Arquivo anexado",
      description: `${novoAnexo.nome} foi anexado com sucesso`,
    });
  };

  const removerAnexo = (id: string) => {
    setAnexos(anexos.filter(anexo => anexo.id !== id));
    toast({
      title: "Arquivo removido",
      description: "O anexo foi removido com sucesso",
    });
  };

  const duplicarEquipamento = () => {
    setIsDuplicating(true);

    setFormData(prev => ({
      ...prev,
      codigo: '',
      numeroSerie: '',
    }));

    setAnexos([]);

    toast({
      title: "Equipamento duplicado",
      description: "Os dados foram copiados. Ajuste as informações necessárias.",
    });
    setIsDuplicating(false);
  };

  const enviarParaManutencao = () => {
    const motivo = prompt("Informe o motivo da manutenção:");
    if (motivo) {
      setFormData(prev => ({ ...prev, situacao: 'MANUTENCAO' }));
      toast({
        title: "Enviado para manutenção",
        description: `Equipamento marcado para manutenção. Motivo: ${motivo}`,
      });
    }
  };

  const inativarEquipamento = () => {
    if (confirm("Tem certeza que deseja inativar este equipamento?")) {
      setFormData(prev => ({ ...prev, situacao: 'BAIXADO' }));
      toast({
        title: "Equipamento inativado",
        description: "O equipamento foi marcado como baixado",
        variant: "destructive",
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Código obrigatório apenas para controle por SERIALIZADO
    if (formData.tipoControle === 'SERIALIZADO' && !formData.codigo.trim()) {
      newErrors.codigo = "Código é obrigatório para controle por série";
    }

    if (!formData.grupoId) {
      newErrors.grupoId = "Grupo é obrigatório";
    }

    if (!formData.modeloId) {
      newErrors.modeloId = "Modelo é obrigatório";
    }

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome/Descrição é obrigatório";
    }

    if (!formData.valorIndenizacao.trim() || parseMoneyBR(formData.valorIndenizacao) <= 0) {
      newErrors.valorIndenizacao = "Valor de indenização é obrigatório";
    }

    if (!formData.lojaId) {
      newErrors.lojaId = "Loja/Localização é obrigatória";
    }

    // Validar quantidade para controle por saldo/grupo
    if (formData.tipoControle === 'SALDO') {
      const quantidade = parseInt(formData.quantidade);
      if (!quantidade || quantidade <= 0) {
        newErrors.quantidade = "Quantidade é obrigatória para controle por saldo";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erro na validação",
        description: "Corrija os campos destacados",
        variant: "destructive",
      });
      return;
    }

    try {
      // Modo de edição
      if (isEditMode && id) {
        const equipamentoData: any = {
          id,
          numero_serie: formData.numeroSerie || null,
          valor_indenizacao: parseMoneyBR(formData.valorIndenizacao),
          status_global: formData.situacao,
          observacoes: formData.observacoes || null,
        };

        // Atualizar quantidade para SALDO
        if (formData.tipoControle === 'SALDO' && equipamentoExistente) {
          const saldosBase = equipamentoExistente.saldos_por_loja as Record<string, { qtd: number }> || {};
          const saldosAtualizados = { ...saldosBase };
          saldosAtualizados[formData.lojaId] = { qtd: parseInt(formData.quantidade) };
          equipamentoData.saldos_por_loja = saldosAtualizados;
        }

        await updateEquipamento.mutateAsync(equipamentoData);

        toast({
          title: "Equipamento atualizado",
          description: "As alterações foram salvas com sucesso",
        });

        navigate('/equipamentos');
        return;
      }

      // Modo de criação
      try {
        // Para SALDO: verificar se já existe equipamento do mesmo modelo na loja
        if (formData.tipoControle === 'SALDO' && equipamentosExistentes) {
          const equipamentoExistente = equipamentosExistentes.find(
            eq => eq.modelo_id === formData.modeloId &&
              eq.loja_atual_id === formData.lojaId &&
              eq.tipo === 'SALDO'
          );

          if (equipamentoExistente) {
            // Atualizar saldo existente
            const saldosBase = equipamentoExistente.saldos_por_loja as Record<string, { qtd: number }> || {};
            const saldosAtualizados = { ...saldosBase };
            const saldoAtual = saldosAtualizados[formData.lojaId]?.qtd || 0;
            const quantidadeAdd = parseInt(formData.quantidade) || 1;
            const novaQuantidade = saldoAtual + quantidadeAdd;

            saldosAtualizados[formData.lojaId] = { qtd: novaQuantidade };

            await updateEquipamento.mutateAsync({
              id: equipamentoExistente.id,
              saldos_por_loja: saldosAtualizados,
            });

            toast({
              title: "Quantidade atualizada!",
              description: `Adicionado ${quantidadeAdd} un. Total agora: ${novaQuantidade}`,
            });

            navigate('/equipamentos');
            return;
          }
        }

        // Gerar código automático com grupo
        let codigoInterno = formData.codigo;
        if (!codigoInterno && formData.grupoId) {
          const codigoGerado = await gerarCodigo.mutateAsync({
            lojaId: formData.lojaId,
            grupoId: formData.grupoId
          });
          codigoInterno = codigoGerado;
        }

        // Mapear dados para o schema do Supabase
        const equipamentoData = {
          codigo_interno: codigoInterno,
          tipo: formData.tipoControle, // Já está padronizado como SERIALIZADO/SALDO
          modelo_id: formData.modeloId,
          grupo_id: formData.grupoId,
          numero_serie: formData.numeroSerie || null,
          valor_indenizacao: parseMoneyBR(formData.valorIndenizacao),
          loja_atual_id: formData.lojaId,
          status_global: formData.situacao,
          saldos_por_loja: formData.tipoControle === 'SALDO'
            ? { [formData.lojaId]: { qtd: parseInt(formData.quantidade) } }
            : {},
          observacoes: formData.observacoes || null,
          // Fase 1: Dados Técnicos
          // REMOVED: Phase 1 fields missing in DB
          // potencia: formData.potencia || null,
          // tensao: formData.tensao || null,
          // peso_kg: formData.peso_kg || null,
          // dimensoes_cm: formData.dimensoes_cm || null,
          // capacidade: formData.capacidade || null,
          // combustivel: formData.combustivel || null,
          // Fase 3: Dados Patrimoniais
          // REMOVED: Phase 3 fields missing in DB
          // ano_fabricacao: formData.ano_fabricacao || null,
          // data_aquisicao: formData.data_aquisicao || null,
          // valor_aquisicao: formData.valor_aquisicao || null,
          // vida_util_meses: formData.vida_util_meses || 60,
          // condicao: formData.condicao || 'BOM',
          // Fase 4: Dados Fiscais
          // REMOVED: Fiscal fields missing in DB
          // ncm: formData.ncm || null,
          // cfop: formData.cfop || null,
          // aliquota_iss: formData.aliquota_iss || 5.0,
          // aliquota_icms: formData.aliquota_icms || 18.0,
          // cst_icms: formData.cst_icms || null,
          historico: [{
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            tipo: 'CRIACAO',
            descricao: 'Equipamento criado',
            usuario: 'admin',
          }],
        };

        await createEquipamento.mutateAsync(equipamentoData);

        toast({
          title: "Equipamento cadastrado",
          description: `${formData.nome} foi cadastrado com sucesso`,
        });

        navigate('/equipamentos');
      } catch (error: any) {
        console.error('Erro ao criar equipamento:', error);
        toast({
          title: "Erro ao criar",
          description: error.message || "Ocorreu um erro ao criar o equipamento",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro ao salvar equipamento:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o equipamento",
        variant: "destructive",
      });
    }
  };

  if (isEditMode && loadingEquipamento) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando equipamento...</p>
        </div>
      </div>
    );
  }

  if (isEditMode && !equipamentoExistente) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Equipamento não encontrado</p>
          <Button onClick={() => navigate('/equipamentos')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/equipamentos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Atualize as informações do equipamento' : 'Cadastre um novo equipamento para locação'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identificação */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Identificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="grupoId">Grupo/Categoria *</Label>
                  <Select
                    value={formData.grupoId}
                    onValueChange={(value) => {
                      handleInputChange('grupoId', value);
                      handleInputChange('modeloId', ''); // Reset modelo ao mudar grupo
                    }}
                    disabled={isEditMode}
                  >
                    <SelectTrigger className={errors.grupoId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione um grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Grupo não pode ser alterado em modo de edição
                    </p>
                  )}
                  {errors.grupoId && (
                    <p className="text-sm text-destructive mt-1">{errors.grupoId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="modeloId">Modelo *</Label>
                  <Select
                    value={formData.modeloId}
                    onValueChange={(value) => handleInputChange('modeloId', value)}
                    disabled={!formData.grupoId}
                  >
                    <SelectTrigger className={errors.modeloId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={formData.grupoId ? "Selecione um modelo" : "Selecione um grupo primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {modelosDisponiveis.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          {modelo.nome_comercial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.modeloId && (
                    <p className="text-sm text-destructive mt-1">{errors.modeloId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="codigo" className="flex items-center gap-2">
                    Código Interno (Gerado Automaticamente)
                    <Badge variant="outline" className="text-xs">
                      Auto
                    </Badge>
                  </Label>
                  <div className="flex items-center gap-2">
                    {formData.codigo ? (
                      <Badge variant="secondary" className="text-sm py-2 px-4 font-mono">
                        {formData.codigo}
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Será gerado automaticamente ao salvar
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: LA + Loja(3) + Grupo(2) + Sequencial(3)
                  </p>
                </div>

                <div>
                  <Label htmlFor="nome">Nome/Descrição Comercial *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Ex: Andaime Tubular 2m"
                    className={errors.nome ? 'border-destructive' : ''}
                  />
                  {errors.nome && (
                    <p className="text-sm text-destructive mt-1">{errors.nome}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="numeroSerie">Número de Série</Label>
                  <Input
                    id="numeroSerie"
                    value={formData.numeroSerie}
                    onChange={(e) => handleInputChange('numeroSerie', e.target.value)}
                    placeholder="Opcional - para item único"
                  />
                </div>

                <div>
                  <Label htmlFor="valorIndenizacao">Valor de Indenização *</Label>
                  <Input
                    id="valorIndenizacao"
                    value={formData.valorIndenizacao}
                    onChange={(e) => handleInputChange('valorIndenizacao', formatarMoeda(e.target.value))}
                    placeholder="R$ 0,00"
                    className={errors.valorIndenizacao ? 'border-destructive' : ''}
                  />
                  {errors.valorIndenizacao && (
                    <p className="text-sm text-destructive mt-1">{errors.valorIndenizacao}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Situação & Localização */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Situação & Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="situacao">Situação *</Label>
                  <Select
                    value={formData.situacao}
                    onValueChange={(value) => handleInputChange('situacao', value as FormData['situacao'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISPONIVEL">Disponível</SelectItem>
                      <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                      <SelectItem value="RESERVADO">Reservado</SelectItem>
                      <SelectItem value="BAIXADO">Baixado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lojaId">Loja/Localização *</Label>
                  <Select
                    value={formData.lojaId}
                    onValueChange={(value) => handleInputChange('lojaId', value)}
                  >
                    <SelectTrigger className={errors.lojaId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.lojaId && (
                    <p className="text-sm text-destructive mt-1">{errors.lojaId}</p>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    Tipo de Controle
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          <strong>Por Série:</strong> Item único, um contrato por vez<br />
                          <strong>Por Saldo:</strong> Controle por quantidade disponível
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={formData.tipoControle}
                    onValueChange={(value) => handleInputChange('tipoControle', value as FormData['tipoControle'])}
                    disabled={isEditMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERIALIZADO">Por Série/Unidade</SelectItem>
                      <SelectItem value="SALDO">Por Saldo/Grupo</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tipo de controle não pode ser alterado
                    </p>
                  )}
                </div>

                {formData.tipoControle === 'SALDO' && (
                  <div>
                    <Label htmlFor="quantidade">Quantidade em Estoque *</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min="1"
                      value={formData.quantidade}
                      onChange={(e) => handleInputChange('quantidade', e.target.value)}
                      placeholder="1"
                      className={errors.quantidade ? 'border-destructive' : ''}
                    />
                    {errors.quantidade && (
                      <p className="text-sm text-destructive mt-1">{errors.quantidade}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Checklists */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Checklists</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Selecione os checklists aplicáveis
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checklistsDisponiveis.map((checklist) => (
                    <div key={checklist} className="flex items-center space-x-2">
                      <Checkbox
                        id={checklist}
                        checked={checklistsSelecionados.includes(checklist)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setChecklistsSelecionados([...checklistsSelecionados, checklist]);
                          } else {
                            setChecklistsSelecionados(
                              checklistsSelecionados.filter(c => c !== checklist)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={checklist}>{checklist}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Fotos & Documentos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Anexe fotos e documentos do equipamento
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarAnexo}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Adicionar Arquivo
                </Button>

                {anexos.length > 0 && (
                  <div className="space-y-2">
                    {anexos.map((anexo) => (
                      <div
                        key={anexo.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{anexo.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removerAnexo(anexo.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados Estendidos (Fases 1,3,4) */}
            <Card className="shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Dados Estendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tecnicos" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tecnicos" className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Técnicos
                    </TabsTrigger>
                    <TabsTrigger value="patrimonial" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Patrimonial
                    </TabsTrigger>
                    <TabsTrigger value="fiscal" className="flex items-center gap-2">
                      <FileBarChart className="w-4 h-4" />
                      Fiscal
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tecnicos" className="mt-4">
                    <DadosTecnicosSection
                      potencia={formData.potencia}
                      tensao={formData.tensao}
                      pesoKg={formData.peso_kg}
                      dimensoesCm={formData.dimensoes_cm}
                      capacidade={formData.capacidade}
                      combustivel={formData.combustivel}
                      onChange={handleInputChange}
                    />
                  </TabsContent>

                  <TabsContent value="patrimonial" className="mt-4">
                    <DadosPatrimoniaisSection
                      anoFabricacao={formData.ano_fabricacao}
                      dataAquisicao={formData.data_aquisicao}
                      valorAquisicao={formData.valor_aquisicao}
                      vidaUtilMeses={formData.vida_util_meses}
                      condicao={formData.condicao}
                      onChange={handleInputChange}
                    />
                  </TabsContent>

                  <TabsContent value="fiscal" className="mt-4">
                    <DadosFiscaisSection
                      ncm={formData.ncm}
                      cfop={formData.cfop}
                      aliquotaIss={formData.aliquota_iss}
                      aliquotaIcms={formData.aliquota_icms}
                      cstIcms={formData.cst_icms}
                      onChange={handleInputChange}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card className="shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    placeholder="Informações adicionais sobre o equipamento..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="flex gap-3">
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={duplicarEquipamento}
                      disabled={isDuplicating}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </Button>
                  )}

                  {isEditMode && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={enviarParaManutencao}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Enviar p/ Manutenção
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={inativarEquipamento}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Inativar
                      </Button>
                    </>
                  )}
                </div>

                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Atualizar Equipamento' : 'Salvar Equipamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </TooltipProvider>
  );
}