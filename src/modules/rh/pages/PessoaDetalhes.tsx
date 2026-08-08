import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, TrendingUp, Plus, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabasePessoas } from '../hooks/useSupabasePessoas';
import { useSupabasePessoaMovimentos } from '../hooks/useSupabasePessoaMovimentos';
import { useSupabasePessoaVinculo } from '../hooks/useSupabasePessoaVinculo';
import { OcorrenciaModal } from '../components/OcorrenciaModal';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { formatDateBR } from '@/lib/date-utils';
import { ptBR } from 'date-fns/locale';

const formatBRL = (v?: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDateSafe = (d?: string | null) =>
  d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

export default function PessoaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pessoas, isLoading: loadingPessoas } = useSupabasePessoas();
  const { movimentos, isLoading: loadingMovimentos } = useSupabasePessoaMovimentos(id);
  const { vinculos, vinculoVigente, isLoading: loadingVinculo } = useSupabasePessoaVinculo(id);
  
  const [ocorrenciaModalOpen, setOcorrenciaModalOpen] = useState(false);
  
  const pessoa = pessoas.find(p => p.id === id);

  if (loadingPessoas) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/rh/pessoas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Pessoa não encontrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/rh/pessoas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{pessoa.nome}</h1>
            <p className="text-muted-foreground">{pessoa.cargo}</p>
          </div>
        </div>
        
        <Button onClick={() => setOcorrenciaModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Gerar Ocorrência
        </Button>
      </div>

      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo">
            <User className="h-4 w-4 mr-2" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="vinculo">
            <Briefcase className="h-4 w-4 mr-2" />
            Vínculo
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            <TrendingUp className="h-4 w-4 mr-2" />
            Movimentações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{pessoa.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-medium">{pessoa.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{pessoa.telefone}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Matrícula</p>
                  <p className="font-medium">{pessoa.matricula}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admissão</p>
                  <p className="font-medium">
                    {formatDateBR(pessoa.admissaoISO, '—')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Situação</p>
                  <Badge variant={pessoa.situacao === 'ativo' ? 'default' : 'secondary'}>
                    {pessoa.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benefícios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {pessoa.beneficios.filter(b => b.ativo).length} ativos
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vinculo" className="space-y-4">
          {loadingVinculo ? (
            <Skeleton className="h-40 w-full" />
          ) : vinculoVigente ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Vínculo vigente</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-medium">{vinculoVigente.cargo?.nome ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loja</p>
                    <p className="font-medium">{vinculoVigente.loja?.nome ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-medium">{vinculoVigente.empresa?.razao_social ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salário</p>
                    <p className="font-medium">{formatBRL(vinculoVigente.salario)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Admissão</p>
                    <p className="font-medium">{formatDateSafe(vinculoVigente.data_admissao)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contrato</p>
                    <p className="font-medium capitalize">{vinculoVigente.tipo_contrato}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vinculos.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">
                          {v.cargo?.nome ?? '—'} · {v.loja?.nome ?? '—'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateSafe(v.vigencia_inicio)} → {v.vigencia_fim ? formatDateSafe(v.vigencia_fim) : 'vigente'} · {v.motivo_alteracao}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{formatBRL(v.salario)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Nenhum vínculo registrado para esta pessoa.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {pessoa.docs.length} documentos cadastrados
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMovimentos ? (
                <Skeleton className="h-32 w-full" />
              ) : movimentos && movimentos.length > 0 ? (
                <div className="space-y-2">
                  {movimentos.map((mov) => (
                    <div key={mov.id} className="p-3 border rounded">
                      <p className="font-medium">{mov.tipo}</p>
                      <p className="text-sm">{mov.descricao}</p>
                      {mov.observacao && (
                        <p className="text-sm text-muted-foreground mt-1">{mov.observacao}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(parseISO(mov.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OcorrenciaModal 
        open={ocorrenciaModalOpen}
        onOpenChange={setOcorrenciaModalOpen}
        pessoaId={pessoa.id}
        pessoaNome={pessoa.nome}
      />
    </div>
  );
}