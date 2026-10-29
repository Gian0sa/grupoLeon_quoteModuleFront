import { Component, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { Flex, Spinner, Text, Button } from "@chakra-ui/react";
import { PrivateRoute } from "../app/middlewares/privateRoute.jsx";
import { RoleRoute } from "../app/middlewares/roleRoute.jsx";
import { RouteMemoryTracker } from "./middlewares/RouteMemoryTracker.jsx";

// ─── Importaciones estáticas esenciales para funcionamiento offline en campo ───
import Login from "../features/auth/pages/Login.jsx";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage.jsx";
import ClienteBusquedaPage from "../features/clients/pages/ClienteBusquedaPage.jsx";
import VisitLogPage from "../features/checkinout/pages/VisitLogPage.jsx";
const MyVisitsPage         = lazy(() => import("../features/checkinout/pages/MyVisitsPage.jsx"));

// ─── Lazy imports ── cada página privada descarga su propio chunk solo cuando se visita
const Register             = lazy(() => import("../features/auth/pages/Register.jsx").then(m => ({ default: m.Register })));
const ClientStatementPage  = lazy(() => import("../features/receivable/pages/ClientStatementPage.jsx").then(m => ({ default: m.ClientStatementPage })));
const ClientPage           = lazy(() => import("../features/clients/pages/ClientPage.jsx").then(m => ({ default: m.ClientPage })));
const NewQuotesPage        = lazy(() => import("../features/quotes/pages/NewQuotePage.jsx").then(m => ({ default: m.NewQuotesPage })));
const SupervisorPage       = lazy(() => import("../features/supervisor/pages/SupervisorPage.jsx").then(m => ({ default: m.SupervisorPage })));
const ProductosPage        = lazy(() => import("../features/products/pages/ProductosPage.jsx").then(m => ({ default: m.ProductosPage })));
const History              = lazy(() => import("../features/dashboard/components/History.jsx").then(m => ({ default: m.History })));
const HistoryQuotesPage    = lazy(() => import("../features/quotes/pages/HistoryQuotesPage.jsx").then(m => ({ default: m.HistoryQuotesPage })));
const QuoteApprovalPage    = lazy(() => import("../features/quotes/pages/QuoteApprovalPage.jsx").then(m => ({ default: m.QuoteApprovalPage })));
const ReportPage           = lazy(() => import("../features/reports/pages/ReportPage.jsx").then(m => ({ default: m.ReportPage })));
const ConfigRulesPage      = lazy(() => import("../features/reports/pages/ConfigPage.jsx").then(m => ({ default: m.ConfigRulesPage })));
const ReceivablePage       = lazy(() => import("../features/receivable/pages/ReceivablePage.jsx").then(m => ({ default: m.ReceivablePage })));
const Profile              = lazy(() => import("../features/auth/pages/Profile.jsx").then(m => ({ default: m.Profile })));
const ProfileAdmin         = lazy(() => import("../features/admin/pages/profileAdmin.jsx").then(m => ({ default: m.ProfileAdmin })));
const NotificationPage     = lazy(() => import("../features/dashboard/pages/NotificationPage.jsx").then(m => ({ default: m.NotificationPage })));
const ProductList          = lazy(() => import("../features/products/pages/ProductsPriceList.jsx").then(m => ({ default: m.ProductList })));
const FormCatalogPage      = lazy(() => import("../features/catalog/pages/FormCatalogPage.jsx").then(m => ({ default: m.FormCatalogPage })));
const CatalogPage          = lazy(() => import("../features/catalog/pages/CatalogPage.jsx"));
const ProductDetailPage    = lazy(() => import("../features/catalog/pages/ProductDetailPage.jsx"));
const OrdersDashboard      = lazy(() => import("../features/dashboard/pages/OrdersDashboard.jsx"));
const ClienteInfo          = lazy(() => import("../features/reports/pages/ClienteInfo.jsx"));
const ImportacionesPage    = lazy(() => import("../features/imports/pages/ImportacionesPage.jsx"));
const VisitLogsMapView     = lazy(() => import("../features/checkinout/pages/VisitLogsMapView.jsx"));
const EntradaPage          = lazy(() => import("../features/entrada/pages/EntradaPage.jsx").then(m => ({ default: m.EntradaPage })));
const AttendanceAdminPage  = lazy(() => import("../features/entrada/pages/AttendanceAdminPage.jsx").then(m => ({ default: m.AttendanceAdminPage })));
const NewClientsPage       = lazy(() => import("../features/clients/pages/NewClientsPage.jsx").then(m => ({ default: m.NewClientsPage })));
const FAQPage              = lazy(() => import("../features/help/pages/FAQPage.jsx").then(m => ({ default: m.FAQPage })));
const OnlineUsersPage      = lazy(() => import("../features/admin/pages/OnlineUsersPage.jsx"));

// ─── Fallback de carga: spinner mínimo centrado con color de marca ───────────
function PageLoader() {
  return (
    <Flex w="full" minH="100dvh" align="center" justify="center" bg="gray.50">
      <Spinner size="xl" color="green.600" thickness="3px" speed="0.65s" />
    </Flex>
  );
}

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error en ruta:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      const isChunkLoadError = 
        this.state.error?.name === 'ChunkLoadError' ||
        String(this.state.error?.message || '').toLowerCase().includes('failed to fetch dynamically imported module');

      return (
        <Flex direction="column" align="center" justify="center" minH="100vh" p={6} textAlign="center" bg="gray.50">
          <Text fontSize="3xl" mb={2}>⚠️</Text>
          <Text fontSize="xl" fontWeight="bold" color="emerald.900" mb={2}>
            {isChunkLoadError ? "Actualización de pantalla disponible" : "Inconveniente temporal en la pantalla"}
          </Text>
          <Text color="gray.600" mb={5} maxW="460px" fontSize="sm">
            {isChunkLoadError
              ? "Se ha publicado una nueva versión o hubo una interrupción breve de conexión. Pulsa para recargar esta misma pantalla con la versión más reciente."
              : "Ocurrió un problema temporal al cargar este módulo. Puedes reintentar para recargar la página actual sin perder tu ubicación."}
          </Text>
          <Flex gap={3} wrap="wrap" justify="center">
            <Button
              colorScheme="green"
              bg="#126C36"
              _hover={{ bg: "#0e572b" }}
              fontWeight="800"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              🔄 Reintentar / Recargar esta pantalla
            </Button>
            <Button
              variant="outline"
              colorScheme="green"
              fontWeight="700"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  const last = localStorage.getItem("lastRoute");
                  const current = window.location.pathname;
                  const target = (last && last !== current && last !== "/" && last !== "/login" && last !== "/register") ? last : "/dashboard";
                  window.location.href = target;
                }
              }}
            >
              ⬅️ Volver a la pantalla anterior
            </Button>
            <Button
              variant="ghost"
              colorScheme="gray"
              fontWeight="600"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/dashboard";
              }}
            >
              🏠 Ir al Inicio
            </Button>
          </Flex>
        </Flex>
      );
    }
    return this.props.children;
  }
}

function CotizacionesRedirect() {
  const location = useLocation();
  return <Navigate to={`/historyquotes${location.search}`} replace />;
}

function CotizacionesIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/historyquotes?search=${encodeURIComponent(id || "")}`} replace />;
}

const AppRoutes = () => {
  return (
    <>
      <RouteMemoryTracker />
      <RouteErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Público */}
            <Route path="/"                      element={<Login />} />
            <Route path="/s/:code"               element={<ClientStatementPage />} />
            <Route path="/estado-cuenta/:token"  element={<ClientStatementPage />} />
            <Route path="/statement/:token"      element={<ClientStatementPage />} />

            {/* Privados */}
            <Route path="/cotizaciones"      element={<CotizacionesRedirect />} />
            <Route path="/cotizaciones/:id"  element={<CotizacionesIdRedirect />} />
            <Route path="/client"            element={<PrivateRoute><ClientPage /></PrivateRoute>} />
            <Route path="/dashboard"         element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/newquotes"         element={<RoleRoute requiredPermission="POST:/quotes"><NewQuotesPage /></RoleRoute>} />
            <Route path="/historyquotes"     element={<RoleRoute requiredPermission="GET:/quotes"><HistoryQuotesPage /></RoleRoute>} />
            <Route path="/approvals"         element={<RoleRoute requiredPermission="POST:/quotes/approval"><QuoteApprovalPage /></RoleRoute>} />
            <Route path="/products"          element={<PrivateRoute><ProductosPage /></PrivateRoute>} />
            <Route path="/history"           element={<PrivateRoute><History /></PrivateRoute>} />
            <Route path="/reports"           element={<RoleRoute requiredPermission="GET:/reports"><ReportPage /></RoleRoute>} />
            <Route path="/configrules"       element={<RoleRoute requiredPermission="PUT:/rules/:id"><ConfigRulesPage /></RoleRoute>} />
            <Route path="/receivable"        element={<RoleRoute requiredPermission="GET:/accountsReceivable"><ReceivablePage /></RoleRoute>} />
            <Route path="/profile"           element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/profileAdmin"      element={<RoleRoute requiredPermission="PUT:/profile/admin/:userId"><ProfileAdmin /></RoleRoute>} />
            <Route path="/register"          element={<RoleRoute requiredPermission="POST:/register"><Register /></RoleRoute>} />
            <Route path="/notification"      element={<RoleRoute requiredPermission="PUT:/profile/admin/:userId"><NotificationPage /></RoleRoute>} />
            <Route path="/productsPriceList" element={<RoleRoute requiredPermission="GET:/priceList"><ProductList /></RoleRoute>} />
            <Route path="/catalog/create"    element={<RoleRoute requiredPermission="POST:/catalogProducts"><FormCatalogPage /></RoleRoute>} />
            <Route path="/catalog/edit/:id"  element={<RoleRoute requiredPermission="PUT:/catalogProducts/:id"><FormCatalogPage /></RoleRoute>} />
            <Route path="/catalog/product/:slug" element={<RoleRoute requiredPermission="GET:/catalogProducts"><ProductDetailPage /></RoleRoute>} />
            <Route path="/catalog"           element={<RoleRoute requiredPermission="GET:/catalogProducts"><CatalogPage /></RoleRoute>} />
            <Route path="/OrdersDashboard"   element={<PrivateRoute><OrdersDashboard /></PrivateRoute>} />
            <Route path="/clienteInfo"       element={<PrivateRoute><ClienteInfo /></PrivateRoute>} />
            <Route path="/clienteBusqueda"   element={<PrivateRoute><ClienteBusquedaPage /></PrivateRoute>} />
            <Route path="/importaciones"     element={<RoleRoute requiredPermission="GET:/purchaseOrdersImportacion"><ImportacionesPage /></RoleRoute>} />
            <Route path="/visitLog"          element={<RoleRoute requiredPermission="POST:/visit-logs"><VisitLogPage /></RoleRoute>} />
            <Route path="/VisitMap"          element={<RoleRoute requiredPermission="GET:/visit-logs"><VisitLogsMapView /></RoleRoute>} />
            <Route path="/visitMap"          element={<RoleRoute requiredPermission="GET:/visit-logs"><VisitLogsMapView /></RoleRoute>} />
            <Route path="/myVisits"          element={<RoleRoute requiredPermission="POST:/visit-logs"><MyVisitsPage /></RoleRoute>} />
            <Route path="/newClients"        element={<RoleRoute requiredPermission="POST:/visit-logs"><NewClientsPage /></RoleRoute>} />
            <Route path="/entrada"           element={<RoleRoute requiredPermission="POST:/attendance"><EntradaPage /></RoleRoute>} />
            <Route path="/admin/attendance"   element={<RoleRoute requiredPermission="PUT:/profile/admin/:userId"><AttendanceAdminPage /></RoleRoute>} />
            <Route path="/admin/online-users" element={<RoleRoute requiredPermission="GET:/presence/users"><OnlineUsersPage /></RoleRoute>} />
            <Route path="/faq"                element={<PrivateRoute><FAQPage /></PrivateRoute>} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </>
  );
};

export default AppRoutes;
