import { Route, Routes } from "react-router-dom";
import PortalLayout from "./layouts/PortalLayout";
import AuthLayout from "./layouts/AuthLayout";
import ChatPage from "./pages/ChatPage";
import PartsPage from "./pages/PartsPage";
import AiContractPage from "./pages/AiContractPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import BuyerDashboard from "./pages/BuyerDashboard";
import CompaniesMapPage from "./pages/CompaniesMapPage";
import ConnectionTest from "./pages/ConnectionTest";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<PortalLayout />}>
        <Route path="/dashboard" element={<BuyerDashboard />} />
        <Route path="/companies" element={<CompaniesMapPage />} />
        <Route path="/dev/connection-test" element={<ConnectionTest />} />
        <Route path="/" element={<PartsPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route
          path="/contract"
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN"]}>
              <AiContractPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
