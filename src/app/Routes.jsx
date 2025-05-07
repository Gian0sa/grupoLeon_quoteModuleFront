import { Routes, Route } from "react-router-dom";
import { Index } from "../shared/pages/Index";
import { Login } from "../features/auth/pages/login";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
};

export default AppRoutes;