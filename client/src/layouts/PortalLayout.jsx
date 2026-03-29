import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function navLinkClass({ isActive }) {
  const base =
    "flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition-transform duration-200 hover:translate-x-1 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800";
  const active =
    "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-400";
  return `${base} ${isActive ? active : ""}`;
}

export default function PortalLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, role, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-surface font-body text-on-surface antialiased">
      <aside className="flat-ledger-style fixed left-0 top-0 z-40 flex h-screen w-64 flex-col gap-2 bg-slate-100 p-4 dark:bg-slate-900">
        <div className="mb-4 px-4 py-6">
          <NavLink to="/" className="block">
            <h1 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Factory-Link
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">
              제조 포털
            </p>
          </NavLink>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/dashboard" className={navLinkClass}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">대시보드</span>
          </NavLink>
          <NavLink to="/" end className={navLinkClass}>
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">부품</span>
          </NavLink>
          <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-slate-400 opacity-60 dark:text-slate-500">
            <span className="material-symbols-outlined">description</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">견적 요청</span>
          </span>
          <NavLink to="/contract" className={navLinkClass}>
            <span className="material-symbols-outlined">edit_document</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">계약</span>
          </NavLink>
          <NavLink to="/chat" className={navLinkClass}>
            <span className="material-symbols-outlined">chat</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">채팅</span>
          </NavLink>
          <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-slate-400 opacity-60 dark:text-slate-500">
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">주문</span>
          </span>
          <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-slate-400 opacity-60 dark:text-slate-500">
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">물류</span>
          </span>
          <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-slate-400 opacity-60 dark:text-slate-500">
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-sans text-sm font-medium uppercase tracking-wide">보고서</span>
          </span>
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-slate-200 pt-6 dark:border-slate-800">
          <button
            type="button"
            className="mb-2 w-full rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95"
          >
            새 견적 요청 작성
          </button>

          {!isAuthenticated && (
            <>
              <NavLink
                to="/login"
                className="flex items-center gap-3 rounded-xl px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span className="font-sans text-xs font-medium uppercase tracking-wide">로그인</span>
              </NavLink>
              <NavLink
                to="/signup"
                className="flex items-center gap-3 rounded-xl px-4 py-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span className="font-sans text-xs font-medium uppercase tracking-wide">회원가입</span>
              </NavLink>
            </>
          )}

          <a
            className="flex items-center gap-3 px-4 py-2 text-slate-500 transition-colors hover:text-blue-600"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <span className="material-symbols-outlined">help_outline</span>
            <span className="font-sans text-xs font-medium uppercase tracking-wide">도움말</span>
          </a>

          {isAuthenticated && (
            <div className="px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">권한</p>
              <p className="text-sm font-semibold text-on-surface">{role}</p>
            </div>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-slate-500 transition-colors hover:text-red-600"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-sans text-xs font-medium uppercase tracking-wide">로그아웃</span>
            </button>
          )}
        </div>
      </aside>

      <main className="ml-64 flex min-h-screen flex-1 flex-col">
        <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant/10 bg-slate-50/80 px-8 shadow-sm backdrop-blur-xl dark:bg-slate-950/80 dark:shadow-none">
          <div className="flex items-center gap-8">
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                search
              </span>
              <input
                className="w-full rounded-lg border-none bg-slate-100/50 py-1.5 pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                placeholder="부품 또는 견적 검색…"
                type="search"
                readOnly
                title="추후 검색 연동 예정"
              />
            </div>
            <nav className="hidden items-center gap-6 lg:flex">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? "border-b-2 border-blue-600 pb-1 text-blue-700 dark:text-blue-400" : "text-slate-500 hover:text-blue-600 dark:text-slate-400"}`
                }
              >
                마켓플레이스
              </NavLink>
              <span className="cursor-not-allowed text-sm font-medium text-slate-400">분석</span>
              <span className="cursor-not-allowed text-sm font-medium text-slate-400">재고</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-blue-50/50 active:scale-95"
              title="알림 (준비 중)"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-blue-50/50 active:scale-95"
              title="설정 (준비 중)"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="ml-2 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-primary-fixed bg-surface-container text-xs font-bold text-primary">
              {isAuthenticated ? role?.charAt(0) ?? "U" : "?"}
            </div>
          </div>
        </header>

        <div className="mt-16 flex-1 p-8 lg:p-12">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
