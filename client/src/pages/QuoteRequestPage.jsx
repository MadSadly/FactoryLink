import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import {
  apiClient,
  chatApiClient,
  createQuote,
  downloadQuotePdf,
  fetchHybridRecommend,
  parseRequirements,
  postChatMessage,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { getCompanyIdFromToken, getUserIdFromToken } from "../auth/token";
import { ENV } from "../utils/env";

function pickPartPrice(parts, nameHint) {
  if (!parts?.length || !nameHint) return null;
  const n = String(nameHint).trim().toLowerCase();
  const exact = parts.find((p) => String(p.name || "").toLowerCase() === n);
  if (exact) return exact;
  return parts.find((p) => String(p.name || "").toLowerCase().includes(n) || n.includes(String(p.name || "").toLowerCase()));
}

export default function QuoteRequestPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const myCompanyId = token ? getCompanyIdFromToken(token) : null;
  const userId = token ? getUserIdFromToken(token) : null;

  const [step, setStep] = useState(1);
  const [rawInput, setRawInput] = useState("");
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsed, setParsed] = useState(null);

  const [rows, setRows] = useState([]);

  const [recoLoading, setRecoLoading] = useState(false);
  const [recoError, setRecoError] = useState("");
  const [recoList, setRecoList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [targetParts, setTargetParts] = useState([]);

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteId, setQuoteId] = useState(null);
  const [quoteHtml, setQuoteHtml] = useState("");

  const keywords = useMemo(() => {
    const k = parsed?.extracted_keywords;
    return Array.isArray(k) ? k : [];
  }, [parsed]);

  const loadRecommend = useCallback(async () => {
    if (!isAuthenticated || myCompanyId == null) return;
    setRecoLoading(true);
    setRecoError("");
    try {
      const { data } = await fetchHybridRecommend({
        queryItems: keywords.length ? keywords : ["제조"],
        topK: 12,
      });
      const inner = data?.success ? data.data : data;
      setRecoList(Array.isArray(inner) ? inner : []);
    } catch (e) {
      const m = e?.response?.data?.message;
      setRecoError(typeof m === "string" ? m : "추천 목록을 불러오지 못했습니다.");
      setRecoList([]);
    } finally {
      setRecoLoading(false);
    }
  }, [isAuthenticated, myCompanyId, keywords]);

  useEffect(() => {
    if (step === 2 && isAuthenticated) {
      loadRecommend();
    }
  }, [step, isAuthenticated, loadRecommend]);

  const handleParse = async () => {
    setParseLoading(true);
    setParseError("");
    try {
      const { data } = await parseRequirements(rawInput);
      const inner = data?.success ? data.data : data;
      setParsed(inner);
      const items = Array.isArray(inner?.items) ? inner.items : [];
      const mapped = items.map((it, idx) => ({
        key: `r-${idx}`,
        partId: null,
        name: String(it.name ?? ""),
        quantity: Number(it.quantity) || 0,
        unit: it.unit || "개",
        unitPrice: Number(it.unit_price) || 0,
        amount:
          Number(it.amount) ||
          (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
      }));
      setRows(mapped);
      setStep(2);
    } catch (e) {
      const m = e?.response?.data?.message;
      setParseError(typeof m === "string" ? m : "분석에 실패했습니다.");
    } finally {
      setParseLoading(false);
    }
  };

  const selectCompany = async (item) => {
    setSelected(item);
    setTargetParts([]);
    try {
      const { data } = await apiClient.get(`/companies/${item.companyId}`);
      const inner = data?.success ? data.data : data;
      const parts = Array.isArray(inner?.parts) ? inner.parts : [];
      setTargetParts(parts);
      setRows((prev) =>
        prev.map((row) => {
          const p = pickPartPrice(parts, row.name);
          if (!p) return row;
          const qty = row.quantity || 0;
          const up = Number(p.unitPrice) || 0;
          return {
            ...row,
            partId: p.id,
            unitPrice: up,
            amount: qty * up,
          };
        }),
      );
    } catch {
      setTargetParts([]);
    }
  };

  const updateRow = (key, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          const q = Number(field === "quantity" ? value : next.quantity) || 0;
          const u = Number(field === "unitPrice" ? value : next.unitPrice) || 0;
          next.amount = q * u;
        }
        return next;
      }),
    );
  };

  const handleCreateQuote = async () => {
    if (!selected || myCompanyId == null) return;
    setQuoteLoading(true);
    setQuoteError("");
    try {
      const { data } = await createQuote({
        targetCompanyId: selected.companyId,
        items: rows.map((r) => ({
          partId: r.partId,
          name: r.name,
          quantity: r.quantity,
          unit: r.unit,
          unitPrice: r.unitPrice,
          amount: r.amount,
        })),
        deadline: parsed?.deadline_days ? null : null,
        validUntil: null,
        notes: "",
      });
      const inner = data?.success ? data.data : data;
      setQuoteId(inner?.quoteId ?? inner?.quote_id);
      setQuoteHtml(inner?.quoteHtml ?? inner?.quote_html ?? "");
      setStep(3);
    } catch (e) {
      const m = e?.response?.data?.message;
      setQuoteError(typeof m === "string" ? m : "견적서 생성에 실패했습니다.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handlePdf = async () => {
    if (quoteId == null) return;
    try {
      const { data } = await downloadQuotePdf(quoteId);
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `견적서_${quoteId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setQuoteError("PDF 다운로드에 실패했습니다.");
    }
  };

  const handleSendChat = async () => {
    if (!selected || userId == null || myCompanyId == null || quoteId == null) return;
    setQuoteLoading(true);
    setQuoteError("");
    try {
      const pdfUrl = `${window.location.origin}${ENV.API_BASE_URL.replace(/\/$/, "")}/pdf/quote/${quoteId}`;
      const { data: roomRes } = await chatApiClient.post("/chat/rooms", {
        buyerCompanyId: myCompanyId,
        sellerCompanyId: selected.companyId,
      });
      const inner = roomRes?.success ? roomRes.data : roomRes;
      const rid = inner?.roomId ?? inner?.id;
      if (rid == null) {
        setQuoteError("채팅방을 만들지 못했습니다.");
        return;
      }
      await postChatMessage({
        roomId: rid,
        userId,
        message: `[견적서 PDF 안내] ${pdfUrl}`,
      });
      navigate(`/chat?room=${rid}`);
    } catch (e) {
      const m = e?.response?.data?.message;
      setQuoteError(typeof m === "string" ? m : "채팅 전송에 실패했습니다.");
    } finally {
      setQuoteLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        <Link to="/login" className="font-semibold text-amber-300 underline">
          로그인
        </Link>
        후 견적·계약서 기능을 사용할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-600/30 text-orange-300 ring-1 ring-orange-500/30">
          <FileText className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-orange-400">문서 워크플로</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">견적·계약서</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            자연어 입력 → AI 구조화 → 추천 업체 선택 → 견적서 PDF 및 채팅 전송
          </p>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
        <li className={step === 1 ? "text-orange-400" : ""}>1. 품목 입력</li>
        <li>·</li>
        <li className={step === 2 ? "text-orange-400" : ""}>2. 업체 선택</li>
        <li>·</li>
        <li className={step === 3 ? "text-orange-400" : ""}>3. 미리보기·PDF</li>
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">
            품목·수량·납기·예산을 자연어로 입력
            <textarea
              className="mt-2 min-h-[140px] w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="예: 가죽 신발 갑피 5,000개, 납기 30일, 예산 1,500만원"
            />
          </label>
          {parseError && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{parseError}</p>
          )}
          <button
            type="button"
            disabled={parseLoading || !rawInput.trim()}
            onClick={handleParse}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {parseLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            AI 분석
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/40">
            <table className="w-full min-w-[640px] text-left text-sm text-gray-200">
              <thead className="border-b border-gray-800 bg-gray-900/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">품목명</th>
                  <th className="px-3 py-2">수량</th>
                  <th className="px-3 py-2">단위</th>
                  <th className="px-3 py-2">단가</th>
                  <th className="px-3 py-2">금액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-gray-800/80">
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
                        value={row.name}
                        onChange={(e) => updateRow(row.key, "name", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, "quantity", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
                        value={row.unit}
                        onChange={(e) => updateRow(row.key, "unit", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-28 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-sm"
                        value={row.unitPrice}
                        onChange={(e) => updateRow(row.key, "unitPrice", Number(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-300">{Math.round(row.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">추천 업체</h2>
              <button
                type="button"
                onClick={() => {
                  loadRecommend();
                }}
                className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800"
              >
                키워드로 추천 불러오기
              </button>
            </div>
            {recoLoading && <p className="text-sm text-gray-500">불러오는 중…</p>}
            {recoError && <p className="text-sm text-red-300">{recoError}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {recoList.map((r) => (
                <button
                  key={r.companyId}
                  type="button"
                  onClick={() => selectCompany(r)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected?.companyId === r.companyId
                      ? "border-orange-500 bg-orange-950/30 ring-1 ring-orange-500/40"
                      : "border-gray-800 bg-gray-900/50 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">{r.companyName}</span>
                    <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-300">
                      {(r.score * 100).toFixed(0)}점
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">{r.reason}</p>
                  {Array.isArray(r.matchedParts) && r.matchedParts.length > 0 && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      매칭 품목: {r.matchedParts.join(", ")}
                    </p>
                  )}
                </button>
              ))}
            </div>
            {recoList.length === 0 && !recoLoading && (
              <p className="text-sm text-gray-500">위 버튼으로 추천을 불러오세요.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!selected || quoteLoading}
              onClick={handleCreateQuote}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              견적서 생성
            </button>
            {quoteError && <span className="text-sm text-red-300">{quoteError}</span>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">견적서 미리보기</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-white">
            {quoteHtml ? (
              <iframe title="견적 미리보기" className="h-[480px] w-full" srcDoc={quoteHtml} />
            ) : (
              <p className="p-6 text-sm text-gray-600">HTML 미리보기를 불러올 수 없습니다.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePdf}
              className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
            >
              PDF 다운로드
            </button>
            <button
              type="button"
              onClick={handleSendChat}
              disabled={quoteLoading}
              className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white ring-1 ring-gray-600 hover:bg-gray-700 disabled:opacity-50"
            >
              채팅으로 전송
            </button>
            <Link
              to={quoteId != null ? `/contract/${quoteId}` : "#"}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-orange-400 underline-offset-4 hover:underline"
            >
              계약서 초안 작성 →
            </Link>
          </div>
          {quoteError && <p className="text-sm text-red-300">{quoteError}</p>}
        </div>
      )}
    </div>
  );
}
