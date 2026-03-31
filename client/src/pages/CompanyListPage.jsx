import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { regionKo, typeKo } from "../utils/companyLabels";

const REGION_OPTIONS = [
  { value: "", label: "전체" },
  { value: "SEOUL", label: "서울" },
  { value: "GYEONGGI", label: "경기" },
  { value: "BUSAN", label: "부산" },
  { value: "INCHEON", label: "인천" },
  { value: "DAEJEON", label: "대전" },
  { value: "GWANGJU", label: "광주" },
  { value: "GYEONGNAM", label: "경남" },
  { value: "GYEONGBUK", label: "경북" },
  { value: "OTHER", label: "기타" },
];

const TYPE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "BUYER", label: "구매사" },
  { value: "SELLER", label: "공급사" },
  { value: "BOTH", label: "구매·공급" },
];

const fieldClass =
  "rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

const PAGE_SIZE = 9;

export default function CompanyListPage() {
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get("/companies", {
        params: {
          page,
          size: PAGE_SIZE,
          region: region || undefined,
          type: type || undefined,
        },
      });
      const inner = data?.success ? data.data : data;
      setContent(Array.isArray(inner?.content) ? inner.content : []);
      setTotalPages(typeof inner?.totalPages === "number" ? inner.totalPages : 0);
      setTotalElements(typeof inner?.totalElements === "number" ? inner.totalElements : 0);
    } catch (e) {
      const serverMsg = e?.response?.data?.message;
      setError(
        typeof serverMsg === "string" && serverMsg.trim()
          ? serverMsg
          : `목록을 불러오지 못했습니다. (HTTP ${e?.response?.status ?? "오류"})`,
      );
      setContent([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, region, type]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    setPage(0);
  }, [region, type]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">업체 목록</h1>
        <p className="mt-2 text-sm font-normal text-gray-400">지역·유형별로 등록된 업체를 페이지 단위로 확인합니다.</p>
      </div>

      <section className="grid gap-4 rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          지역
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass}>
            {REGION_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
          유형
          <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end text-xs text-gray-500 sm:col-span-2 lg:col-span-1">
          <p>
            총 <span className="font-semibold text-gray-300">{totalElements}</span>건
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      {loading && <p className="text-sm text-gray-400">불러오는 중…</p>}

      {!loading && !error && (
        <>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {content.map((c) => {
              const registered = Boolean(c.businessNumber && String(c.businessNumber).trim());
              return (
                <li
                  key={c.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 shadow-sm transition hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold leading-snug text-white">{c.name}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        registered
                          ? "bg-amber-950/80 text-amber-200 ring-1 ring-amber-800"
                          : "bg-gray-800 text-gray-500 ring-1 ring-gray-700"
                      }`}
                    >
                      {registered ? "등록" : "미등록"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-orange-400/90">{typeKo(c.type)}</p>
                  <p className="mt-2 line-clamp-2 text-sm font-normal text-gray-400">{c.address || "주소 없음"}</p>
                  <p className="mt-2 text-xs font-medium text-gray-500">{regionKo(c.region)}</p>
                  {c.avgRating != null && (
                    <p className="mt-3 text-xs text-gray-400">
                      평점 {Number(c.avgRating).toFixed(1)} · 리뷰 {c.reviewCount ?? 0}건
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {content.length === 0 && (
            <p className="rounded-2xl border border-gray-800 bg-gray-900/50 py-12 text-center text-sm text-gray-500">
              조건에 맞는 업체가 없습니다.
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-2 text-sm text-gray-400">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
