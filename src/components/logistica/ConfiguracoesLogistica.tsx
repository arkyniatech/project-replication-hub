import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings,
  MapPin,
  Clock,
  MessageSquare,
  AlertTriangle,
  Plus,
  X,
  Truck,
  Users,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseLogisticaConfig } from "@/hooks/useSupabaseLogisticaConfig";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ConfiguracaoLogisticaCompleta, Motorista, Veiculo } from "@/types";

export function ConfiguracoesLogistica() {
  const { toast } = useToast();
  const { session } = useMultiunidade();
  const lojaId = session.lojaAtivaId || '';
  
  // Verificar se é loja específica (não "TODAS")
  const isLojaEspecifica = lojaId && lojaId !== 'TODAS';
  
  const { config: configDB, isLoading, updateConfig, createConfig } = useSupabaseLogisticaConfig(
    isLojaEspecifica ? lojaId : ''
  );

  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [intervaloAlmocoInicio, setIntervaloAlmocoInicio] = useState('12:00');
  const [intervaloAlmocoFim, setIntervaloAlmocoFim] = useState('13:00');
  const [baseEndereco, setBaseEndereco] = useState('');
  const [baseLat, setBaseLat] = useState(-23.5505);
  const [baseLon, setBaseLon] = useState(-46.6333);
  const [motivosNaoSaida, setMotivosNaoSaida] = useState<string[]>([]);
  const [motivosNaoEntrega, setMotivosNaoEntrega] = useState<string[]>([]);
  const [templateEntrega, setTemplateEntrega] = useState('');
  const [templateRetirada, setTemplateRetirada] = useState('');
  const [templateAviso, setTemplateAviso] = useState('');

  // Carregar configurações do banco
  useEffect(() => {
    if (configDB) {
      setHorarioInicio(configDB.horario_inicio || '08:00');
      setHorarioFim(configDB.horario_fim || '18:00');
      setIntervaloAlmocoInicio(configDB.intervalo_almoco_inicio || '12:00');
      setIntervaloAlmocoFim(configDB.intervalo_almoco_fim || '13:00');
      setBaseEndereco(configDB.base_endereco || '');
      setBaseLat(configDB.base_latitude || -23.5505);
      setBaseLon(configDB.base_longitude || -46.6333);
      setMotivosNaoSaida((configDB.motivos_nao_saida as string[]) || []);
      setMotivosNaoEntrega((configDB.motivos_nao_entrega as string[]) || []);
      setTemplateEntrega(configDB.template_entrega || '');
      setTemplateRetirada(configDB.template_retirada || '');
      setTemplateAviso(configDB.template_aviso || '');
    }
  }, [configDB]);

  const [motoristas, setMotoristas] = useState<Motorista[]>([
    { id: '1', nome: 'Carlos Silva', telefone: '(11) 91111-1111', cnh: '12345678900', ativo: true },
    { id: '2', nome: 'Ana Costa', telefone: '(11) 92222-2222', cnh: '12345678901', ativo: true }
  ]);

  const [veiculos, setVeiculos] = useState<Veiculo[]>([
    { id: '1', placa: 'ABC-1234', modelo: 'Fiorino', capacidadeM3: 2.5, capacidadeKg: 650, ativo: true },
    { id: '2', placa: 'DEF-5678', modelo: 'Sprinter', capacidadeM3: 10, capacidadeKg: 1500, ativo: true }
  ]);

  const [novoMotivo, setNovoMotivo] = useState('');
  const [tipoMotivo, setTipoMotivo] = useState<'saida' | 'entrega'>('saida');

  // Adicionar motivo
  const adicionarMotivo = () => {
    if (!novoMotivo.trim()) return;

    if (tipoMotivo === 'saida') {
      setMotivosNaoSaida(prev => [...prev, novoMotivo.trim()]);
    } else {
      setMotivosNaoEntrega(prev => [...prev, novoMotivo.trim()]);
    }
    
    setNovoMotivo('');
    toast({
      title: "Motivo adicionado",
      description: "O novo motivo foi adicionado à lista"
    });
  };

  // Remover motivo
  const removerMotivo = (index: number, tipo: 'saida' | 'entrega') => {
    if (tipo === 'saida') {
      setMotivosNaoSaida(prev => prev.filter((_, i) => i !== index));
    } else {
      setMotivosNaoEntrega(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Salvar configurações
  const salvarConfiguracoes = async () => {
    if (!isLojaEspecifica) {
      toast({
        title: "Loja não selecionada",
        description: "Por favor, selecione uma loja específica antes de salvar as configurações",
        variant: "destructive"
      });
      return;
    }

    try {
      const configParaSalvar = {
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        intervalo_almoco_inicio: intervaloAlmocoInicio,
        intervalo_almoco_fim: intervaloAlmocoFim,
        base_endereco: baseEndereco,
        base_latitude: baseLat,
        base_longitude: baseLon,
        motivos_nao_saida: motivosNaoSaida,
        motivos_nao_entrega: motivosNaoEntrega,
        template_entrega: templateEntrega,
        template_retirada: templateRetirada,
        template_aviso: templateAviso
      };

      // Se não existe configuração, criar nova; senão, atualizar
      if (!configDB) {
        await createConfig(configParaSalvar);
      } else {
        await updateConfig(configParaSalvar);
      }
      
      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      {!isLojaEspecifica && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Por favor, selecione uma loja específica para gerenciar as configurações de logística.
            Não é possível salvar configurações quando "Todas as lojas" está selecionado.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações de Logística
          </h2>
          <p className="text-muted-foreground">
            Gerencie as configurações do módulo de logística
          </p>
        </div>
        <Button onClick={salvarConfiguracoes} disabled={!isLojaEspecifica}>
          Salvar Configurações
        </Button>
      </div>

      {/* Base da Loja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Base da Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Endereço da Base</label>
            <Textarea
              value={baseEndereco}
              onChange={(e) => setBaseEndereco(e.target.value)}
              placeholder="Endereço completo da base"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Latitude</label>
              <Input
                type="number"
                step="0.000001"
                value={baseLat}
                onChange={(e) => setBaseLat(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Longitude</label>
              <Input
                type="number"
                step="0.000001"
                value={baseLon}
                onChange={(e) => setBaseLon(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jornada de Trabalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Jornada de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Horário de Início</label>
              <Input
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Horário de Fim</label>
              <Input
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Intervalo de Almoço - Início</label>
              <Input
                type="time"
                value={intervaloAlmocoInicio}
                onChange={(e) => setIntervaloAlmocoInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Intervalo de Almoço - Fim</label>
              <Input
                type="time"
                value={intervaloAlmocoFim}
                onChange={(e) => setIntervaloAlmocoFim(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Modelos de Mensagem WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Mensagem de Entrega</label>
            <Textarea
              value={templateEntrega}
              onChange={(e) => setTemplateEntrega(e.target.value)}
              placeholder="Modelo de mensagem para entregas"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Mensagem de Retirada</label>
            <Textarea
              value={templateRetirada}
              onChange={(e) => setTemplateRetirada(e.target.value)}
              placeholder="Modelo de mensagem para retiradas"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mensagem de Aviso</label>
            <Textarea
              value={templateAviso}
              onChange={(e) => setTemplateAviso(e.target.value)}
              placeholder="Modelo de mensagem de aviso"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>Variáveis disponíveis:</strong> {`{{cliente}}, {{data}}, {{hora}}, {{tipo}}`}
          </div>
        </CardContent>
      </Card>

      {/* Motivos de Falha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Motivos de Falha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Motivos de Não Saída */}
          <div>
            <h4 className="font-medium mb-3">Motivos de Não Saída</h4>
            <div className="space-y-2">
              {motivosNaoSaida.map((motivo, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{motivo}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removerMotivo(index, 'saida')}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Novo motivo de não saída"
                value={tipoMotivo === 'saida' ? novoMotivo : ''}
                onChange={(e) => {
                  setTipoMotivo('saida');
                  setNovoMotivo(e.target.value);
                }}
                onKeyPress={(e) => e.key === 'Enter' && tipoMotivo === 'saida' && adicionarMotivo()}
              />
              <Button 
                onClick={() => {
                  setTipoMotivo('saida');
                  adicionarMotivo();
                }}
                disabled={tipoMotivo !== 'saida' || !novoMotivo.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Motivos de Não Entrega */}
          <div>
            <h4 className="font-medium mb-3">Motivos de Não Entrega</h4>
            <div className="space-y-2">
              {motivosNaoEntrega.map((motivo, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{motivo}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removerMotivo(index, 'entrega')}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Novo motivo de não entrega"
                value={tipoMotivo === 'entrega' ? novoMotivo : ''}
                onChange={(e) => {
                  setTipoMotivo('entrega');
                  setNovoMotivo(e.target.value);
                }}
                onKeyPress={(e) => e.key === 'Enter' && tipoMotivo === 'entrega' && adicionarMotivo()}
              />
              <Button 
                onClick={() => {
                  setTipoMotivo('entrega');
                  adicionarMotivo();
                }}
                disabled={tipoMotivo !== 'entrega' || !novoMotivo.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outras Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Tempo de Deslocamento Urbano (minutos)
            </label>
            <Input
              type="number"
              min="5"
              max="120"
              value={20}
              onChange={() => {}}
              className="w-32"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tempo padrão quando coordenadas não disponíveis
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}