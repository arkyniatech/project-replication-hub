import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils';
import { DuplicityReviewModal } from './DuplicityReviewModal';
import { dupSearch, updateDupIndex, getAntiDuplicityConfig } from '@/lib/anti-duplicity-utils';
import { DuplicityMatch } from '@/types';
import { useSupabaseFornecedores } from '@/hooks/useSupabaseFornecedores';
import { useSupabaseCategoriasN2 } from '@/hooks/useSupabaseCategoriasN2';
import { useSupabaseTitulosPagar } from '@/hooks/useSupabaseTitulosPagar';
import { useSupabaseParcelasPagar } from '@/hooks/useSupabaseParcelasPagar';
import {
  montarTituloParaInsert,
  montarParcelasParaInsert,
  type ParcelaEditavel,
} from '@/lib/contas-pagar-titulo';

interface NovoTituloDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NovoTituloDrawer({ open, onClose, onSuccess }: NovoTituloDrawerProps) {
  const { lojaAtual } = useMultiunidade();
  const { permissions, currentProfile } = usePermissions();
  const { fornecedores, isLoading: loadingFornecedores } = useSupabaseFornecedores();
  const { categorias, isLoading: loadingCategorias } = useSupabaseCategoriasN2();
  const { createTitulo } = useSupabaseTitulosPagar(lojaAtual?.id);
  const { createParcelas } = useSupabaseParcelasPagar();
  
  const [novoTitulo, setNovoTitulo] = useState({
    fornecedorId: '',
    categoriaCodigo: '',
    valorTotal: '',
    qtdParcelas: 1,
    vencimentoInicial: '',
    condicao: 'A vista',
    observacao: '',
    // Campos anti-duplicidade
    docTipo: 'NF',
    docNumero: '',
    chaveFiscal44: '',
    emissaoISO: new Date().toISOString().split('T')[0]
  });

  const [parcelas, setParcelas] = useState<ParcelaEditavel[]>([]);
  
  // Estados para anti-duplicidade
  const [duplicityMatches, setDuplicityMatches] = useState<DuplicityMatch[]>([]);
  const [showDuplicityReview, setShowDuplicityReview] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ enviarAprovacao: boolean } | null>(null);

  // Gerar parcelas automaticamente
  const gerarParcelas = () => {
    if (!novoTitulo.valorTotal || !novoTitulo.qtdParcelas || !novoTitulo.vencimentoInicial) {
      toast.error("Preencha o valor total, quantidade de parcelas e data do primeiro vencimento");
      return;
    }

    const valorTotal = parseFloat(novoTitulo.valorTotal);
    const qtd = novoTitulo.qtdParcelas;
    const dataBase = new Date(novoTitulo.vencimentoInicial);

    const valorParcela = Math.floor((valorTotal / qtd) * 100) / 100;
    const ajuste = valorTotal - (valorParcela * qtd);

    const novasParcelas = [];
    for (let i = 0; i < qtd; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataBase.getMonth() + i);
      
      const valor = i === qtd - 1 ? valorParcela + ajuste : valorParcela;
      
      novasParcelas.push({
        id: `parcela-${i + 1}`,
        numero: i + 1,
        vencimento: dataVencimento.toISOString().split('T')[0],
        valor: valor
      });
    }

    setParcelas(novasParcelas);
  };

  const checkDuplicityAndSave = (enviarAprovacao = false) => {
    // Validações básicas
    if (!novoTitulo.fornecedorId.trim()) {
      toast.error("Fornecedor é obrigatório");
      return;
    }

    if (!novoTitulo.categoriaCodigo.trim()) {
      toast.error("Categoria é obrigatória");
      return;
    }

    if (!novoTitulo.valorTotal || parseFloat(novoTitulo.valorTotal) <= 0) {
      toast.error("Valor total deve ser maior que zero");
      return;
    }

    // Preparar dados para verificação de duplicidade
    const tituloData = {
      id: `temp-${Date.now()}`, // ID temporário
      fornecedorId: novoTitulo.fornecedorId,
      docTipo: novoTitulo.docTipo,
      docNumero: novoTitulo.docNumero,
      chaveFiscal44: novoTitulo.chaveFiscal44,
      emissaoISO: novoTitulo.emissaoISO,
      valorTotal: parseFloat(novoTitulo.valorTotal),
      qtdParcelas: novoTitulo.qtdParcelas,
      categoriaN2: novoTitulo.categoriaCodigo,
      unidadeId: lojaAtual?.id || 'loja1',
      status: 'em_edicao'
    };

    // Verificar duplicidade
    const config = getAntiDuplicityConfig();
    const matches = dupSearch(tituloData, config);

    if (matches.length > 0) {
      setDuplicityMatches(matches);
      setPendingSave({ enviarAprovacao });
      setShowDuplicityReview(true);
      return;
    }

    // Se não há duplicidades, salvar diretamente
    salvarTitulo(enviarAprovacao);
  };

  /**
   * `justificativaDuplicidade` não é persistida: titulos_pagar não tem coluna
   * para ela e o índice anti-duplicidade vive em localStorage. Ver relay 61.
   */
  const salvarTitulo = async (enviarAprovacao = false, _justificativaDuplicidade?: string) => {
    if (!lojaAtual?.id) {
      toast.error("Loja não selecionada");
      return;
    }

    try {
      // Só colunas reais: valor_total/qtd_parcelas/condicao/doc_*/anexos/
      // timeline nunca existiram em titulos_pagar (relay 61).
      const tituloData = montarTituloParaInsert({
        form: novoTitulo,
        lojaId: lojaAtual.id,
        enviarAprovacao,
      });

      const tituloCriado = await createTitulo.mutateAsync(tituloData);

      // As parcelas eram só estado de tela: nada era gravado, e o título
      // nascia sem nenhuma parcela.
      const linhasParcelas = parcelas.length > 0
        ? montarParcelasParaInsert(parcelas, tituloCriado.id)
        : montarParcelasParaInsert(
            [{
              id: 'unica',
              numero: 1,
              vencimento: novoTitulo.vencimentoInicial || novoTitulo.emissaoISO,
              valor: parseFloat(novoTitulo.valorTotal) || 0,
            }],
            tituloCriado.id
          );

      await createParcelas.mutateAsync(linhasParcelas);

      toast.success(
        enviarAprovacao ? 
          "Título criado e enviado para aprovação" : 
          "Título salvo como rascunho"
      );

      // Resetar formulário
      setNovoTitulo({
        fornecedorId: '',
        categoriaCodigo: '',
        valorTotal: '',
        qtdParcelas: 1,
        vencimentoInicial: '',
        condicao: 'A vista',
        observacao: '',
        docTipo: 'NF',
        docNumero: '',
        chaveFiscal44: '',
        emissaoISO: new Date().toISOString().split('T')[0]
      });
      setParcelas([]);
      setDuplicityMatches([]);
      setPendingSave(null);
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar título:", error);
      toast.error(`Erro ao salvar título: ${error.message}`);
    }
  };

  const atualizarValorParcela = (parcelaId: string, novoValor: number) => {
    setParcelas(parcelas.map(p => 
      p.id === parcelaId ? { ...p, valor: novoValor } : p
    ));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo Título a Pagar</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Fornecedor *</Label>
                  <Select
                    value={novoTitulo.fornecedorId}
                    onValueChange={(value) => setNovoTitulo({ ...novoTitulo, fornecedorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingFornecedores ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : fornecedores.length === 0 ? (
                        <SelectItem value="empty" disabled>Nenhum fornecedor cadastrado</SelectItem>
                      ) : (
                        fornecedores.map(fornecedor => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={novoTitulo.categoriaCodigo}
                    onValueChange={(value) => setNovoTitulo({ ...novoTitulo, categoriaCodigo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCategorias ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : categorias.length === 0 ? (
                        <SelectItem value="empty" disabled>Nenhuma categoria cadastrada</SelectItem>
                      ) : (
                        categorias.map(categoria => (
                          <SelectItem key={categoria.id} value={categoria.nome}>
                            {categoria.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorTotal">Valor Total *</Label>
                  <Input
                    id="valorTotal"
                    type="number"
                    step="0.01"
                    value={novoTitulo.valorTotal}
                    onChange={(e) => setNovoTitulo({ ...novoTitulo, valorTotal: e.target.value })}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qtdParcelas">Parcelas</Label>
                  <Input
                    id="qtdParcelas"
                    type="number"
                    min="1"
                    value={novoTitulo.qtdParcelas}
                    onChange={(e) => setNovoTitulo({ ...novoTitulo, qtdParcelas: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vencimentoInicial">Primeiro Vencimento</Label>
                  <Input
                    id="vencimentoInicial"
                    type="date"
                    value={novoTitulo.vencimentoInicial}
                    onChange={(e) => setNovoTitulo({ ...novoTitulo, vencimentoInicial: e.target.value })}
                  />
                </div>
              </div>

              {/* Campos anti-duplicidade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="docTipo">Tipo de Documento</Label>
                  <Select
                    value={novoTitulo.docTipo}
                    onValueChange={(value) => setNovoTitulo({ ...novoTitulo, docTipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NF">Nota Fiscal</SelectItem>
                      <SelectItem value="NFS">Nota Fiscal de Serviço</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="docNumero">Número do Documento</Label>
                  <Input
                    id="docNumero"
                    value={novoTitulo.docNumero}
                    onChange={(e) => setNovoTitulo({ ...novoTitulo, docNumero: e.target.value })}
                    placeholder="Ex: 123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emissaoISO">Data de Emissão</Label>
                  <Input
                    id="emissaoISO"
                    type="date"
                    value={novoTitulo.emissaoISO}
                    onChange={(e) => setNovoTitulo({ ...novoTitulo, emissaoISO: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chaveFiscal44">Chave Fiscal (NF-e) - Opcional</Label>
                  <Input
                    id="chaveFiscal44"
                    value={novoTitulo.chaveFiscal44}
                    onChange={(e) => setNovoTitulo({ ...novoTitulo, chaveFiscal44: e.target.value })}
                    placeholder="44 dígitos da chave de acesso"
                    maxLength={44}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={novoTitulo.observacao}
                  onChange={(e) => setNovoTitulo({ ...novoTitulo, observacao: e.target.value })}
                  placeholder="Observações adicionais sobre o título..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Parcelas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Parcelas
                <Button
                  variant="outline"
                  size="sm"
                  onClick={gerarParcelas}
                  disabled={!novoTitulo.valorTotal || !novoTitulo.qtdParcelas}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Gerar Parcelas
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parcelas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map(parcela => (
                      <TableRow key={parcela.id}>
                        <TableCell>{parcela.numero}</TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={parcela.vencimento}
                            onChange={(e) => {
                              setParcelas(parcelas.map(p => 
                                p.id === parcela.id ? { ...p, vencimento: e.target.value } : p
                              ));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={parcela.valor}
                            onChange={(e) => atualizarValorParcela(parcela.id, parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setParcelas(parcelas.filter(p => p.id !== parcela.id));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Clique em "Gerar Parcelas" para criar as parcelas automaticamente
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => checkDuplicityAndSave(false)}
              disabled={!novoTitulo.fornecedorId || !novoTitulo.categoriaCodigo || !novoTitulo.valorTotal}
            >
              Salvar Rascunho
            </Button>
            <Button 
              onClick={() => checkDuplicityAndSave(true)}
              disabled={!novoTitulo.fornecedorId || !novoTitulo.categoriaCodigo || !novoTitulo.valorTotal}
            >
              Salvar & Enviar p/ Aprovação
            </Button>
          </div>
        </div>
      </SheetContent>
      
      {/* Modal de revisão de duplicidades */}
      <DuplicityReviewModal
        open={showDuplicityReview}
        onClose={() => {
          setShowDuplicityReview(false);
          setPendingSave(null);
          setDuplicityMatches([]);
        }}
        onConfirm={(justificativa) => {
          if (pendingSave) {
            salvarTitulo(pendingSave.enviarAprovacao, justificativa);
          }
          setShowDuplicityReview(false);
          setPendingSave(null);
          setDuplicityMatches([]);
        }}
        matches={duplicityMatches}
        config={getAntiDuplicityConfig()}
        tituloAtual={{
          fornecedorId: novoTitulo.fornecedorId,
          docTipo: novoTitulo.docTipo,
          docNumero: novoTitulo.docNumero,
          chaveFiscal44: novoTitulo.chaveFiscal44,
          emissaoISO: novoTitulo.emissaoISO,
          valorTotal: parseFloat(novoTitulo.valorTotal || '0'),
          qtdParcelas: novoTitulo.qtdParcelas,
          categoriaN2: novoTitulo.categoriaCodigo
        }}
        userProfile={currentProfile || 'financeiro'}
      />
    </Sheet>
  );
}