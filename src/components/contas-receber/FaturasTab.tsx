import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText, Printer, Mail, Download, Search, Eye } from "lucide-react";
import { useSupabaseContratos } from "@/hooks/useSupabaseContratos";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useSupabaseTitulos } from "@/hooks/useSupabaseTitulos";
import { useSupabaseFaturas } from "@/hooks/useSupabaseFaturas";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { useToast } from "@/hooks/use-toast";
import { ItemFatura } from "@/types";
import { APP_CONFIG } from "@/config/app";
import { StatusBadge } from "@/components/ui/status-badge";

export default function FaturasTab() {
  const [cliente, setCliente] = useState("");
  const [contrato, setContrato] = useState("");
  const [emissao, setEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [vencimento, setVencimento] = useState("");
  const [valorFiscal, setValorFiscalMock] = useState(false);
  const [formaPreferida, setFormaPreferida] = useState<'Boleto' | 'PIX' | 'Cartão'>('Boleto');
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemFatura[]>([]);
  const [acrescimos, setAcrescimos] = useState("0");
  const [descontos, setDescontos] = useState("0");
  const [showPreview, setShowPreview] = useState(false);
  const [showListaFaturas, setShowListaFaturas] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { lojaAtual } = useMultiunidade();
  
  const { contratos = [] } = useSupabaseContratos(lojaAtual?.id);
  const { clientes = [] } = useSupabaseClientes(lojaAtual?.id);
  const { createTitulo } = useSupabaseTitulos(lojaAtual?.id);
  const { faturas = [] } = useSupabaseFaturas(lojaAtual?.id);
  
  const contratoSelecionado = contratos.find(c => String(c.id) === String(contrato));
  const clienteSelecionado = clientes.find(c => c.id === (cliente || contratoSelecionado?.cliente_id));

  const subtotal = itens.reduce((acc, item) => acc + item.subtotal, 0);
  const acrescimosNum = parseFloat(acrescimos) || 0;
  const descontosNum = parseFloat(descontos) || 0;
  const total = subtotal + acrescimosNum - descontosNum;

  const filteredFaturas = useMemo(() => {
    if (!searchTerm) return faturas;
    return faturas.filter((fatura: any) => 
      fatura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fatura.contrato?.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fatura.cliente?.nome || fatura.cliente?.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [faturas, searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const adicionarItem = () => {
    const novoItem: ItemFatura = {
      id: Date.now().toString(),
      descricao: "",
      quantidade: 1,
      periodo: "",
      preco: 0,
      subtotal: 0,
    };
    setItens([...itens, novoItem]);
  };

  const atualizarItem = (id: string, campo: keyof ItemFatura, valor: any) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        const itemAtualizado = { ...item, [campo]: valor };
        if (campo === 'quantidade' || campo === 'preco') {
          itemAtualizado.subtotal = itemAtualizado.quantidade * itemAtualizado.preco;
        }
        return itemAtualizado;
      }
      return item;
    }));
  };

  const removerItem = (id: string) => {
    setItens(itens.filter(item => item.id !== id));
  };

  const handleGerarFatura = async () => {
    if (!clienteSelecionado || !contrato || !vencimento || itens.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos um item.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Gerar número da fatura
      const numeroFatura = `FAT-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;

      // Criar título correspondente
      await createTitulo.mutateAsync({
        numero: numeroFatura,
        contrato_id: contrato,
        cliente_id: clienteSelecionado.id,
        loja_id: lojaAtual?.id,
        categoria: 'Locação',
        subcategoria: 'Locação Principal',
        origem: 'CONTRATO',
        emissao,
        vencimento,
        valor: total,
        pago: 0,
        saldo: total,
        forma: formaPreferida === 'Boleto' ? 'Boleto' : formaPreferida,
        status: 'Em aberto',
        timeline: [
          {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            tipo: 'criacao',
            descricao: `Título criado a partir da fatura ${numeroFatura}`,
            usuario: 'Admin'
          }
        ],
        observacoes,
      });

      toast({
        title: "Fatura gerada",
        description: `Fatura ${numeroFatura} gerada com sucesso e título criado.`,
      });

      // Limpar formulário
      setCliente("");
      setContrato("");
      setVencimento("");
      setObservacoes("");
      setItens([]);
      setAcrescimos("0");
      setDescontos("0");
      setValorFiscalMock(false);
    } catch (error) {
      console.error('Erro ao gerar fatura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a fatura.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewPDF = () => {
    if (!clienteSelecionado || itens.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um cliente e adicione itens para visualizar o preview.",
        variant: "destructive",
      });
      return;
    }
    setShowPreview(true);
  };

  const handleSegundaVia = () => {
    toast({
      title: "2ª Via",
      description: "Segunda via da fatura será reenviada.",
    });
  };

  const handleEnviarEmail = () => {
    toast({
      title: "E-mail enviado",
      description: "Fatura enviada por e-mail.",
    });
  };

  const handleEnviarWhatsApp = () => {
    toast({
      title: "WhatsApp enviado",
      description: "Fatura enviada por WhatsApp.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Toggle entre lista e formulário */}
      <div className="flex gap-2">
        <Button
          variant={showListaFaturas ? "default" : "outline"}
          onClick={() => setShowListaFaturas(true)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Ver Faturas
        </Button>
        <Button
          variant={!showListaFaturas ? "default" : "outline"}
          onClick={() => setShowListaFaturas(false)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Fatura
        </Button>
      </div>

      {/* Lista de Faturas */}
      {showListaFaturas ? (
        <Card>
          <CardHeader>
            <CardTitle>Faturas Emitidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Busca */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, contrato ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tabela de faturas */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaturas.length > 0 ? (
                    filteredFaturas.map((fatura: any) => (
                      <TableRow key={fatura.id}>
                        <TableCell className="font-medium">{fatura.numero}</TableCell>
                        <TableCell>{fatura.cliente?.nome || fatura.cliente?.razao_social || 'N/A'}</TableCell>
                        <TableCell>{fatura.contrato?.numero || 'N/A'}</TableCell>
                        <TableCell>{formatDate(fatura.emissao)}</TableCell>
                        <TableCell>{formatDate(fatura.vencimento)}</TableCell>
                        <TableCell>
                          <StatusBadge 
                            status={{
                              label: fatura.tipo === 'FISCAL' ? 'Fiscal' : 'Demonstrativo',
                              value: fatura.tipo,
                              color: fatura.tipo === 'FISCAL' ? 'info' as const : 'secondary' as const
                            }}
                          />
                        </TableCell>
                        <TableCell>{fatura.forma_preferida}</TableCell>
                        <TableCell className="font-bold">R$ {(fatura.total || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={handleSegundaVia}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleEnviarEmail}>
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchTerm 
                          ? "Nenhuma fatura encontrada com os filtros aplicados"
                          : "Nenhuma fatura emitida ainda"
                        }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gerar Fatura / Documento de Cobrança</CardTitle>
          </CardHeader>
        <CardContent className="space-y-6">
          {/* Cabeçalho */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <select
                id="cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground mt-1"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome || c.razao_social}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="contrato">Contrato/Aditivo</Label>
              <select
                id="contrato"
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-input-border rounded-md text-foreground mt-1"
              >
                <option value="">Selecione um contrato</option>
                {contratos.map(c => (
                  <option key={c.id} value={c.id}>{c.numero}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="emissao">Emissão</Label>
              <Input
                id="emissao"
                type="date"
                value={emissao}
                onChange={(e) => setEmissao(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* Opções */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="valorFiscal"
                checked={valorFiscal}
                onChange={(e) => setValorFiscalMock(e.target.checked)}
              />
              <Label htmlFor="valorFiscal">Com valor fiscal</Label>
            </div>
            <div>
              <Label htmlFor="formaPreferida">Forma Preferida</Label>
              <select
                id="formaPreferida"
                value={formaPreferida}
                onChange={(e) => setFormaPreferida(e.target.value as any)}
                className="ml-2 px-3 py-1 bg-input border border-input-border rounded-md text-foreground"
              >
                <option value="Boleto">Boleto</option>
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
              </select>
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Itens da Fatura</Label>
              <Button onClick={adicionarItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {itens.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Qtde</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.descricao}
                            onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                            placeholder="Descrição do item..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(item.id, 'quantidade', parseFloat(e.target.value) || 1)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.periodo}
                            onChange={(e) => atualizarItem(item.id, 'periodo', e.target.value)}
                            placeholder="Período..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.preco}
                            onChange={(e) => atualizarItem(item.id, 'preco', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          R$ {item.subtotal.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Totais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input
                value={`R$ ${subtotal.toLocaleString('pt-BR')}`}
                readOnly
                className="mt-1 bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="acrescimos">Acréscimos (frete/ajuste)</Label>
              <Input
                id="acrescimos"
                type="number"
                step="0.01"
                value={acrescimos}
                onChange={(e) => setAcrescimos(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="descontos">Descontos</Label>
              <Input
                id="descontos"
                type="number"
                step="0.01"
                value={descontos}
                onChange={(e) => setDescontos(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Total</Label>
              <Input
                value={`R$ ${total.toLocaleString('pt-BR')}`}
                readOnly
                className="mt-1 bg-primary/10 font-bold"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações/Instruções</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Instruções de pagamento, observações gerais..."
            />
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePreviewPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Preview PDF
            </Button>
            <Button onClick={handleGerarFatura}>
              Gerar Fatura
            </Button>
            <Button onClick={handleSegundaVia} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              2ª Via
            </Button>
            <Button onClick={handleEnviarEmail} variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Enviar E-mail
            </Button>
            <Button onClick={handleEnviarWhatsApp} variant="outline">
              Enviar WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Preview Mock */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview da Fatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-8 border rounded-lg text-black">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">{APP_CONFIG.company.name}</h2>
                <p>Sistema de Gestão de Equipamentos</p>
                <hr className="my-4" />
                <h3 className="text-xl font-semibold">
                  {valorFiscal ? FATURA FISCAL : "DOCUMENTO DE COBRANÇA"}
                </h3>
              </div>

              {clienteSelecionado && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Cliente:</h4>
                  <p>{clienteSelecionado.nome || clienteSelecionado.razao_social}</p>
                  <p>{clienteSelecionado.cpf || clienteSelecionado.cnpj}</p>
                  <p>{Array.isArray(clienteSelecionado.contatos) && clienteSelecionado.contatos.length > 0 
                    ? (clienteSelecionado.contatos[0] as any)?.email || 'N/A' 
                    : 'N/A'}</p>
                </div>
              )}

              {contratoSelecionado && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Referência:</h4>
                  <p>Contrato: {contratoSelecionado.numero}</p>
                  <p>Período: {new Date(contratoSelecionado.data_inicio).toLocaleDateString('pt-BR')} a {new Date(contratoSelecionado.data_fim).toLocaleDateString('pt-BR')}</p>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Dados da Fatura:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <p>Emissão: {new Date(emissao).toLocaleDateString('pt-BR')}</p>
                  <p>Vencimento: {vencimento ? new Date(vencimento).toLocaleDateString('pt-BR') : ''}</p>
                </div>
              </div>

              {itens.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Itens:</h4>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Descrição</th>
                        <th className="border border-gray-300 p-2">Qtde</th>
                        <th className="border border-gray-300 p-2">Período</th>
                        <th className="border border-gray-300 p-2">Preço</th>
                        <th className="border border-gray-300 p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id}>
                          <td className="border border-gray-300 p-2">{item.descricao}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.quantidade}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.periodo}</td>
                          <td className="border border-gray-300 p-2 text-right">R$ {item.preco.toLocaleString('pt-BR')}</td>
                          <td className="border border-gray-300 p-2 text-right">R$ {item.subtotal.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-end">
                  <div className="w-64">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span>R$ {subtotal.toLocaleString('pt-BR')}</span>
                    </div>
                    {acrescimosNum > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Acréscimos:</span>
                        <span>R$ {acrescimosNum.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {descontosNum > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Descontos:</span>
                        <span>-R$ {descontosNum.toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between py-1 font-bold text-lg">
                      <span>Total:</span>
                      <span>R$ {total.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {formaPreferida === 'Boleto' && (
                <div className="mb-4 p-4 bg-gray-100 rounded">
                  <p className="font-semibold">Dados do Boleto:</p>
                  <p>Linha digitável: 12345.67890 12345.678901 12345.678901 1 23456789012345</p>
                  <p>Nosso número: 123456789</p>
                </div>
              )}

              {formaPreferida === 'PIX' && (
                <div className="mb-4 p-4 bg-gray-100 rounded">
                  <p className="font-semibold">PIX:</p>
                  <p>Chave PIX: pagamentos@erp-locacao.com.br</p>
                  <p>QR Code: [Código QR seria exibido aqui]</p>
                </div>
              )}

              {observacoes && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Observações:</h4>
                  <p className="whitespace-pre-wrap">{observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setShowPreview(false)} variant="outline">
                Fechar Preview
              </Button>
              <Button onClick={() => toast({ title: "Impressão", description: "Enviando para impressora." })}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}