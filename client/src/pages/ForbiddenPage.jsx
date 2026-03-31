import { Link } from "react-router-dom";
import { btnSecondaryClass, cardClass } from "../lib/ui";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className={`${cardClass} max-w-lg text-center`}>
        <span className="material-symbols-outlined mb-4 text-5xl text-error">gpp_bad</span>
        <h2 className="mb-2 text-2xl font-extrabold text-on-surface">접근 권한이 없습니다</h2>
        <p className="mb-6 text-sm text-on-surface-variant">
          요청하신 페이지는 현재 계정 권한으로 열 수 없습니다. 관리자에게 문의하거나 다른 계정으로 로그인하세요.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className={btnSecondaryClass}>
            대시보드로
          </Link>
          <Link to="/login" className={btnSecondaryClass}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
