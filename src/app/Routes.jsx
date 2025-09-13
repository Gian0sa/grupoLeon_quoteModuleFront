import { Routes, Route } from "react-router-dom";
import { Login } from "../features/auth/pages/Login.jsx";
import { Register } from "../features/auth/pages/Register.jsx";
import { ClientPage } from "../features/clients/pages/ClientPage.jsx";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage.jsx";
import { NewQuotesPage } from "../features/quotes/pages/NewQuotePage.jsx";
import { SupervisorPage } from "../features/supervisor/pages/SupervisorPage.jsx";
import { ProductosPage } from "../features/products/pages/ProductosPage.jsx";
import { PrivateRoute } from "../app/middlewares/privateRoute.jsx";
import { RoleRoute } from "../app/middlewares/roleRoute.jsx";
import { History } from "../features/dashboard/components/History.jsx";
import { HistoryQuotesPage } from "../features/quotes/pages/HistoryQuotesPage.jsx";
import { Requests } from "../features/dashboard/components/Requests.jsx";
import { RequestQuotePage } from "../features/supervisor/pages/RequestQuotePage.jsx";
import { ReportPage } from "../features/reports/pages/ReportPage.jsx";
import { ConfigRulesPage } from "../features/reports/pages/ConfigPage.jsx";
import { ReceivablePage } from "../features/receivable/pages/ReceivablePage.jsx";
import { Profile } from "../features/auth/pages/Profile.jsx";
import { ProfileAdmin } from "../features/admin/pages/profileAdmin.jsx";
import { NotificationPage } from "../features/dashboard/pages/NotificationPage.jsx";
import { ProductList } from "../features/products/pages/ProductsPriceList.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Público */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Privados */}
      <Route
        path="/client"
        element={
          <PrivateRoute>
            <ClientPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/newquotes"
        element={
          <PrivateRoute>
            <NewQuotesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/historyquotes"
        element={
          <PrivateRoute>
            <HistoryQuotesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/products"
        element={
          <PrivateRoute>
            <ProductosPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/history"
        element={
          <PrivateRoute>
            <History />
          </PrivateRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <PrivateRoute>
            <Requests />
          </PrivateRoute>
        }
      />
      <Route
        path="/detailRequests"
        element={
          <PrivateRoute>
            <RequestQuotePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <ReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/configrules"
        element={
          <PrivateRoute>
            <ConfigRulesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/receivable"
        element={
          <PrivateRoute>
            <ReceivablePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/profileAdmin"
        element={
          <PrivateRoute>
            <ProfileAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/notification"
        element={
          <PrivateRoute>
              <NotificationPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/productsPriceList"
        element={ 
          <PrivateRoute>
              <ProductList />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
