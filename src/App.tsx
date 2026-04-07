import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth } from "./components/auth/RequireAuth";
import { DevRbacSwitcher } from "./components/dev/DevRbacSwitcher";
import { lazy, Suspense, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Clientes from "./pages/Clientes";
import Equipamentos from "./pages/Equipamentos";
import NovoEquipamento from "./pages/NovoEquipamento";
import CatalogoGruposModelos from "./pages/equipamentos/CatalogoGruposModelos";
import Contratos from "./pages/Contratos";
import NovoContratoV2 from "./pages/NovoContratoV2";
import ClienteVisao from "./pages/ClienteVisao";
import Cliente360 from "./pages/Cliente360";
import ContratoDetalhes from "./pages/ContratoDetalhes";
import ContasReceber from "./pages/ContasReceber";
import Inadimplencia from "./pages/Inadimplencia";
import GestaoContasReceber from "./pages/GestaoContasReceber";
import PagarDashboard from "./pages/PagarDashboard";
import PagarParcelas from "./pages/PagarParcelas";
import DRE from "./pages/DRE";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import { initializeMockData } from "./lib/mock-data";
import { seedVeiculosData } from "./utils/veiculos-seed";
import { seedContratosV2 } from "./lib/contratos-v2-utils";
import { seedEquipamentosData } from "./utils/equipamentos-seed";
import { GlobalSearch } from "./components/search/GlobalSearch";
import ProximoPassoSnackbar from "./components/modals/ProximoPassoSnackbar";
import { AppInitializer } from "./components/AppInitializer";

// Lazy imports para Veículos
const VeiculosLayout = lazy(() => import("./layouts/VeiculosLayout"));
const Veiculos = lazy(() => import("./pages/veiculos/Veiculos"));
const Postos = lazy(() => import("./pages/veiculos/Postos"));
const Oleos = lazy(() => import("./pages/veiculos/Oleos"));
const Oficinas = lazy(() => import("./pages/veiculos/Oficinas"));
const Servicos = lazy(() => import("./pages/veiculos/Servicos"));
const Lancamentos = lazy(() => import("./pages/veiculos/Lancamentos"));
const RelatorioEficiencia = lazy(() => import("./pages/veiculos/RelatorioEficiencia"));
const RelatorioCustos = lazy(() => import("./pages/veiculos/RelatorioCustos"));
const RelatorioDisponibilidade = lazy(() => import("./pages/veiculos/RelatorioDisponibilidade"));
const RelatorioManutencoes = lazy(() => import("./pages/veiculos/RelatorioManutencoes"));
const ConfiguracoesVeiculos = lazy(() => import("./pages/veiculos/ConfiguracoesVeiculos"));
const VeiculosCadastros = lazy(() => import("./pages/veiculos/VeiculosCadastros"));

// Lazy imports para Equipamentos
const TabelaPrecos = lazy(() => import("./pages/equipamentos/TabelaPrecos"));
const ConferenciaEstoque = lazy(() => import("./pages/equipamentos/ConferenciaEstoque"));
const AgendaDisponibilidade = lazy(() => import("./pages/equipamentos/AgendaDisponibilidade"));
const Transferencias = lazy(() => import("./pages/equipamentos/Transferencias"));
const EquipamentoDetalhes = lazy(() => import("./components/equipamentos/EquipamentoDetalhes"));
const AnalisePatrimonial = lazy(() => import("./pages/equipamentos/AnalisePatrimonial"));

// Lazy import para Contrato V1 (deprecated)
const NovoContrato = lazy(() => import("./pages/NovoContrato"));

// Lazy imports para Logística
const ItineraryPage = lazy(() => import("./pages/logistica/ItineraryPage"));
const BoardPage = lazy(() => import("./pages/logistica/BoardPage"));
const ProductivityPage = lazy(() => import("./pages/logistica/ProductivityPage"));
const SettingsPage = lazy(() => import("./pages/logistica/SettingsPage"));
const DriverTodayPage = lazy(() => import("./pages/logistica/mobile/DriverTodayPage"));

// Lazy imports para Manutenção
const ManutencaoLayout = lazy(() => import("./layouts/ManutencaoLayout"));

// Layouts para módulos com abas
const LogisticaLayout = lazy(() => import("./layouts/LogisticaLayout"));
const EquipamentosLayout = lazy(() => import("./layouts/EquipamentosLayout"));
const ContasPagarLayout = lazy(() => import("./layouts/ContasPagarLayout"));
const ContasReceberLayout = lazy(() => import("./layouts/ContasReceberLayout"));
const PainelMecanico = lazy(() => import("./modules/manutencao/pages/PainelMecanico"));
const AreaList = lazy(() => import("./modules/manutencao/pages/AreaListNew"));
const OSDetalhe = lazy(() => import("./modules/manutencao/pages/OSDetalheNew"));
const ProdutividadePage = lazy(() => import("./modules/manutencao/pages/ProdutividadePage"));
const PedidoPecasPage = lazy(() => import("./modules/manutencao/pages/PedidoPecasPage"));

// Lazy imports para RH
const RhModuleLayout = lazy(() => import("./modules/rh/layouts/RhModuleLayout").then(m => ({ default: m.RhModuleLayout })));
const RhDashboard = lazy(() => import("./modules/rh/pages/Dashboard"));
const RhPessoas = lazy(() => import("./modules/rh/pages/Pessoas"));
const RhPessoaDetalhes = lazy(() => import("./modules/rh/pages/PessoaDetalhes"));
const RhVagas = lazy(() => import("./modules/rh/pages/Vagas"));
const RhCandidatos = lazy(() => import("./modules/rh/pages/Candidatos"));
const RhAdmissoes = lazy(() => import("./modules/rh/pages/Admissoes"));
const RhPonto = lazy(() => import("./modules/rh/pages/Ponto"));
const RhBancoHoras = lazy(() => import("./modules/rh/pages/BancoHoras"));
const RhFerias = lazy(() => import("./modules/rh/pages/Ferias"));
const RhAusencias = lazy(() => import("./modules/rh/pages/Ausencias"));
const RhHolerites = lazy(() => import("./modules/rh/pages/Holerites"));
const RhBeneficios = lazy(() => import("./modules/rh/pages/Beneficios"));
const RhSSMA = lazy(() => import("./modules/rh/pages/SSMA"));
const RhDocumentos = lazy(() => import("./modules/rh/pages/Documentos"));
const RhOffboarding = lazy(() => import("./modules/rh/pages/Offboarding"));
const RhRelatorioExecutivo = lazy(() => import("./modules/rh/pages/relatorios/Executivo"));
const RhRelatorioRS = lazy(() => import("./modules/rh/pages/relatorios/RS"));
const RhRelatorioJornada = lazy(() => import("./modules/rh/pages/relatorios/Jornada"));
const RhRelatorioCompliance = lazy(() => import("./modules/rh/pages/relatorios/Compliance"));
const RhRelatorioFinanceiro = lazy(() => import("./modules/rh/pages/relatorios/Financeiro"));
const RhAprovacoes = lazy(() => import("./modules/rh/pages/Aprovacoes"));
const RhPortal = lazy(() => import("./modules/rh/pages/portal/Portal"));
const RhPortalHolerites = lazy(() => import("./modules/rh/pages/portal/Holerites"));
const RhPortalHoras = lazy(() => import("./modules/rh/pages/portal/Horas"));
const RhPortalFerias = lazy(() => import("./modules/rh/pages/portal/Ferias"));
const RhPortalSolicitacoes = lazy(() => import("./modules/rh/pages/portal/Solicitacoes"));

// Lazy imports para Compras & Estoque
const ComprasLayout = lazy(() => import("./layouts/ComprasLayout"));
const PainelUnificado = lazy(() => import("./pages/compras/PainelUnificado"));
const EstoqueUnificado = lazy(() => import("./pages/compras/EstoqueUnificado"));
const Requisicoes = lazy(() => import("./pages/compras/Requisicoes"));
const Cotacoes = lazy(() => import("./pages/compras/Cotacoes"));
const PedidosCompra = lazy(() => import("./pages/compras/PedidosCompra"));
const Recebimento = lazy(() => import("./pages/compras/Recebimento"));
const CatalogoItens = lazy(() => import("./pages/almox/CatalogoItens"));
const MovimentosAlmox = lazy(() => import("./pages/almox/MovimentosAlmox"));
const ContagemAlmox = lazy(() => import("./pages/almox/ContagemAlmox"));

// Other lazy imports
const FinanceiroTransferencias = lazy(() => import("./pages/FinanceiroTransferencias"));
const FaturamentoPage = lazy(() => import("./pages/Faturamento"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));

const queryClient = new QueryClient();

const App = () => {


  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/403" element={<Forbidden />} />

            {/* Protected routes */}
            <Route path="/" element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }>
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />

              {/* Equipamentos - Layout com abas */}
              <Route path="equipamentos/*" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <EquipamentosLayout />
                </Suspense>
              }>
                <Route index element={<Equipamentos />} />
                <Route path="lista" element={<Equipamentos />} />
                <Route path="novo" element={<NovoEquipamento />} />
                <Route path=":id/editar" element={<NovoEquipamento />} />
                <Route path="catalogo" element={<CatalogoGruposModelos />} />
                <Route path="tabela-precos" element={<TabelaPrecos />} />
                <Route path="agenda" element={<AgendaDisponibilidade />} />
                <Route path="conferencia" element={<ConferenciaEstoque />} />
                <Route path="transferencias" element={<Transferencias />} />
                <Route path="analise-patrimonial" element={<AnalisePatrimonial />} />
                <Route path=":id" element={<EquipamentoDetalhes />} />
              </Route>

              {/* Redirect old equipment routes */}
              <Route path="equipamentos/grupos" element={<Navigate to="/equipamentos/catalogo" replace />} />
              <Route path="contratos" element={<Contratos />} />
              <Route path="contratos/novo" element={<NovoContratoV2 />} />
              <Route path="contratos/novo-v2" element={<NovoContratoV2 />} />
              <Route path="contratos/novo-v1" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <NovoContrato />
                </Suspense>
              } />
              <Route path="clientes/visao/:id" element={<ClienteVisao />} />
              <Route path="clientes/360/:id" element={<Cliente360 />} />
              <Route path="contratos/:id" element={<ContratoDetalhes />} />

              {/* Contas a Receber - Layout com abas */}
              <Route path="contas-receber" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ContasReceberLayout />
                </Suspense>
              }>
                <Route index element={<ContasReceber />} />
              </Route>

              <Route path="faturamento" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ContasReceberLayout />
                </Suspense>
              }>
                <Route index element={<FaturamentoPage />} />
              </Route>

              <Route path="inadimplencia" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ContasReceberLayout />
                </Suspense>
              }>
                <Route index element={<Inadimplencia />} />
              </Route>

              <Route path="gestao/contas-receber" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ContasReceberLayout />
                </Suspense>
              }>
                <Route index element={<GestaoContasReceber />} />
              </Route>

              {/* Contas a Pagar - Layout com abas */}
              <Route path="pagar/*" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ContasPagarLayout />
                </Suspense>
              }>
                <Route index element={<Navigate to="/pagar/dashboard" replace />} />
                <Route path="dashboard" element={<PagarDashboard />} />
                <Route path="parcelas" element={<PagarParcelas />} />
                <Route path="fornecedores" element={
                  <Suspense fallback={<div>Carregando...</div>}>
                    {(() => {
                      const Fornecedores = lazy(() => import("./pages/Fornecedores"));
                      return <Fornecedores />;
                    })()}
                  </Suspense>
                } />
                <Route path="dre" element={<DRE />} />
              </Route>

              {/* Route for Transferências inside ContasPagarLayout context */}
              <Route path="financeiro/transferencias" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ContasPagarLayout />
                </Suspense>
              }>
                <Route index element={<FinanceiroTransferencias />} />
              </Route>

              {/* Admin Routes */}
              <Route path="admin/users" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <UserManagement />
                </Suspense>
              } />

              <Route path="relatorios" element={<Relatorios />} />
              <Route path="configuracoes" element={<Configuracoes />} />

              {/* Compras & Estoque */}
              <Route path="compras/*" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ComprasLayout />
                </Suspense>
              }>
                <Route index element={<Navigate to="painel" replace />} />
                <Route path="painel" element={
                  <Suspense fallback={<div className="p-6">Carregando...</div>}>
                    <PainelUnificado />
                  </Suspense>
                } />
                <Route path="requisicoes" element={<Requisicoes />} />
                <Route path="cotacoes" element={<Cotacoes />} />
                <Route path="po" element={<PedidosCompra />} />
                <Route path="recebimento" element={<Recebimento />} />
                <Route path="catalogo" element={<CatalogoItens />} />
                <Route path="estoque" element={
                  <Suspense fallback={<div className="p-6">Carregando...</div>}>
                    <EstoqueUnificado />
                  </Suspense>
                } />
                <Route path="movimentos" element={
                  <Suspense fallback={<div className="p-6">Carregando...</div>}>
                    <MovimentosAlmox />
                  </Suspense>
                } />
                <Route path="inventario" element={
                  <Suspense fallback={<div className="p-6">Carregando...</div>}>
                    <ContagemAlmox />
                  </Suspense>
                } />
              </Route>

              {/* Redirect old Almoxarifado routes */}
              <Route path="almox/painel" element={<Navigate to="/compras/painel" replace />} />
              <Route path="almox/catalogo" element={<Navigate to="/compras/catalogo" replace />} />
              <Route path="almox/saldos" element={<Navigate to="/compras/estoque" replace />} />
              <Route path="almox/movimentos" element={<Navigate to="/compras/movimentos" replace />} />
              <Route path="almox/contagem" element={<Navigate to="/compras/inventario" replace />} />

              {/* Veículos */}
              <Route path="veiculos/*" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <VeiculosLayout />
                </Suspense>
              }>
                <Route index element={<Veiculos />} />
                <Route path="cadastros" element={<VeiculosCadastros />} />
                <Route path="postos" element={<Postos />} />
                <Route path="oleos" element={<Oleos />} />
                <Route path="oficinas" element={<Oficinas />} />
                <Route path="servicos" element={<Servicos />} />
                <Route path="lancamentos" element={<Lancamentos />} />
                <Route path="relatorios/eficiencia" element={<RelatorioEficiencia />} />
                <Route path="relatorios/custos" element={<RelatorioCustos />} />
                <Route path="relatorios/disponibilidade" element={<RelatorioDisponibilidade />} />
                <Route path="relatorios/manutencoes" element={<RelatorioManutencoes />} />
                <Route path="configuracoes" element={<ConfiguracoesVeiculos />} />
              </Route>

              {/* Logística - Layout com abas */}
              <Route path="logistica/*" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <LogisticaLayout />
                </Suspense>
              }>
                <Route index element={<ItineraryPage />} />
                <Route path="itinerario" element={<ItineraryPage />} />
                <Route path="quadro" element={<BoardPage />} />
                <Route path="produtividade" element={<ProductivityPage />} />
                <Route path="config" element={<SettingsPage />} />
              </Route>

              <Route path="m/motorista" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <DriverTodayPage />
                </Suspense>
              } />

              {/* Manutenção */}
              <Route path="manutencao/*" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <ManutencaoLayout />
                </Suspense>
              }>
                <Route index element={<PainelMecanico />} />
                <Route path="area/:slug" element={<AreaList />} />
                <Route path="os/:id" element={<OSDetalhe />} />
                <Route path="solicitacoes" element={
                  <Suspense fallback={<div className="p-6">Carregando...</div>}>
                    {(() => {
                      const SolicitacoesManutencao = lazy(() => import("./pages/SolicitacoesManutencao"));
                      return <SolicitacoesManutencao />;
                    })()}
                  </Suspense>
                } />
                <Route path="produtividade" element={<ProdutividadePage />} />
                <Route path="pecas/:id" element={<PedidoPecasPage />} />
              </Route>

              {/* RH */}
              <Route path="rh" element={
                <Suspense fallback={<div className="p-6">Carregando...</div>}>
                  <RhModuleLayout />
                </Suspense>
              }>
                <Route index element={<RhDashboard />} />
                <Route path="pessoas" element={<RhPessoas />} />
                <Route path="pessoas/:id" element={<RhPessoaDetalhes />} />
                <Route path="vagas" element={<RhVagas />} />
                <Route path="candidatos" element={<RhCandidatos />} />
                <Route path="admissoes" element={<RhAdmissoes />} />
                <Route path="ponto" element={<RhPonto />} />
                <Route path="banco-horas" element={<RhBancoHoras />} />
                <Route path="ferias" element={<RhFerias />} />
                <Route path="ausencias" element={<RhAusencias />} />
                <Route path="holerites" element={<RhHolerites />} />
                <Route path="beneficios" element={<RhBeneficios />} />
                <Route path="ssma" element={<RhSSMA />} />
                <Route path="documentos" element={<RhDocumentos />} />
                <Route path="offboarding" element={<RhOffboarding />} />
                <Route path="relatorios/executivo" element={<RhRelatorioExecutivo />} />
                <Route path="relatorios/rs" element={<RhRelatorioRS />} />
                <Route path="relatorios/jornada" element={<RhRelatorioJornada />} />
                <Route path="relatorios/compliance" element={<RhRelatorioCompliance />} />
                <Route path="relatorios/financeiro" element={<RhRelatorioFinanceiro />} />
                <Route path="aprovacoes" element={<RhAprovacoes />} />
                <Route path="portal" element={<RhPortal />} />
                <Route path="portal/holerites" element={<RhPortalHolerites />} />
                <Route path="portal/horas" element={<RhPortalHoras />} />
                <Route path="portal/ferias" element={<RhPortalFerias />} />
                <Route path="portal/solicitacoes" element={<RhPortalSolicitacoes />} />
              </Route>

              {/* Catch-all routes */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Fallback for unmatched public routes */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
          <GlobalSearch open={false} onOpenChange={() => { }} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
