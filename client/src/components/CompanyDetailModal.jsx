import { regionKo, typeKo } from "../utils/companyLabels";

function Stars({ value }) {
  const n = typeof value === "number" && !Number.isNaN(value) ? Math.round(value * 2) / 2 : null;
  if (n == null) return <span className="text-xs font-medium text-[#7d5544]">리뷰 없음</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#f5b942]">
      <span className="material-symbols-outlined text-[18px]">star</span>
      {n.toFixed(1)}
    </span>
  );
}

export default function CompanyDetailModal({
  company,
  parts,
  loading,
  error,
  onClose,
  onChatRequest,
  chatLoading,
  chatMessage,
  avgRating,
  reviewCount,
}) {
  if (!company) return null;

  const registered = Boolean(company.businessNumber && String(company.businessNumber).trim());
  const rating = avgRating ?? company.avgRating;
  const rCount = reviewCount ?? company.reviewCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="닫기"
      />
      <div className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#2e2018] bg-[#1c1410] shadow-2xl shadow-black/50 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#2e2018] px-5 py-4">
          <div className="min-w-0">
            <h2 id="company-detail-title" className="text-lg font-bold text-[#f5ede6]">
              {company.name}
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#f5854a]/90">{typeKo(company.type)}</p>
            <p className="mt-2 text-xs font-medium text-[#7d5544]">{regionKo(company.region)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-[#3d2c21] bg-[#2a1e17] p-2 text-[#e8d5c4] transition hover:border-[#d4541a]/50 hover:text-[#f5ede6]"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                registered
                  ? "bg-[#3d2a05]/60 text-[#f0c060] ring-1 ring-[#8a6a00]/80"
                  : "bg-[#2a1e17] text-[#7d5544] ring-1 ring-[#3d2c21]"
              }`}
            >
              {registered ? "사업자 등록" : "미등록"}
            </span>
            <Stars value={rating} />
            {typeof rCount === "number" && !Number.isNaN(rCount) && (
              <span className="text-xs font-medium text-[#7d5544]">리뷰 {rCount}건</span>
            )}
          </div>

          <p className="mt-4 text-sm font-normal leading-relaxed text-[#b8907a]">{company.address || "주소 없음"}</p>

          {(company.contactEmail || company.contactPhone) && (
            <div className="mt-4 space-y-1 rounded-xl border border-[#2e2018] bg-[#110c0a] px-3 py-2 text-xs font-normal text-[#b8907a]">
              {company.contactEmail && <p>이메일 · {company.contactEmail}</p>}
              {company.contactPhone && <p>연락처 · {company.contactPhone}</p>}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#7d5544]">등록 부품</h3>
            {loading && (
              <p className="mt-2 text-sm font-normal text-[#b8907a]">불러오는 중…</p>
            )}
            {error && !loading && (
              <p className="mt-2 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm font-normal text-amber-200">
                {error}
              </p>
            )}
            {!loading && !error && (
              <ul className="mt-3 space-y-2">
                {parts.length === 0 && (
                  <li className="text-sm font-normal text-[#7d5544]">등록된 부품이 없습니다.</li>
                )}
                {parts.map((p) => (
                  <li
                    key={p.id ?? `${p.name}-${p.category}`}
                    className="rounded-xl border border-[#2e2018] bg-[#110c0a] px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-[#f5ede6]">{p.name || "이름 없음"}</span>
                    {p.category && (
                      <span className="ml-2 text-xs font-medium text-[#7d5544]">{p.category}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {chatMessage && (
            <p className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm font-normal text-amber-200">
              {chatMessage}
            </p>
          )}
        </div>

        <div className="border-t border-[#2e2018] px-5 py-4">
          <button
            type="button"
            disabled={chatLoading}
            onClick={() => onChatRequest(company)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d4541a] to-[#e8722a] px-4 py-3 text-sm font-bold text-[#f5ede6] shadow-lg shadow-[#d4541a]/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {chatLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#f5ede6] border-t-transparent" />
                채팅 준비 중…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">chat</span>
                이 업체와 채팅
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
