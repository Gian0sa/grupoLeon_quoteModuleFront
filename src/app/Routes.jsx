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

const AppRoutes = () => {
  return (
    <Routes>

      <Route path="/" element={<Login />} />

      <Route path="/register" element={
        <PrivateRoute>
          <RoleRoute roles={["ADMIN"]}>
            <Register />
          </RoleRoute>
        </PrivateRoute>
      } />
      
      <Route path="/client" element={<ClientPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/newquotes" element={<NewQuotesPage />} />
      <Route path="/historyquotes" element={< HistoryQuotesPage/>}/>
      <Route path="/products" element={<ProductosPage />} />
      <Route path="/history" element={<History />} />
      <Route path="/requests" element={ <Requests />} />
      <Route path="/detailRequests" element={<RequestQuotePage />} />
      <Route path="/reports" element={<ReportPage />} />
    </Routes> 
  );
};

export default AppRoutes;