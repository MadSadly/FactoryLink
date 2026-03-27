export default function ForbiddenPage() {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-2 text-xl font-semibold text-red-600">접근 권한이 없습니다.</h2>
      <p className="text-sm text-slate-700">요청하신 페이지는 현재 계정 권한으로 접근할 수 없습니다.</p>
    </div>
  );
}
