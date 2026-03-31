import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, chatApiClient } from "../api/client";
import KakaoMap from "../components/KakaoMap";
import CompanyDetailModal from "../components/CompanyDetailModal";
import { useKakaoMap } from "../hooks/useKakaoMap";
import { useAuth } from "../auth/AuthContext";
import { getCompanyIdFromToken } from "../auth/token";
import { ENV } from "../utils/env";
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

const REGION_CHIPS = REGION_OPTIONS.filter((o) => o.value !== "");

const TYPE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "BUYER", label: "구매사" },
  { value: "SELLER", label: "공급사" },
  { value: "BOTH", label: "구매·공급" },
];

const fieldClass =
  "rounded-xl border border-[#3d2c21] bg-[#1c1410] px-3 py-2 text-sm font-normal text-[#f5ede6] placeholder-[#7d5544] focus:border-[#d4541a] focus:outline-none focus:ring-2 focus:ring-[#d4541a]/30";

const LIST_PAGE_SIZE = 20;

const listScrollClass =
  "fl-scroll-ember min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden rounded-xl border border-[#2e2018]/80 bg-[#110c0a]/40 py-2 pl-2 pr-1";

export default function CompaniesMapPage() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const { isLoaded: sdkLoaded, loadError: sdkLoadError } = useKakaoMap();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailParts, setDetailParts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsg, setChatMsg] = useState("");

  useEffect(() => {
    if (!selected) {
      setDrawerOpen(false);
      return;
    }
    setDrawerOpen(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerOpen(true));
    });
    return () => cancelAnimationFrame(id);
  }, [selected?.id]);

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
          const serverMsg = e?.response?.data?.message;
          const detail =
            typeof serverMsg === "string" && serverMsg.trim()
              ? serverMsg
              : `HTTP ${e?.response?.status ?? "오류"}`;
          setError(`업체 목록을 불러오지 못했습니다. (${detail})`);
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
      if (region && c.region !== region) return false;
      if (type && c.type !== type) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!String(c.name || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [companies, region, type, search]);

  // 필터 조건이 바뀌면 목록을 처음 20개부터 다시 시작
  useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [region, type, search]);

  const visibleFiltered = useMemo(() => {
    return filtered.slice(0, Math.min(visibleCount, filtered.length));
  }, [filtered, visibleCount]);

  const mapKey = filtered.map((c) => c.id).join("-");

  const closeModal = useCallback(() => {
    setSelected(null);
    setChatMsg("");
  }, []);

  const requestChat = async (targetCompany) => {
    setChatMsg("");
    if (!isAuthenticated || !token) {
      navigate("/login");
      return;
    }
    const myCid = getCompanyIdFromToken(token);
    if (myCid == null) {
      setChatMsg("소속 업체 정보가 없습니다. 다시 로그인해 주세요.");
      return;
    }
    if (Number(targetCompany.id) === Number(myCid)) {
      setChatMsg("자기 소속 업체와는 채팅할 수 없습니다.");
      return;
    }
    setChatLoading(true);
    try {
      const { data } = await chatApiClient.post("/chat/rooms", {
        buyerCompanyId: myCid,
        sellerCompanyId: targetCompany.id,
      });
      const inner = data?.success ? data.data : data;
      const rid = inner?.roomId ?? inner?.id;
      if (rid != null) {
        navigate(`/chat?room=${rid}`);
        return;
      }
      setChatMsg("채팅방을 만들지 못했습니다.");
    } catch (err) {
      const m = err?.response?.data?.message;
      setChatMsg(typeof m === "string" ? m : "채팅방 생성에 실패했습니다.");
    } finally {
      setChatLoading(false);
    }
  };

  const openDetail = useCallback(async (company) => {
    setSelected(company);
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
    [openDetail],
  );

  const hasKakaoKey = Boolean(ENV.KAKAO_MAP_KEY);

  const selectRegionChip = (val) => {
    setRegion((prev) => (prev === val ? "" : val));
  };

  return (
    <div className="flex min-h-0 flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#f5ede6]">업체 지도</h1>
        <p className="mt-2 text-sm font-normal text-[#b8907a]">지역·유형으로 업체를 찾고, 지도에서 위치를 확인하세요.</p>
      </div>

      {!hasKakaoKey && (
        <div className="rounded-2xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm font-normal text-amber-200">
          지도를 표시하려면 카카오맵 키가 필요합니다. 설정 후 새로고침하세요.
        </div>
      )}

      {hasKakaoKey && sdkLoadError && (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm font-normal text-red-200">
          <p className="font-semibold">지도 SDK를 불러오지 못했습니다</p>
          <p className="mt-1">{sdkLoadError}</p>
        </div>
      )}

      <div className="flex min-h-[min(720px,calc(100vh-11rem))] flex-1 flex-col gap-4 lg:gap-6">
        <section className="space-y-4 rounded-2xl border border-[#2e2018] bg-[#1c1410] p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[#7d5544]">
              지역
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={fieldClass}>
                {REGION_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[#7d5544]">
              유형
              <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-[#7d5544]">
            업체명 검색
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름으로 필터…"
              className={fieldClass}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {REGION_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => selectRegionChip(chip.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  region === chip.value
                    ? "border-[#d4541a] bg-gradient-to-r from-[#d4541a] to-[#e8722a] text-[#f5ede6] shadow-lg shadow-[#d4541a]/25"
                    : "border-[#3d2c21] bg-[#2a1e17] text-[#e8d5c4] hover:border-[#d4541a]/50 hover:bg-[#2a1e17]/80"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        <section className="relative w-full space-y-2">
          {!hasKakaoKey ? (
            <MapEmptyState
              title="지도를 준비 중입니다"
              description="카카오맵 키를 설정하면 이 영역에 지도가 표시됩니다."
            />
          ) : sdkLoadError ? (
            <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-2 rounded-2xl border border-red-900/50 bg-red-950/40 px-4 text-center text-sm font-normal text-red-200">
              <span className="material-symbols-outlined text-3xl text-red-400">map</span>
              <p>지도를 표시할 수 없습니다. 안내를 확인하세요.</p>
            </div>
          ) : !sdkLoaded ? (
            <MapLoadingPlaceholder />
          ) : (
            <KakaoMap
              key={mapKey}
              sdkReady
              companies={filtered}
              onMarkerClick={handleMarkerClick}
              height="560px"
              regionFocus={region}
            />
          )}
          {hasKakaoKey && sdkLoaded && !sdkLoadError && (
            <p className="text-center text-[11px] font-medium text-[#7d5544]">
              지도 위에서 스크롤로 확대·축소 · 칩(서울·경기 등)을 누르면 해당 권역으로 이동합니다
            </p>
          )}
        </section>

        <section className="flex min-h-0 flex-col gap-2 lg:min-h-[min(520px,55vh)]">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#7d5544]">
              업체 목록 ({filtered.length})
            </h2>
            {filtered.length > LIST_PAGE_SIZE && (
              <span className="text-xs font-medium text-[#7d5544]">
                표시 {Math.min(visibleCount, filtered.length)} / {filtered.length}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm font-normal text-[#b8907a]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4541a] border-t-transparent" />
              목록 불러오는 중…
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm font-normal text-amber-200">{error}</p>
          )}

          {!loading && !error && (
            <>
              <ul
                className={listScrollClass}
                style={{ maxHeight: "min(420px, 48vh)" }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
                  if (remaining < 120 && visibleCount < filtered.length) {
                    setVisibleCount((v) => Math.min(v + LIST_PAGE_SIZE, filtered.length));
                  }
                }}
              >
                {visibleFiltered.map((c) => {
                  const registered = Boolean(c.businessNumber && String(c.businessNumber).trim());
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(c)}
                        className="flex w-full gap-3 rounded-2xl border border-[#2e2018] bg-[#1c1410] p-3 text-left shadow-sm transition-all duration-300 hover:border-[#d4541a]/40 hover:bg-[#2a1e17] hover:shadow-lg hover:shadow-[#7d1a00]/30"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#3d2c21] bg-[#2a1e17] text-[#f5854a] shadow-inner">
                          <span className="material-symbols-outlined text-[26px]">factory</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-[#f5ede6]">{c.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                registered
                                  ? "bg-[#3d2a05]/60 text-[#f0c060] ring-1 ring-[#8a6a00]/80"
                                  : "bg-[#2a1e17] text-[#7d5544] ring-1 ring-[#3d2c21]"
                              }`}
                            >
                              {registered ? "사업자 등록" : "미등록"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#f5854a]/90">
                            {typeKo(c.type)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs font-normal text-[#b8907a]">{c.address || "주소 없음"}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-[#7d5544]">{regionKo(c.region)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="text-sm font-normal text-[#7d5544]">조건에 맞는 업체가 없습니다.</li>
                )}
              </ul>

              {visibleCount < filtered.length && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    className="rounded-xl border border-[#3d2c21] bg-[#2a1e17] px-4 py-2 text-sm font-semibold text-[#e8d5c4] shadow-sm transition-all hover:border-[#d4541a]/50 hover:text-[#f5ede6]"
                    onClick={() => setVisibleCount((v) => Math.min(v + LIST_PAGE_SIZE, filtered.length))}
                  >
                    더보기 (+{LIST_PAGE_SIZE})
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {selected && (
        <CompanyDetailModal
          company={selected}
          parts={detailParts}
          loading={detailLoading}
          error={detailError}
          onClose={closeModal}
          onChatRequest={requestChat}
          chatLoading={chatLoading}
          chatMessage={chatMsg}
          avgRating={selected.avgRating}
          reviewCount={selected.reviewCount}
        />
      )}
    </div>
  );
}

function MapEmptyState({ title, description }) {
  return (
    <div className="flex h-full min-h-[500px] items-center justify-center rounded-2xl border border-[#2e2018] bg-[#1c1410] p-8">
      <div className="max-w-sm rounded-2xl border border-[#2e2018] bg-[#110c0a] px-8 py-10 text-center shadow-lg shadow-black/40">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2e2018] bg-[#1c1410] text-[#f5854a]">
          <span className="material-symbols-outlined text-[32px]">map</span>
        </div>
        <h3 className="text-lg font-bold text-[#f5ede6]">{title}</h3>
        <p className="mt-2 text-sm font-normal leading-relaxed text-[#7d5544]">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[#f5b942] animate-loading-dot [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-[#f5b942] animate-loading-dot [animation-delay:200ms]" />
          <span className="h-2 w-2 rounded-full bg-[#f5b942] animate-loading-dot [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}

function MapLoadingPlaceholder() {
  return (
    <div className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-2xl border border-[#2e2018] bg-[#1c1410] p-8">
      <div className="max-w-sm rounded-2xl border border-[#2e2018] bg-[#110c0a] px-8 py-10 text-center shadow-lg shadow-black/40">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2e2018] bg-[#1c1410] text-[#f5854a]">
          <span className="material-symbols-outlined text-[32px] animate-pulse">explore</span>
        </div>
        <h3 className="text-lg font-bold text-[#f5ede6]">지도 불러오는 중</h3>
        <p className="mt-2 text-sm font-normal text-[#7d5544]">잠시만 기다려 주세요.</p>
        <div className="mt-6 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-[#f5b942] animate-loading-dot [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-[#f5b942] animate-loading-dot [animation-delay:200ms]" />
          <span className="h-2 w-2 rounded-full bg-[#f5b942] animate-loading-dot [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}
