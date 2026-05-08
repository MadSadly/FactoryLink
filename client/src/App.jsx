/**
 * 라우팅 정의. 페이지 전환 시 페이드·슬라이드 애니메이션은 PortalLayout(Outlet 래퍼)에서 처리합니다.
 */
import { Navigate, Route, Routes } from "react-router-dom";
import PortalLayout from "./layouts/PortalLayout";
import AuthLayout from "./layouts/AuthLayout";
import ChatPage from "./pages/ChatPage";
import CompanyListPage from "./pages/CompanyListPage";
import QuoteRequestPage from "./pages/QuoteRequestPage";
import ContractPage from "./pages/ContractPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import BuyerDashboard from "./pages/BuyerDashboard";
import CompaniesMapPage from "./pages/CompaniesMapPage";
import AnalysisPage from "./pages/AnalysisPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<PortalLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<BuyerDashboard />} />
        <Route path="/company-list" element={<CompanyListPage />} />
        <Route path="/parts" element={<Navigate to="/company-list" replace />} />
        <Route path="/companies" element={<CompaniesMapPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route
          path="/quote"
          element={
            <ProtectedRoute allowedRoles={["MEMBER", "ADMIN"]}>
              <QuoteRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contract/:quoteId"
          element={
            <ProtectedRoute allowedRoles={["MEMBER", "ADMIN"]}>
              <ContractPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["MEMBER", "ADMIN"]}>
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route
          path="/contract"
          element={<Navigate to="/quote" replace />}
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute allowedRoles={["MEMBER", "ADMIN"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
