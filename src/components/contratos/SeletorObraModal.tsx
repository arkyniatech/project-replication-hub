import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Plus, Star, Search, Loader2 } from 'lucide-react';
import { Obra } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useSupabaseObras } from '@/hooks/useSupabaseObras';
import { useMultiunidade } from '@/hooks/useMultiunidade';

interface SeletorObraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  onSelect: (obra: Obra) => void;
}

export function SeletorObraModal({
  open,
  onOpenChange,
  clienteId,
  onSelect
}: SeletorObraModalProps) {
  const { lojaAtual } = useMultiunidade();
  const { obras: obrasSupabase, createObra, isLoading } = useSupabaseObras(lojaAtual?.id, clienteId);
  
  const [selectedObraId, setSelectedObraId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'selecionar' | 'nova'>('selecionar');
  
  // Form state para nova obra
  const [novaObra, setNovaObra] = useState({
    apelido: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    latitude: '' as string,
    longitude: '' as string
  });
  const [capturandoGps, setCapturandoGps] = useState(false);

  const handleCapturarGps = () => {
    if (!navigator.geolocation) {
      toast({ title: 'GPS não disponível neste dispositivo', variant: 'destructive' });
      return;
    }
    setCapturandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNovaObra(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6)
        }));
        toast({ title: 'Coordenadas capturadas', description: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` });
        setCapturandoGps(false);
      },
      (err) => {
        toast({ title: 'Não foi possível capturar GPS', description: err.message, variant: 'destructive' });
        setCapturandoGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (open && clienteId && obrasSupabase.length > 0) {
      // Tentar selecionar a obra padrão automaticamente (futuro: campo isPadrao na tabela)
      setSelectedObraId(obrasSupabase[0].id);
      setActiveTab('selecionar');
    } else if (open && clienteId && obrasSupabase.length === 0) {
      setActiveTab('nova');
    }
  }, [open, clienteId, obrasSupabase]);

  const handleBuscarCep = async () => {
    if (novaObra.cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${novaObra.cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setNovaObra(prev => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || ''
          }));
          toast({
            title: "CEP encontrado",
            description: "Endereço preenchido automaticamente"
          });
        } else {
          toast({
            title: "CEP não encontrado",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao buscar CEP",
          variant: "destructive"
        });
      }
    }
  };

  const handleSalvarNovaObra = async () => {
    // Validações
    if (!novaObra.apelido.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe um apelido para a obra",
        variant: "destructive"
      });
      return;
    }

    if (!novaObra.cep || !novaObra.logradouro || !novaObra.numero || !novaObra.bairro || !novaObra.cidade || !novaObra.uf) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do endereço",
        variant: "destructive"
      });
      return;
    }

    if (!lojaAtual?.id) {
      toast({
        title: "Loja não identificada",
        variant: "destructive"
      });
      return;
    }

    const obraData: any = {
      loja_id: lojaAtual.id,
      cliente_id: clienteId,
      nome: novaObra.apelido,
      endereco: {
        cep: novaObra.cep,
        logradouro: novaObra.logradouro,
        numero: novaObra.numero,
        complemento: novaObra.complemento,
        bairro: novaObra.bairro,
        cidade: novaObra.cidade,
        uf: novaObra.uf
      },
      status: 'ATIVA',
      ativo: true
    };
    if (novaObra.latitude) obraData.latitude = parseFloat(novaObra.latitude);
    if (novaObra.longitude) obraData.longitude = parseFloat(novaObra.longitude);

    createObra.mutate(obraData, {
      onSuccess: (obra) => {
        // Adaptar para formato legado
        const obraLegacy: Obra = {
          id: obra.id,
          clienteId: obra.cliente_id,
          apelido: obra.nome,
          endereco: obra.endereco as any,
          isPadrao: false,
          createdAt: obra.created_at || '',
          updatedAt: obra.updated_at || ''
        };
        
        onSelect(obraLegacy);
        onOpenChange(false);
        
        // Resetar form
        setNovaObra({
          apelido: '',
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          uf: '',
          latitude: '',
          longitude: ''
        });
      }
    });
  };

  const handleSelecionarObra = () => {
    const obraSelecionada = obrasSupabase.find(o => o.id === selectedObraId);
    if (obraSelecionada) {
      // Adaptar para formato legado
      const obraLegacy: Obra = {
        id: obraSelecionada.id,
        clienteId: obraSelecionada.cliente_id,
        apelido: obraSelecionada.nome,
        endereco: obraSelecionada.endereco as any,
        isPadrao: false,
        createdAt: obraSelecionada.created_at || '',
        updatedAt: obraSelecionada.updated_at || ''
      };
      
      onSelect(obraLegacy);
      onOpenChange(false);
    } else {
      toast({
        title: "Selecione uma obra",
        variant: "destructive"
      });
    }
  };

  const obrasFiltradas = obrasSupabase.filter(o => {
    const endereco = o.endereco as any;
    return (
      o.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endereco?.logradouro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endereco?.bairro?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Selecionar Obra / Local de Entrega
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'selecionar' | 'nova')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="selecionar" disabled={obrasSupabase.length === 0}>
              Selecionar Obra ({obrasSupabase.length})
            </TabsTrigger>
            <TabsTrigger value="nova">
              <Plus className="h-4 w-4 mr-1" />
              Nova Obra
            </TabsTrigger>
          </TabsList>

          <TabsContent value="selecionar" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : obrasSupabase.length > 0 ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar obra por nome ou endereço..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <RadioGroup value={selectedObraId} onValueChange={setSelectedObraId}>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {obrasFiltradas.map(obra => {
                      const endereco = obra.endereco as any;
                      return (
                        <div
                          key={obra.id}
                          className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedObraId === obra.id ? 'border-primary bg-muted/30' : ''
                          }`}
                          onClick={() => setSelectedObraId(obra.id)}
                        >
                          <RadioGroupItem value={obra.id} id={obra.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={obra.id} className="font-semibold cursor-pointer">
                                {obra.nome}
                              </Label>
                            </div>
                            {endereco && (
                              <>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {endereco.logradouro}, {endereco.numero}
                                  {endereco.complemento && ` - ${endereco.complemento}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {endereco.bairro} - {endereco.cidade}/{endereco.uf}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  CEP: {endereco.cep}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSelecionarObra} className="flex-1">
                    Selecionar Obra
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma obra cadastrada para este cliente.</p>
                <p className="text-xs mt-2">Cadastre uma nova obra na aba ao lado.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="nova" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="apelido">Apelido da Obra *</Label>
                <Input
                  id="apelido"
                  placeholder="Ex: Obra Centro, Filial Sul, Matriz..."
                  value={novaObra.apelido}
                  onChange={(e) => setNovaObra(prev => ({ ...prev, apelido: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    maxLength={8}
                    value={novaObra.cep}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, cep: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleBuscarCep}
                    className="w-full"
                  >
                    Buscar CEP
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="logradouro">Logradouro *</Label>
                <Input
                  id="logradouro"
                  placeholder="Rua, Avenida..."
                  value={novaObra.logradouro}
                  onChange={(e) => setNovaObra(prev => ({ ...prev, logradouro: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    placeholder="123"
                    value={novaObra.numero}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, numero: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Sala, Andar..."
                    value={novaObra.complemento}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, complemento: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  placeholder="Bairro"
                  value={novaObra.bairro}
                  onChange={(e) => setNovaObra(prev => ({ ...prev, bairro: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    placeholder="Cidade"
                    value={novaObra.cidade}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, cidade: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="uf">UF *</Label>
                  <Input
                    id="uf"
                    placeholder="SP"
                    maxLength={2}
                    value={novaObra.uf}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              {/* GPS / Coordenadas */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Coordenadas (opcional)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCapturarGps}
                      disabled={capturandoGps}
                    >
                      {capturandoGps ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MapPin className="h-3 w-3 mr-1" />}
                      Capturar GPS
                    </Button>
                    {(novaObra.latitude && novaObra.longitude) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${novaObra.latitude},${novaObra.longitude}`, '_blank')}
                      >
                        Abrir no Maps
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Latitude"
                    value={novaObra.latitude}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, latitude: e.target.value }))}
                  />
                  <Input
                    placeholder="Longitude"
                    value={novaObra.longitude}
                    onChange={(e) => setNovaObra(prev => ({ ...prev, longitude: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSalvarNovaObra} className="flex-1" disabled={createObra.isPending}>
                {createObra.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar e Selecionar
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
