import { btnPrimaryClass, btnSecondaryClass } from "../lib/ui";

export default function AiContractPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">AI 계약서</h1>
        <p className="mt-1 text-sm font-light text-stone-500">조건을 입력하고 초안을 생성·검토합니다.</p>
      </div>

      <div className="flex min-h-[min(640px,calc(100vh-10rem))] flex-col rounded-2xl border border-stone-200 bg-[#F4F4F5] lg:flex-row">
        <div className="w-full border-b border-stone-200/80 bg-white p-6 lg:w-[38%] lg:border-b-0 lg:border-r">
          <h2 className="text-sm font-bold text-stone-900">조건 입력</h2>
          <p className="mt-1 text-xs font-light text-stone-500">납기·수량·품질 기준을 입력하세요.</p>
          <div className="mt-6 space-y-4">
            <label className="block text-xs font-medium text-stone-600">
              프로젝트명
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-light text-stone-800 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="예: 정밀 부품 납품"
              />
            </label>
            <label className="block text-xs font-medium text-stone-600">
              희망 납기 (일)
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-light"
                placeholder="14"
              />
            </label>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className={btnPrimaryClass} disabled title="연동 후 사용">
              초안 생성
            </button>
            <button type="button" className={btnSecondaryClass} disabled title="연동 후 사용">
              검토 요청
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center overflow-y-auto p-6 lg:py-10">
          <div className="w-full max-w-2xl rounded-sm border border-stone-200 bg-white p-12 shadow-xl shadow-stone-200/50">
            <h3 className="text-center text-xl font-bold text-stone-900">공급 계약서 (초안)</h3>
            <p className="mt-2 text-center text-xs font-light text-stone-500">Factory-Link</p>
            <div className="mt-10 space-y-4 text-sm font-light text-stone-800">
              <p>
                <span className="font-medium text-stone-900">제1조 (목적)</span> 본 계약은 공급자가 구매자에게 부품을 공급함에 있어 필요한 사항을 정한다.
              </p>
              <p>
                <span className="font-medium text-stone-900">제2조 (납품)</span> 납품 장소·일정은 별도 합의서에 따른다.
              </p>
            </div>
            <div className="mt-10 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-500/10 to-rose-500/10 p-4">
              <p className="text-xs font-medium text-orange-800">팁: 납기·검수 기준·지체상금·관할을 명시하면 분쟁 시 유리합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
