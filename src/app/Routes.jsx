import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Flex, Spinner } from "@chakra-ui/react";
import { PrivateRoute } from "../app/middlewares/privateRoute.jsx";
import { RoleRoute } from "../app/middlewares/roleRoute.jsx";
import { RouteMemoryTracker } from "./middlewares/RouteMemoryTracker.jsx";

// ─── Login cargado de forma estática para renderizado instantáneo y sin chunks en la pantalla inicial ───
import Login from "../features/auth/pages/Login.jsx";

// ─── Lazy imports ── cada página privada descarga su propio chunk solo cuando se visita
const Register             = lazy(() => import("../features/auth/pages/Register.jsx").then(m => ({ default: m.Register })));
const ClienteBusquedaPage  = lazy(() => import("../features/clients/pages/ClienteBusquedaPage.jsx"));
const VisitLogPage         = lazy(() => import("../features/checkinout/pages/VisitLogPage.jsx"));
const ClientStatementPage  = lazy(() => import("../features/receivable/pages/ClientStatementPage.jsx").then(m => ({ default: m.ClientStatementPage })));
const ClientPage           = lazy(() => import("../features/clients/pages/ClientPage.jsx").then(m => ({ default: m.ClientPage })));
const DashboardPage        = lazy(() => import("../features/dashboard/pages/DashboardPage.jsx").then(m => ({ default: m.DashboardPage })));
const NewQuotesPage        = lazy(() => import("../features/quotes/pages/NewQuotePage.jsx").then(m => ({ default: m.NewQuotesPage })));
const SupervisorPage       = lazy(() => import("../features/supervisor/pages/SupervisorPage.jsx").then(m => ({ default: m.SupervisorPage })));
const ProductosPage        = lazy(() => import("../features/products/pages/ProductosPage.jsx").then(m => ({ default: m.ProductosPage })));
const History              = lazy(() => import("../features/dashboard/components/History.jsx").then(m => ({ default: m.History })));
const HistoryQuotesPage    = lazy(() => import("../features/quotes/pages/HistoryQuotesPage.jsx").then(m => ({ default: m.HistoryQuotesPage })));
const QuoteApprovalPage    = lazy(() => import("../features/quotes/pages/QuoteApprovalPage.jsx").then(m => ({ default: m.QuoteApprovalPage })));
const Requests             = lazy(() => import("../features/dashboard/components/Requests.jsx").then(m => ({ default: m.Requests })));
const RequestQuotePage     = lazy(() => import("../features/supervisor/pages/RequestQuotePage.jsx").then(m => ({ default: m.RequestQuotePage })));
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
const MyVisitsPage         = lazy(() => import("../features/checkinout/pages/MyVisitsPage.jsx"));
const EntradaPage          = lazy(() => import("../features/entrada/pages/EntradaPage.jsx").then(m => ({ default: m.EntradaPage })));
const AttendanceAdminPage  = lazy(() => import("../features/entrada/pages/AttendanceAdminPage.jsx").then(m => ({ default: m.AttendanceAdminPage })));
const NewClientsPage       = lazy(() => import("../features/clients/pages/NewClientsPage.jsx").then(m => ({ default: m.NewClientsPage })));
const FAQPage              = lazy(() => import("../features/help/pages/FAQPage.jsx").then(m => ({ default: m.FAQPage })));

// ─── Fallback de carga: spinner mínimo centrado con color de marca ───────────
function PageLoader() {
  return (
    <Flex w="full" minH="100dvh" align="center" justify="center" bg="gray.50">
      <Spinner size="xl" color="green.600" thickness="3px" speed="0.65s" />
    </Flex>
  );
}

const AppRoutes = () => {
  return (
    <>
      <RouteMemoryTracker />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Público */}
          <Route path="/"                      element={<Login />} />
          <Route path="/register"              element={<Register />} />
          <Route path="/s/:code"               element={<ClientStatementPage />} />
          <Route path="/estado-cuenta/:token"  element={<ClientStatementPage />} />
          <Route path="/statement/:token"      element={<ClientStatementPage />} />

          {/* Privados */}
          <Route path="/client"            element={<PrivateRoute><ClientPage /></PrivateRoute>} />
          <Route path="/dashboard"         element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/newquotes"         element={<PrivateRoute><NewQuotesPage /></PrivateRoute>} />
          <Route path="/historyquotes"     element={<PrivateRoute><HistoryQuotesPage /></PrivateRoute>} />
          <Route path="/approvals"         element={<PrivateRoute><QuoteApprovalPage /></PrivateRoute>} />
          <Route path="/products"          element={<PrivateRoute><ProductosPage /></PrivateRoute>} />
          <Route path="/history"           element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/requests"          element={<PrivateRoute><Requests /></PrivateRoute>} />
          <Route path="/detailRequests"    element={<PrivateRoute><RequestQuotePage /></PrivateRoute>} />
          <Route path="/reports"           element={<PrivateRoute><ReportPage /></PrivateRoute>} />
          <Route path="/configrules"       element={<PrivateRoute><ConfigRulesPage /></PrivateRoute>} />
          <Route path="/receivable"        element={<PrivateRoute><ReceivablePage /></PrivateRoute>} />
          <Route path="/profile"           element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/profileAdmin"      element={<PrivateRoute><ProfileAdmin /></PrivateRoute>} />
          <Route path="/notification"      element={<PrivateRoute><NotificationPage /></PrivateRoute>} />
          <Route path="/productsPriceList" element={<PrivateRoute><ProductList /></PrivateRoute>} />
          <Route path="/catalog/create"    element={<PrivateRoute><FormCatalogPage /></PrivateRoute>} />
          <Route path="/catalog/edit/:id"  element={<PrivateRoute><FormCatalogPage /></PrivateRoute>} />
          <Route path="/catalog/product/:slug" element={<PrivateRoute><ProductDetailPage /></PrivateRoute>} />
          <Route path="/catalog"           element={<PrivateRoute><CatalogPage /></PrivateRoute>} />
          <Route path="/OrdersDashboard"   element={<PrivateRoute><OrdersDashboard /></PrivateRoute>} />
          <Route path="/clienteInfo"       element={<PrivateRoute><ClienteInfo /></PrivateRoute>} />
          <Route path="/clienteBusqueda"   element={<PrivateRoute><ClienteBusquedaPage /></PrivateRoute>} />
          <Route path="/importaciones"     element={<PrivateRoute><ImportacionesPage /></PrivateRoute>} />
          <Route path="/visitLog"          element={<PrivateRoute><VisitLogPage /></PrivateRoute>} />
          <Route path="/VisitMap"          element={<PrivateRoute><VisitLogsMapView /></PrivateRoute>} />
          <Route path="/visitMap"          element={<PrivateRoute><VisitLogsMapView /></PrivateRoute>} />
          <Route path="/myVisits"          element={<PrivateRoute><MyVisitsPage /></PrivateRoute>} />
          <Route path="/newClients"        element={<PrivateRoute><NewClientsPage /></PrivateRoute>} />
          <Route path="/entrada"           element={<PrivateRoute><EntradaPage /></PrivateRoute>} />
          <Route path="/admin/attendance"  element={<PrivateRoute><AttendanceAdminPage /></PrivateRoute>} />
          <Route path="/faq"               element={<PrivateRoute><FAQPage /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </>
  );
};

export default AppRoutes;
