import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getCompanyIdFromToken } from "../auth/token";
import Sidebar from "../components/Sidebar";

function roleLabel(role) {
  if (role === "ADMIN") return "관리자";
  if (role === "MEMBER") return "멤버";
  return role || "—";
}

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, token, logout } = useAuth();
  const [welcomeName, setWelcomeName] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setWelcomeName("");
      return;
    }
    const cid = getCompanyIdFromToken(token);
    if (cid == null) {
      setWelcomeName("");
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/companies/${cid}`)
      .then(({ data: res }) => {
        if (cancelled) return;
        const inner = res?.success ? res.data : res;
        const name = inner?.company?.name;
        setWelcomeName(typeof name === "string" && name.trim() ? name.trim() : "");
      })
      .catch(() => {
        if (!cancelled) setWelcomeName("");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const welcomeLine =
    welcomeName.length > 0 ? `${welcomeName} 공장 귀사님, 환영합니다` : "Factory-Link에 오신 것을 환영합니다";

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-gray-950 font-sans selection:bg-blue-500/30 selection:text-white">
      <Sidebar isAuthenticated={isAuthenticated} onSignOut={handleSignOut} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-950">
        <header className="shrink-0 border-b border-gray-800 bg-gray-900/95 px-6 py-4 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-bold leading-snug text-white sm:text-lg">{welcomeLine}</p>
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <span className="rounded-full border border-gray-700 bg-gray-800/80 px-3 py-1 text-xs font-semibold text-gray-300">
                  권한 · {roleLabel(role)}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-950 px-6 py-8">
          <div className="mx-auto w-full max-w-7xl">
            <div key={location.pathname} className="animate-page-enter">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
