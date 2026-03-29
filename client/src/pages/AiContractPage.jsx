import { btnPrimaryClass, btnSecondaryClass, cardClass } from "../lib/ui";

export default function AiContractPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-on-surface">AI 계약서 생성</h2>
        <p className="text-on-surface-variant">거래 조건을 바탕으로 계약서 초안을 자동 생성합니다.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className={cardClass}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface">다음 단계</h3>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Spring 백엔드에서 <code className="rounded bg-surface-container px-1.5 py-0.5 text-xs">server-ai</code> API를
              호출해 계약 본문을 생성하고, <code className="rounded bg-surface-container px-1.5 py-0.5 text-xs">CONTRACT</code>{" "}
              테이블에 저장하는 흐름으로 연결할 예정입니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className={btnPrimaryClass} disabled title="API 연동 후 사용 가능">
                초안 생성
              </button>
              <button type="button" className={btnSecondaryClass} disabled title="API 연동 후 사용 가능">
                검토 요청
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary shadow-lg shadow-primary/20">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-90">AI 팁</p>
          <p className="text-sm leading-relaxed opacity-95">
            계약서에는 납기, 품질 기준, 지체상금, 분쟁 관할을 명시하면 분쟁 시 유리합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
