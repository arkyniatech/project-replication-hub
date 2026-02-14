import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

// Lazy load all pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pessoas = lazy(() => import('./pages/Pessoas'));
const PessoaDetalhes = lazy(() => import('./pages/PessoaDetalhes'));
const Vagas = lazy(() => import('./pages/Vagas'));
const Candidatos = lazy(() => import('./pages/Candidatos'));
const Admissoes = lazy(() => import('./pages/Admissoes'));
const Ponto = lazy(() => import('./pages/Ponto'));
const BancoHoras = lazy(() => import('./pages/BancoHoras'));
const Ferias = lazy(() => import('./pages/Ferias'));
const Ausencias = lazy(() => import('./pages/Ausencias'));
const Holerites = lazy(() => import('./pages/Holerites'));
const Beneficios = lazy(() => import('./pages/Beneficios'));
const SSMA = lazy(() => import('./pages/SSMA'));
const Documentos = lazy(() => import('./pages/Documentos'));
const Offboarding = lazy(() => import('./pages/Offboarding'));
const RelatorioExecutivo = lazy(() => import('./pages/relatorios/Executivo'));
const RelatorioRS = lazy(() => import('./pages/relatorios/RS'));
const RelatorioJornada = lazy(() => import('./pages/relatorios/Jornada'));
const RelatorioCompliance = lazy(() => import('./pages/relatorios/Compliance'));
const RelatorioFinanceiro = lazy(() => import('./pages/relatorios/Financeiro'));
const Aprovacoes = lazy(() => import('./pages/Aprovacoes'));
const Portal = lazy(() => import('./pages/portal/Portal'));
const PortalHolerites = lazy(() => import('./pages/portal/Holerites'));
const PortalHoras = lazy(() => import('./pages/portal/Horas'));
const PortalFerias = lazy(() => import('./pages/portal/Ferias'));
const PortalSolicitacoes = lazy(() => import('./pages/portal/Solicitacoes'));

export function getRhRoutes(): RouteObject[] {
  return [
    {
      index: true,
      element: <Dashboard />
    },
    {
      path: 'pessoas',
      element: <Pessoas />
    },
    {
      path: 'pessoas/:id',
      element: <PessoaDetalhes />
    },
    {
      path: 'vagas',
      element: <Vagas />
    },
    {
      path: 'candidatos',
      element: <Candidatos />
    },
    {
      path: 'admissoes',
      element: <Admissoes />
    },
    {
      path: 'ponto',
      element: <Ponto />
    },
    {
      path: 'banco-horas',
      element: <BancoHoras />
    },
    {
      path: 'ferias',
      element: <Ferias />
    },
    {
      path: 'ausencias',
      element: <Ausencias />
    },
    {
      path: 'holerites',
      element: <Holerites />
    },
    {
      path: 'beneficios',
      element: <Beneficios />
    },
    {
      path: 'ssma',
      element: <SSMA />
    },
    {
      path: 'documentos',
      element: <Documentos />
    },
    {
      path: 'offboarding',
      element: <Offboarding />
    },
    {
      path: 'relatorios/executivo',
      element: <RelatorioExecutivo />
    },
    {
      path: 'relatorios/rs',
      element: <RelatorioRS />
    },
    {
      path: 'relatorios/jornada',
      element: <RelatorioJornada />
    },
    {
      path: 'relatorios/compliance',
      element: <RelatorioCompliance />
    },
    {
      path: 'relatorios/financeiro',
      element: <RelatorioFinanceiro />
    },
    {
      path: 'aprovacoes',
      element: <Aprovacoes />
    },
    {
      path: 'portal',
      element: <Portal />
    },
    {
      path: 'portal/holerites',
      element: <PortalHolerites />
    },
    {
      path: 'portal/horas',
      element: <PortalHoras />
    },
    {
      path: 'portal/ferias',
      element: <PortalFerias />
    },
    {
      path: 'portal/solicitacoes',
      element: <PortalSolicitacoes />
    }
  ];
}