import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Plus, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Link as LinkIcon,
  Unlink,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useFinanceiroStore } from '@/stores/financeiroStore';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import type { Conciliacao, ExtratoLinha, Lancamento } from '@/types/financeiro';

interface ImportedRow {
  data: string;
  historico: string;
  valor: number;
  tipo: 'C' | 'D';
  doc?: string;
  saldo?: number;
}

export function ConciliacaoTab() {
  const { lojaAtual } = useMultiunidade();
  const { 
    getContasByLoja,
    getLancamentosByConta,
    createConciliacao,
    addExtratoLinhas,
    createMatch,
    removeMatch,
    fecharConciliacao,
    getConciliacaoById,
    getExtratoByConc,
    getMatchesByConc
  } = useFinanceiroStore();

  const [selectedConta, setSelectedConta] = useState('');
  const [periodo, setPeriodo] = useState({
    ini: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    fim: format(new Date(), 'yyyy-MM-dd')
  });
  const [saldoInicialExtrato, setSaldoInicialExtrato] = useState('');
  const [saldoFinalExtrato, setSaldoFinalExtrato] = useState('');
  const [currentConciliacao, setCurrentConciliacao] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<ImportedRow[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);

  const lojaId = lojaAtual?.id || '1';
  const contas = getContasByLoja(lojaId);

  const conciliacao = currentConciliacao ? getConciliacaoById(currentConciliacao) : null;
  const extratoLinhas = currentConciliacao ? getExtratoByConc(currentConciliacao) : [];
  const matches = currentConciliacao ? getMatchesByConc(currentConciliacao) : [];

  const lancamentos = selectedConta && conciliacao ? 
    getLancamentosByConta(selectedConta, conciliacao.periodo) : [];

  const iniciarConciliacao = () => {
    if (!selectedConta || !saldoInicialExtrato || !saldoFinalExtrato) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const conciliacaoId = createConciliacao({
      lojaId,
      contaId: selectedConta,
      periodo,
      saldoInicialExtrato: parseFloat(saldoInicialExtrato),
      saldoFinalExtrato: parseFloat(saldoFinalExtrato),
      status: 'ABERTA',
      criadoPor: 'sistema' // Mock user
    });

    setCurrentConciliacao(conciliacaoId);
    toast.success('Sessão de conciliação iniciada!');
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        // Assumir que a primeira linha são os cabeçalhos
        const headers = lines[0].split(';');
        const dataRows = lines.slice(1);

        const parsed: ImportedRow[] = dataRows.map(line => {
          const columns = line.split(';');
          
          // Mapeamento flexível - assumir ordem comum
          return {
            data: columns[0] || '',
            historico: columns[1] || '',
            valor: parseFloat(columns[2]?.replace(',', '.')) || 0,
            tipo: (columns[3]?.toUpperCase() === 'D' ? 'D' : 'C') as 'C' | 'D',
            doc: columns[4] || undefined,
            saldo: columns[5] ? parseFloat(columns[5].replace(',', '.')) : undefined
          };
        }).filter(row => row.data && row.valor !== 0);

        setImportedData(parsed);
        setShowImportPreview(true);
      } catch (error) {
        toast.error('Erro ao processar arquivo CSV');
      }
    };
    reader.readAsText(file);
  };

  const confirmarImport = () => {
    if (!currentConciliacao) return;

    addExtratoLinhas(currentConciliacao, importedData.map(row => ({
      data: row.data,
      historico: row.historico,
      valor: row.valor,
      tipo: row.tipo,
      doc: row.doc,
      saldo: row.saldo
    })));

    // Auto-matching básico
    setTimeout(() => {
      executarAutoMatch();
    }, 100);

    setShowImportPreview(false);
    setImportedData([]);
    toast.success(`${importedData.length} linhas importadas com sucesso!`);
  };

  const executarAutoMatch = () => {
    if (!currentConciliacao) return;

    let matchCount = 0;

    // Regra 1: Mesmo valor e doc quando existir
    extratoLinhas.forEach(extrato => {
      if (extrato.pareado) return;

      const lancamentoMatch = lancamentos.find(lanc => 
        !matches.some(m => m.lancamentoId === lanc.id) &&
        Math.abs(lanc.valor - Math.abs(extrato.valor)) < 0.01 &&
        extrato.doc && 
        (lanc.refId?.includes(extrato.doc) || lanc.descricao?.includes(extrato.doc))
      );

      if (lancamentoMatch) {
        createMatch({
          conciliacaoId: currentConciliacao,
          extratoId: extrato.id,
          lancamentoId: lancamentoMatch.id,
          modo: 'AUTO'
        });
        matchCount++;
      }
    });

    // Regra 2: Mesmo valor em ±3 dias
    extratoLinhas.forEach(extrato => {
      if (extrato.pareado) return;

      const dataExtrato = new Date(extrato.data);
      const lancamentoMatch = lancamentos.find(lanc => {
        if (matches.some(m => m.lancamentoId === lanc.id)) return false;
        
        const dataLanc = new Date(lanc.data);
        const diffDays = Math.abs(dataExtrato.getTime() - dataLanc.getTime()) / (1000 * 60 * 60 * 24);
        
        return Math.abs(lanc.valor - Math.abs(extrato.valor)) < 0.01 && diffDays <= 3;
      });

      if (lancamentoMatch) {
        createMatch({
          conciliacaoId: currentConciliacao,
          extratoId: extrato.id,
          lancamentoId: lancamentoMatch.id,
          modo: 'AUTO'
        });
        matchCount++;
      }
    });

    if (matchCount > 0) {
      toast.success(`${matchCount} itens pareados automaticamente!`);
    }
  };

  const parearManual = (extratoId: string, lancamentoId: string) => {
    if (!currentConciliacao) return;

    createMatch({
      conciliacaoId: currentConciliacao,
      extratoId,
      lancamentoId,
      modo: 'MANUAL'
    });

    toast.success('Pareamento manual criado!');
  };

  const desparear = (matchId: string) => {
    removeMatch(matchId);
    toast.success('Pareamento removido!');
  };

  const criarAjuste = (valor: number, descricao: string) => {
    // Implementar lógica de ajuste (criar lançamento interno)
    toast.success('Ajuste criado!');
  };

  const concluirConciliacao = () => {
    if (!conciliacao) return;

    const totalCreditos = extratoLinhas
      .filter(e => e.tipo === 'C')
      .reduce((sum, e) => sum + e.valor, 0);
    
    const totalDebitos = extratoLinhas
      .filter(e => e.tipo === 'D')
      .reduce((sum, e) => sum + e.valor, 0);

    const saldoCalculado = conciliacao.saldoInicialExtrato + totalCreditos - totalDebitos;
    const diferenca = Math.abs(saldoCalculado - conciliacao.saldoFinalExtrato);

    if (diferenca > 0.01) {
      toast.error(`Diferença de R$ ${diferenca.toFixed(2)} impede o fechamento`);
      return;
    }

    const naoParados = extratoLinhas.filter(e => !e.pareado).length;
    if (naoParados > 0) {
      toast.error(`${naoParados} itens ainda não foram pareados`);
      return;
    }

    fecharConciliacao(currentConciliacao!);
    toast.success('Conciliação fechada com sucesso!');
  };

  const resetarSessao = () => {
    setCurrentConciliacao(null);
    setSaldoInicialExtrato('');
    setSaldoFinalExtrato('');
  };

  // Cálculos do resumo
  const resumo = useMemo(() => {
    if (!conciliacao) return null;

    const creditos = extratoLinhas.filter(e => e.tipo === 'C').reduce((sum, e) => sum + e.valor, 0);
    const debitos = extratoLinhas.filter(e => e.tipo === 'D').reduce((sum, e) => sum + e.valor, 0);
    const saldoCalculado = conciliacao.saldoInicialExtrato + creditos - debitos;
    const diferenca = saldoCalculado - conciliacao.saldoFinalExtrato;
    
    const totalLancamentos = lancamentos.length;
    const lancamentosParados = matches.length;
    const extratoParado = extratoLinhas.filter(e => e.pareado).length;

    return {
      saldoInicialExtrato: conciliacao.saldoInicialExtrato,
      creditos,
      debitos,
      saldoFinalExtrato: conciliacao.saldoFinalExtrato,
      saldoCalculado,
      diferenca,
      totalLancamentos,
      lancamentosParados,
      extratoParado,
      extratoTotal: extratoLinhas.length
    };
  }, [conciliacao, extratoLinhas, lancamentos, matches]);

  if (!conciliacao) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nova Sessão de Conciliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conta">Conta para Conciliar *</Label>
                <Select value={selectedConta} onValueChange={setSelectedConta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome} ({conta.banco})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="periodo-ini">Data Inicial *</Label>
                  <Input
                    id="periodo-ini"
                    type="date"
                    value={periodo.ini}
                    onChange={(e) => setPeriodo(prev => ({ ...prev, ini: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="periodo-fim">Data Final *</Label>
                  <Input
                    id="periodo-fim"
                    type="date"
                    value={periodo.fim}
                    onChange={(e) => setPeriodo(prev => ({ ...prev, fim: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="saldo-inicial">Saldo Inicial do Extrato *</Label>
                <Input
                  id="saldo-inicial"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={saldoInicialExtrato}
                  onChange={(e) => setSaldoInicialExtrato(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="saldo-final">Saldo Final do Extrato *</Label>
                <Input
                  id="saldo-final"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={saldoFinalExtrato}
                  onChange={(e) => setSaldoFinalExtrato(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={iniciarConciliacao} className="w-full">
              Iniciar Conciliação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo da Conciliação */}
      {resumo && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resumo da Conciliação</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetarSessao}>
                Nova Sessão
              </Button>
              {conciliacao.status === 'ABERTA' && (
                <Button 
                  onClick={concluirConciliacao}
                  disabled={Math.abs(resumo.diferenca) > 0.01}
                >
                  Fechar Conciliação
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Saldo Inicial Extrato:</span>
                <p className="font-mono font-semibold">
                  R$ {resumo.saldoInicialExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Créditos:</span>
                <p className="font-mono font-semibold text-green-600">
                  + R$ {resumo.creditos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Débitos:</span>
                <p className="font-mono font-semibold text-red-600">
                  - R$ {resumo.debitos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo Final Calculado:</span>
                <p className="font-mono font-semibold">
                  R$ {resumo.saldoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo Final Extrato:</span>
                <p className="font-mono font-semibold">
                  R$ {resumo.saldoFinalExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Diferença:</span>
                <p className={`font-mono font-semibold ${Math.abs(resumo.diferenca) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {resumo.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Extrato Pareado:</span>
                <p className="font-semibold">
                  {resumo.extratoParado} / {resumo.extratoTotal}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Lançamentos Internos:</span>
                <p className="font-semibold">
                  {resumo.lancamentosParados} / {resumo.totalLancamentos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importar Extrato */}
      {conciliacao.status === 'ABERTA' && extratoLinhas.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Extrato Bancário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-file">Arquivo CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato esperado: Data;Histórico;Valor;Tipo(C/D);Doc;Saldo
                </p>
              </div>

              {showImportPreview && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Preview da Importação ({importedData.length} linhas)</h4>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowImportPreview(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={confirmarImport}>
                        Confirmar Importação
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">Data</th>
                          <th className="text-left p-1">Histórico</th>
                          <th className="text-right p-1">Valor</th>
                          <th className="text-center p-1">Tipo</th>
                          <th className="text-left p-1">Doc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedData.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-1">{row.data}</td>
                            <td className="p-1 max-w-32 truncate">{row.historico}</td>
                            <td className="p-1 text-right font-mono">
                              R$ {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-1 text-center">
                              <Badge variant={row.tipo === 'C' ? 'default' : 'secondary'}>
                                {row.tipo}
                              </Badge>
                            </td>
                            <td className="p-1">{row.doc || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importedData.length > 10 && (
                      <p className="text-center text-muted-foreground mt-2">
                        ... e mais {importedData.length - 10} linhas
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workspace de Conciliação */}
      {extratoLinhas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Extrato Bancário */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Extrato Bancário ({extratoLinhas.length})</CardTitle>
              <Button size="sm" onClick={executarAutoMatch}>
                Auto-Match
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {extratoLinhas.map((linha) => (
                  <div 
                    key={linha.id}
                    className={`p-3 border rounded-lg ${linha.pareado ? 'bg-green-50 border-green-200' : 'bg-background'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{linha.data}</span>
                          <Badge variant={linha.tipo === 'C' ? 'default' : 'secondary'}>
                            {linha.tipo}
                          </Badge>
                          {linha.pareado && <CheckCircle className="w-4 h-4 text-green-600" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{linha.historico}</p>
                        {linha.doc && (
                          <p className="text-xs text-muted-foreground">Doc: {linha.doc}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-semibold ${linha.tipo === 'C' ? 'text-green-600' : 'text-red-600'}`}>
                          {linha.tipo === 'C' ? '+' : '-'} R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lançamentos Internos */}
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos Internos ({lancamentos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lancamentos.map((lancamento) => {
                  const match = matches.find(m => m.lancamentoId === lancamento.id);
                  const pareado = !!match;
                  
                  return (
                    <div 
                      key={lancamento.id}
                      className={`p-3 border rounded-lg ${pareado ? 'bg-blue-50 border-blue-200' : 'bg-background'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{lancamento.data}</span>
                            <Badge variant={lancamento.tipo === 'CREDITO' ? 'default' : 'secondary'}>
                              {lancamento.tipo}
                            </Badge>
                            {pareado && <LinkIcon className="w-4 h-4 text-blue-600" />}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {lancamento.descricao || lancamento.origem}
                          </p>
                          {lancamento.refId && (
                            <p className="text-xs text-muted-foreground">Ref: {lancamento.refId}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-semibold ${lancamento.tipo === 'CREDITO' ? 'text-green-600' : 'text-red-600'}`}>
                            {lancamento.tipo === 'CREDITO' ? '+' : '-'} R$ {lancamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {match && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => desparear(match.id)}
                              className="mt-1"
                            >
                              <Unlink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}