import { NavLink } from "react-router-dom";
import { FileText } from "lucide-react";

const items = [
  { to: "/dashboard", label: "대시보드", icon: "dashboard" },
  { to: "/company-list", label: "업체 목록", icon: "list" },
  { to: "/companies", label: "업체 지도", icon: "map" },
  { to: "/analysis", label: "협업 분석", icon: "hub" },
  { to: "/quote", label: "견적·계약서", icon: "", lucide: FileText },
  { to: "/chat", label: "채팅", icon: "chat" },
  { to: "/profile", label: "회사 설정", icon: "settings" },
];

function linkClass({ isActive }) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-gray-800 text-white shadow-sm ring-1 ring-gray-700"
      : "text-gray-400 hover:bg-gray-800/60 hover:text-white",
  ].join(" ");
}

export default function Sidebar({ isAuthenticated, onSignOut }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-800 bg-gray-900/95 sm:h-screen sm:w-60 sm:border-b-0 sm:border-r">
      <div className="flex items-center gap-2 px-4 py-4 sm:border-b sm:border-gray-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-md">
          <span className="material-symbols-outlined text-[22px]">precision_manufacturing</span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">Factory-Link</p>
          <p className="truncate text-[11px] font-medium text-gray-500">B2B 매칭</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto px-2 py-3 sm:flex-col sm:overflow-x-visible sm:px-3 sm:py-4">
        {items.map((item) => {
          const LucideIcon = item.lucide;
          return (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === "/dashboard"}>
              {LucideIcon ? (
                <LucideIcon className="h-[20px] w-[20px] shrink-0 opacity-90" aria-hidden />
              ) : (
                <span className="material-symbols-outlined text-[20px] opacity-90">{item.icon}</span>
              )}
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 px-3 py-4">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-gray-600 hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            로그아웃
          </button>
        ) : (
          <NavLink
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-orange-500/30"
          >
            <span className="material-symbols-outlined text-[20px]">login</span>
            로그인
          </NavLink>
        )}
      </div>
    </aside>
  );
}
