import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, chatApiClient } from "../api/client";
import CompanyDetailModal from "../components/CompanyDetailModal";
import { useAuth } from "../auth/AuthContext";
import { getCompanyIdFromToken } from "../auth/token";
import { collaborationScore } from "../utils/collaborationScore";
import { regionKo, typeKo } from "../utils/companyLabels";

function matchTopBarClass(score) {
  if (score == null) return "bg-stone-200";
  if (score >= 85) return "bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400";
  if (score >= 70) return "bg-gradient-to-r from-orange-500 to-amber-400";
  return "bg-gradient-to-r from-amber-400 to-orange-300";
}

function MatchScoreRing({ score, uniqueId }) {
  if (score == null) return null;
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const gid = `analysis-${uniqueId}`;
  return (
    <div className="relative h-[52px] w-[52px] shrink-0">
      <svg className="h-[52px] w-[52px] -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" className="stroke-stone-100" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id={gid} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold tabular-nums text-orange-700">{score}</span>
        <span className="text-[9px] font-medium text-stone-400">%</span>
      </div>
    </div>
  );
}

const PAGE_SIZE = 12;

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const myCompanyId = token ? getCompanyIdFromToken(token) : null;

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [myCompany, setMyCompany] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailParts, setDetailParts] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsg, setChatMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let me = null;
      if (myCompanyId != null) {
        try {
          const { data: detail } = await apiClient.get(`/companies/${myCompanyId}`);
          const d = detail?.success ? detail.data : detail;
          const c = d?.company;
          me = c && c.id ? c : null;
          setMyCompany(me);
        } catch {
          setMyCompany(null);
          me = null;
        }
      } else {
        setMyCompany(null);
      }

      const { data } = await apiClient.get("/companies", {
        params: {
          page,
          size: PAGE_SIZE,
          sort: "recommend",
        },
      });
      const inner = data?.success ? data.data : data;
      const content = Array.isArray(inner?.content) ? inner.content : [];
      setTotalPages(typeof inner?.totalPages === "number" ? inner.totalPages : 0);
      setTotalElements(typeof inner?.totalElements === "number" ? inner.totalElements : 0);

      const mapped = content
        .filter((c) => myCompanyId == null || Number(c.id) !== Number(myCompanyId))
        .map((c) => {
          let score = c.recommendScore != null ? c.recommendScore : null;
          if (score == null && me && c.id !== me.id) {
            score = collaborationScore(me, c);
          }
          return { ...c, score };
        });
      setRows(mapped);
    } catch (e) {
      const serverMsg = e?.response?.data?.message;
      setError(
        typeof serverMsg === "string" && serverMsg.trim()
          ? serverMsg
          : `분석 데이터를 불러오지 못했습니다. (HTTP ${e?.response?.status ?? "오류"})`,
      );
      setRows([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, myCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const subtitle = useMemo(() => {
    if (myCompany) {
      return `${myCompany.name} 기준으로 추천 점수 순입니다. 본인 소속 공장은 목록에서 제외됩니다.`;
    }
    return "로그인하면 소속 공장 기준으로 서버의 추천 점수(가능 시 AI 임베딩 유사도)가 붙습니다. 미로그인 시에는 리뷰·통계 기반 순서입니다.";
  }, [myCompany]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-orange-400">매칭 인사이트</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">협업 분석</h1>
        <p className="mt-2 max-w-3xl text-sm font-normal leading-relaxed text-gray-400">{subtitle}</p>
        <p className="mt-3 max-w-3xl rounded-xl border border-gray-700/80 bg-gray-900/60 px-4 py-3 text-xs font-normal leading-relaxed text-gray-400">
          <span className="font-semibold text-gray-300">추천 점수 안내:</span> 로그인한 경우 Spring 서버의{" "}
          <code className="rounded bg-gray-800 px-1 text-[11px] text-orange-200">AiSimilarityService</code>가
          업체 설명·부품 텍스트를 임베딩해 유사도를 계산합니다(AI 서버 연결·키가 있을 때). 실패 시 규칙 기반
          협업 점수로 대체됩니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
        <p>
          후보 약 <span className="font-semibold text-gray-300">{totalElements}</span>건 · 페이지 {page + 1} /{" "}
          {Math.max(1, totalPages || 1)}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      {loading && <p className="text-sm text-gray-400">분석 목록을 불러오는 중…</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openDetail(row)}
                className="relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/15"
              >
                <div className={`h-1 w-full ${matchTopBarClass(row.score)}`} aria-hidden />
                <div className="flex flex-1 flex-col p-5 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 font-bold leading-snug text-stone-900">{row.name}</h2>
                    <MatchScoreRing score={row.score} uniqueId={`a-${row.id}`} />
                  </div>
                  <p className="mt-2 text-sm font-normal text-stone-600">{row.address || "주소 미등록"}</p>
                  <p className="mt-2 text-xs font-medium text-stone-500">
                    {regionKo(row.region)} · {typeKo(row.type)}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-orange-600">자세히 보기 · 1:1 채팅은 상세에서</p>
                </div>
              </button>
            ))}
            {rows.length === 0 && (
              <p className="col-span-full rounded-2xl border border-gray-800 bg-gray-900/50 py-12 text-center text-sm text-gray-500">
                표시할 업체가 없습니다.
              </p>
            )}
          </div>

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

          {!isAuthenticated && (
            <div className="rounded-2xl border border-orange-900/40 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
              <Link to="/login" className="font-semibold text-orange-300 underline-offset-2 hover:underline">
                로그인
              </Link>
              하면 소속 공장 기준 추천 점수가 더 정확해질 수 있습니다.
            </div>
          )}
        </>
      )}

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
