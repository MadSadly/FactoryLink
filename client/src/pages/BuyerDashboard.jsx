import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
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
  const gid = `sunset-${uniqueId}`;
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

export default function BuyerDashboard() {
  const { token, isAuthenticated } = useAuth();
  const myCompanyId = token ? getCompanyIdFromToken(token) : null;

  const [list, setList] = useState([]);
  const [myCompany, setMyCompany] = useState(null);
  const [aiRecommended, setAiRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let listData = [];
    try {
      const { data } = await apiClient.get("/companies");
      const raw = data?.success ? data.data : data;
      listData = Array.isArray(raw) ? raw : [];
    } catch {
      listData = [];
    }
    setList(listData);

    if (myCompanyId != null) {
      try {
        const { data: recData } = await apiClient.get("/companies", {
          params: { page: 0, size: 6, sort: "recommend" },
        });
        const inner = recData?.success ? recData.data : recData;
        const content = inner?.content ?? [];
        setAiRecommended(
          content.map((c) => ({
            ...c,
            score: c.recommendScore != null ? c.recommendScore : null,
          })),
        );
      } catch {
        setAiRecommended([]);
      }
      try {
        const { data: detail } = await apiClient.get(`/companies/${myCompanyId}`);
        const d = detail?.success ? detail.data : detail;
        const c = d?.company;
        setMyCompany(c && c.id ? c : null);
      } catch {
        setMyCompany(null);
      }
    } else {
      setMyCompany(null);
      setAiRecommended([]);
    }
    setLoading(false);
  }, [myCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const recommended = useMemo(() => {
    if (myCompany && aiRecommended.length > 0) {
      return aiRecommended
        .filter((c) => c.id != null && Number(c.id) !== Number(myCompany.id))
        .slice(0, 6);
    }
    if (!myCompany) {
      return list.slice(0, 6).map((c) => ({ ...c, score: null }));
    }
    return list
      .filter((c) => c.id !== myCompany.id)
      .map((c) => ({ ...c, score: collaborationScore(myCompany, c) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [list, myCompany, aiRecommended]);

  const statRegistered = list.length;
  const statRecommend = recommended.length;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-semibold text-orange-400">오늘의 요약</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">대시보드</h1>
        <p className="mt-2 max-w-xl text-sm font-normal leading-relaxed text-gray-400">
          협업 추천과 지표를 한눈에 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "등록 공장", value: loading ? "…" : String(statRegistered), sub: "플랫폼 연동" },
          { label: "추천 후보", value: loading ? "…" : String(statRecommend), sub: "매칭 풀" },
          { label: "진행 협의", value: "—", sub: "견적·계약 단계" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-orange-200/80 hover:shadow-lg hover:shadow-orange-500/15"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{s.label}</p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-stone-900">{s.value}</p>
            <p className="mt-1 text-xs font-normal text-stone-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "진행 협의", value: "—", sub: "견적·계약", icon: "sync_alt" },
          { label: "이번 주 문의", value: "—", sub: "채팅·요청", icon: "forum" },
          { label: "등록 부품", value: "—", sub: "목록 연동 시", icon: "category" },
          { label: "협업 분석", value: "분석", sub: "AI 매칭", icon: "hub" },
        ].map((item) => (
          <div
            key={item.label}
            className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/25"
          >
            <span className="inline-flex rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 p-2 text-white shadow-sm">
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">{item.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-stone-900">{item.value}</p>
            <p className="mt-1 text-xs font-normal text-stone-500">{item.sub}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">공장 추천</h2>
            <p className="mt-1 text-sm font-normal text-gray-400">
              {myCompany
                ? `${myCompany.name} 기준 협업 적합도 상위 업체입니다.`
                : "로그인 후 소속 공장 기준 맞춤 추천을 확인할 수 있습니다."}
            </p>
          </div>
          <Link
            to="/analysis"
            className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-lg hover:shadow-orange-500/35"
          >
            전체 분석 보기
          </Link>
        </div>

        {loading && <p className="text-sm font-normal text-gray-400">불러오는 중…</p>}

        {!loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((row) => (
              <article
                key={row.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:border-orange-200/90 hover:shadow-lg hover:shadow-orange-500/20"
              >
                <div className={`h-1 w-full ${matchTopBarClass(row.score)}`} aria-hidden />
                <div className="flex flex-1 flex-col p-5 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 font-bold leading-snug text-stone-900">{row.name}</h3>
                    <MatchScoreRing score={row.score} uniqueId={`d-${row.id}`} />
                  </div>
                  <p className="mt-2 text-sm font-normal text-stone-500">{row.address || "주소 미등록"}</p>
                  <p className="mt-2 text-xs font-medium text-stone-600">
                    {regionKo(row.region)} · {typeKo(row.type)}
                  </p>
                </div>
              </article>
            ))}
            {recommended.length === 0 && (
              <p className="col-span-full rounded-2xl border border-stone-200 bg-white py-12 text-center text-sm font-normal text-stone-500">
                등록된 업체가 없습니다.
              </p>
            )}
          </div>
        )}
      </section>

      {!isAuthenticated && (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-normal text-orange-700">
          로그인하면 소속 공장 기준 맞춤 추천을 볼 수 있습니다.
        </div>
      )}
    </div>
  );
}
