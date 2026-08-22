/**
 * Relay 70 — revisao de duplicidade, INFORMATIVA.
 *
 * Este modal nunca abriu em producao ate agora: quem o acionava era o
 * `dupSearch`, que percorria um indice em localStorage jamais preenchido e
 * retornava [] em toda execucao. As 379 linhas originais — com alcada por
 * valor, justificativa obrigatoria e botao "Forcar Mesmo Assim" — nunca
 * executaram uma vez.
 *
 * Agora ele mostra o que colidiu e NAO oferece saida. A decisao vive no indice
 * unico do banco (migration 20260821170000): manter um botao de forcar seria
 * prometer o que a constraint recusa, e o usuario descobriria isso so depois
 * de escrever a justificativa.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, AlertCircle, Info, ExternalLink, FileText } from 'lucide-react';
import { DuplicityMatch, AntiDuplicityConfig } from '@/types';

interface DuplicityReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (justificativa?: string) => void;
  matches: DuplicityMatch[];
  config: AntiDuplicityConfig;
  tituloAtual: any;
}

export function DuplicityReviewModal({
  open,
  onClose,
  onConfirm,
  matches,
  config,
  tituloAtual,
}: DuplicityReviewModalProps) {
  const [justificativa, setJustificativa] = useState('');
  const [showComparison, setShowComparison] = useState<string | null>(null);

  // Separar matches por tipo
  const bloqueantes = matches.filter(m => m.tipo === 'BLOQUEANTE');
  const alertas = matches.filter(m => m.tipo === 'ALERTA');
  const informativos = matches.filter(m => m.tipo === 'INFO');

  const hasBloqueantes = bloqueantes.length > 0;
  // Justificativa so faz sentido onde ainda ha o que decidir: o alerta nao e
  // barrado pelo banco. Bloqueante nao pede justificativa porque nao ha o que
  // justificar — nao existe caminho para gravar.
  const needsJustification =
    !hasBloqueantes && alertas.length > 0 && config.politica.alertas === 'justificar';

  const getTipoIcon = (tipo: DuplicityMatch['tipo']) => {
    switch (tipo) {
      case 'BLOQUEANTE':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'ALERTA':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMotivoLabel = (motivo: string) => {
    switch (motivo) {
      case 'fiscal':
        return 'Chave Fiscal Idêntica';
      case 'exact':
        return 'Documento + Valor Idênticos';
      case 'strong':
        return 'Características Similares';
      case 'parcela':
        return 'Parcela Duplicada';
      case 'fuzzy':
        return 'Documento Parecido';
      default:
        return motivo;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleConfirm = () => {
    if (needsJustification && !justificativa.trim()) {
      return; // Não permite confirmar sem justificativa
    }
    onConfirm(justificativa || undefined);
  };

  const renderMatchesTable = (matchList: DuplicityMatch[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Loja</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Emissão</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matchList.map((match) => (
          <TableRow key={match.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getTipoIcon(match.tipo)}
                <div>
                  <Badge 
                    variant={
                      match.tipo === 'BLOQUEANTE' ? 'destructive' : 
                      match.tipo === 'ALERTA' ? 'secondary' : 
                      'outline'
                    }
                    className="text-xs"
                  >
                    {getMotivoLabel(match.motivo)}
                  </Badge>
                  {match.similarity && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {match.similarity} char(s) diferentes
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm font-medium">Fornecedor {match.fornecedorId}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {match.unidadeId}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <div>{match.docTipo}</div>
                <div className="text-muted-foreground">{match.docNumero}</div>
                {match.chaveFiscal44 && (
                  <div className="text-xs text-muted-foreground">
                    Chave: {match.chaveFiscal44.substring(0, 8)}...
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>{formatDate(match.emissao)}</TableCell>
            <TableCell className="font-mono">{formatCurrency(match.valorTotal)}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {match.status}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Simular abertura do título
                    window.open(`#/contas-pagar/titulo/${match.tituloId}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComparison(match.tituloId)}
                >
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderComparison = () => {
    if (!showComparison) return null;
    
    const matchTitulo = matches.find(m => m.tituloId === showComparison);
    if (!matchTitulo) return null;

    return (
      <div className="border rounded-lg p-4 mt-4 bg-muted/50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Comparação Side-by-Side</h4>
          <Button variant="ghost" size="sm" onClick={() => setShowComparison(null)}>
            Fechar
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-sm text-green-600 mb-2">Título Atual (Novo)</h5>
            <div className="space-y-2 text-sm">
              <div><strong>Fornecedor:</strong> {tituloAtual.fornecedorId}</div>
              <div><strong>Documento:</strong> {tituloAtual.docTipo} - {tituloAtual.docNumero}</div>
              <div><strong>Valor:</strong> {formatCurrency(tituloAtual.valorTotal)}</div>
              <div><strong>Emissão:</strong> {formatDate(tituloAtual.emissaoISO)}</div>
              <div><strong>Parcelas:</strong> {tituloAtual.qtdParcelas}</div>
              {tituloAtual.chaveFiscal44 && (
                <div><strong>Chave Fiscal:</strong> {tituloAtual.chaveFiscal44}</div>
              )}
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-sm text-orange-600 mb-2">Título Encontrado</h5>
            <div className="space-y-2 text-sm">
              <div><strong>Fornecedor:</strong> {matchTitulo.fornecedorId}</div>
              <div><strong>Documento:</strong> {matchTitulo.docTipo} - {matchTitulo.docNumero}</div>
              <div><strong>Valor:</strong> {formatCurrency(matchTitulo.valorTotal)}</div>
              <div><strong>Emissão:</strong> {formatDate(matchTitulo.emissao)}</div>
              <div><strong>Status:</strong> {matchTitulo.status}</div>
              {matchTitulo.chaveFiscal44 && (
                <div><strong>Chave Fiscal:</strong> {matchTitulo.chaveFiscal44}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Possíveis Duplicidades Detectadas
          </DialogTitle>
          <DialogDescription>
            O sistema encontrou {matches.length} título(s) com características similares.
            Revise antes de prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue={hasBloqueantes ? "bloqueantes" : alertas.length > 0 ? "alertas" : "info"}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bloqueantes" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Bloqueantes ({bloqueantes.length})
              </TabsTrigger>
              <TabsTrigger value="alertas" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Alertas ({alertas.length})
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Informativos ({informativos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bloqueantes" className="space-y-4">
              {bloqueantes.length > 0 ? (
                <>
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      {config.mensagens.bloqueante}
                    </p>
                  </div>
                  {renderMatchesTable(bloqueantes)}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma duplicidade bloqueante encontrada.
                </div>
              )}
            </TabsContent>

            <TabsContent value="alertas" className="space-y-4">
              {alertas.length > 0 ? (
                <>
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning font-medium">
                      {config.mensagens.alerta}
                    </p>
                  </div>
                  {renderMatchesTable(alertas)}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum alerta de duplicidade encontrado.
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              {informativos.length > 0 ? (
                <>
                  <div className="p-3 bg-muted/50 border border-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {config.mensagens.info}
                    </p>
                  </div>
                  {renderMatchesTable(informativos)}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma informação adicional encontrada.
                </div>
              )}
            </TabsContent>
          </Tabs>

          {renderComparison()}

          {needsJustification && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-medium">Justificativa Obrigatória</span>
              </div>
              <Textarea
                placeholder="Descreva o motivo para prosseguir mesmo com as duplicidades detectadas..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground">
                {justificativa.length}/500 caracteres
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {hasBloqueantes ? 'Voltar e corrigir' : 'Cancelar'}
          </Button>

          <div className="flex gap-2">
            {/*
              Bloqueante nao tem botao de prosseguir. O indice unico do banco
              vai recusar o insert de qualquer forma: oferecer o botao so faria
              o usuario preencher uma justificativa e receber o erro depois.
            */}
            {!hasBloqueantes && (
              <>
                {needsJustification ? (
                  <Button onClick={handleConfirm} disabled={!justificativa.trim()}>
                    Salvar com Justificativa
                  </Button>
                ) : (
                  <Button onClick={() => onConfirm()}>Prosseguir</Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}