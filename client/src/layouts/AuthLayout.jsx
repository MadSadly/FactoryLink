import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12 font-body text-on-surface antialiased">
      <Link to="/" className="mb-8 text-center">
        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Factory-Link</h1>
        <p className="text-[10px] font-medium uppercase tracking-widest text-primary">제조 포털</p>
      </Link>
      <Outlet />
      <p className="mt-8 text-center text-xs text-on-surface-variant">
        <Link className="font-semibold text-primary hover:underline" to="/">
          포털로 돌아가기
        </Link>
      </p>
    </div>
  );
}
