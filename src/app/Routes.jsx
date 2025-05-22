import { Routes, Route } from "react-router-dom";
import { Login } from "../features/auth/pages/login";
import { Register } from "../features/auth/pages/Register";
import { ClientPage } from "../features/clients/pages/ClientPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { QuotesPage } from "../features/quotes/pages/QuotesPage";
import { SupervisorPage } from "../features/supervisor/pages/SupervisorPage";
import { ProductosPage } from "../features/products/pages/ProductosPage";
import { PrivateRoute } from "../app/middlewares/privateRoute";
import { RoleRoute } from "../app/middlewares/roleRoute";
import { History } from "../features/dashboard/components/History";
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
      <Route path="/quotes" element={<QuotesPage />} />
      <Route path="/supervisor" element={<SupervisorPage />} />
      <Route path="/products" element={<ProductosPage />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
};

export default AppRoutes;