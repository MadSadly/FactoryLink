import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 py-12 font-sans text-stone-900 antialiased">
      <Link to="/dashboard" className="mb-8 text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-stone-900">Factory-Link</h1>
      </Link>
      <Outlet />
      <p className="mt-8 text-center text-xs text-stone-500">
        <Link className="font-semibold text-orange-600 hover:underline" to="/dashboard">
          대시보드로 돌아가기
        </Link>
      </p>
    </div>
  );
}
