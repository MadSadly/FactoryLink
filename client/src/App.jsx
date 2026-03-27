import { Link, Route, Routes } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import PartsPage from "./pages/PartsPage";
import AiContractPage from "./pages/AiContractPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";

function App() {
  const { isAuthenticated, role, logout } = useAuth();

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Factory-Link B2B Platform</h1>
      <nav className="mb-6 flex flex-wrap gap-3">
        <Link className="rounded bg-slate-800 px-3 py-2 text-white" to="/">
          부품
        </Link>
        <Link className="rounded bg-slate-800 px-3 py-2 text-white" to="/contract">
          계약
        </Link>
        <Link className="rounded bg-slate-800 px-3 py-2 text-white" to="/chat">
          채팅
        </Link>
        {!isAuthenticated && (
          <>
            <Link className="rounded bg-blue-600 px-3 py-2 text-white" to="/login">
              로그인
            </Link>
            <Link className="rounded bg-blue-600 px-3 py-2 text-white" to="/signup">
              회원가입
            </Link>
          </>
        )}
        {isAuthenticated && (
          <>
            <span className="rounded bg-slate-200 px-3 py-2 text-sm">권한: {role}</span>
            <button className="rounded bg-red-600 px-3 py-2 text-white" onClick={logout}>
              로그아웃
            </button>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<PartsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
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
      </Routes>
    </div>
  );
}

export default App;
