import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import KakaoMap from "../components/KakaoMap";
import { useKakaoMap } from "../hooks/useKakaoMap";
import { ENV } from "../utils/env";

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
  { value: "BUYER", label: "구매사(BUYER)" },
  { value: "SELLER", label: "공급사(SELLER)" },
  { value: "BOTH", label: "구매+공급(BOTH)" },
];

function typeKo(type) {
  if (type === "BUYER") {
    return "구매사";
  }
  if (type === "SELLER") {
    return "공급사";
  }
  if (type === "BOTH") {
    return "구매+공급";
  }
  return type || "-";
}

export default function CompaniesMapPage() {
  const sdkLoaded = useKakaoMap();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailParts, setDetailParts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await apiClient.get("/companies");
        const list = data?.success ? data.data : [];
        if (!cancelled) {
          setCompanies(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError("업체 목록을 불러오지 못했습니다.");
          setCompanies([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (region && c.region !== region) {
        return false;
      }
      if (type && c.type !== type) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!String(c.name || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [companies, region, type, search]);

  const mapKey = filtered.map((c) => c.id).join("-");

  const openDetail = useCallback(async (company) => {
    setSelected(company);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailParts([]);
    try {
      const { data } = await apiClient.get(`/companies/${company.id}`);
      if (data?.success && data.data) {
        setDetailParts(Array.isArray(data.data.parts) ? data.data.parts : []);
      } else {
        setDetailError("상세 정보를 불러오지 못했습니다.");
      }
    } catch {
      setDetailError("상세 정보를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleMarkerClick = useCallback(
    (company) => {
      openDetail(company);
    },
    [openDetail]
  );

  const hasKakaoKey = Boolean(ENV.KAKAO_MAP_KEY);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">업체 지도</h1>
        <p className="mt-2 text-on-surface-variant">
          지역·유형으로 업체를 찾고, 지도에서 위치를 확인하세요.
        </p>
      </div>

      {!hasKakaoKey && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          카카오맵 API 키를 설정해주세요. <code className="font-mono">client/.env</code> 의{" "}
          <code className="font-mono">VITE_KAKAO_MAP_KEY</code>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          지역
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-on-surface dark:border-slate-700 dark:bg-slate-900"
          >
            {REGION_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          유형
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-on-surface dark:border-slate-700 dark:bg-slate-900"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          업체명 검색
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름으로 필터…"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal normal-case text-on-surface dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <section className="lg:w-[40%]">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            업체 목록 ({filtered.length})
          </h2>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              목록 불러오는 중…
            </div>
          )}
          {error && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {error}
            </p>
          )}
          {!loading && !error && (
            <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(c)}
                    className="w-full rounded-xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-on-surface">{c.name}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {typeKo(c.type)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">{c.address || "주소 없음"}</p>
                    <p className="mt-0.5 text-[10px] font-mono text-slate-400">{c.region}</p>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="text-sm text-on-surface-variant">조건에 맞는 업체가 없습니다.</li>
              )}
            </ul>
          )}
        </section>

        <section className="lg:w-[60%] lg:flex-1">
          {!hasKakaoKey ? (
            <div
              className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400"
              style={{ minHeight: 500 }}
            >
              카카오맵 키를 설정하면 지도가 표시됩니다.
            </div>
          ) : !sdkLoaded ? (
            <MapLoadingPlaceholder />
          ) : (
            <KakaoMap
              key={mapKey}
              companies={filtered}
              onMarkerClick={handleMarkerClick}
              height="560px"
            />
          )}
        </section>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="presentation"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-on-surface">{selected?.name}</h3>
                <p className="text-sm text-on-surface-variant">{selected?.address || "주소 없음"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selected?.region} · {typeKo(selected?.type)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setDrawerOpen(false)}
                aria-label="닫기"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {detailLoading && (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                상세 불러오는 중…
              </div>
            )}
            {detailError && (
              <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
            )}
            {!detailLoading && !detailError && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  등록 부품 ({detailParts.length})
                </h4>
                <ul className="space-y-2">
                  {detailParts.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{p.category}</span>
                      <div className="mt-1 text-xs text-on-surface-variant">
                        재고 {p.stockQuantity ?? p.stock_quantity ?? "-"} · ₩
                        {Number(p.unitPrice ?? p.unit_price ?? 0).toLocaleString()}
                      </div>
                    </li>
                  ))}
                  {detailParts.length === 0 && (
                    <li className="text-sm text-on-surface-variant">등록된 부품이 없습니다.</li>
                  )}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function MapLoadingPlaceholder() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40"
      style={{ minHeight: 500 }}
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-on-surface-variant">지도 불러오는 중…</p>
    </div>
  );
}
