import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { createContractDraft, downloadContractPdf, getQuote } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function ContractPage() {
  const { quoteId } = useParams();
  const { isAuthenticated } = useAuth();
  const id = quoteId ? Number(quoteId) : NaN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(null);
  const [special, setSpecial] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("계약금 30%, 잔금 납품 후 30일");
  const [warranty, setWarranty] = useState(12);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftErr, setDraftErr] = useState("");
  const [draftId, setDraftId] = useState(null);
  const [contractHtml, setContractHtml] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setError("잘못된 견적 번호입니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await getQuote(id);
      const inner = data?.success ? data.data : data;
      setQuote(inner);
    } catch (e) {
      const m = e?.response?.data?.message;
      setError(typeof m === "string" ? m : "견적을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleDraft = async () => {
    if (!Number.isFinite(id)) return;
    setDraftLoading(true);
    setDraftErr("");
    try {
      const { data } = await createContractDraft({
        quoteId: id,
        paymentTerms,
        warrantyMonths: warranty,
        specialTerms: special,
      });
      const inner = data?.success ? data.data : data;
      const did = inner?.draftId ?? inner?.draft_id;
      const html = inner?.contractHtml ?? inner?.contract_html;
      setDraftId(did);
      setContractHtml(html || "");
    } catch (e) {
      const m = e?.response?.data?.message;
      setDraftErr(typeof m === "string" ? m : "계약서 생성에 실패했습니다.");
    } finally {
      setDraftLoading(false);
    }
  };

  const handlePdf = async () => {
    if (draftId == null) return;
    try {
      const { data } = await downloadContractPdf(draftId);
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `계약서_${draftId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDraftErr("PDF 다운로드에 실패했습니다.");
    }
  };

  const handleSignAlert = () => {
    window.alert("준비 중인 기능입니다.");
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
        <Link to="/login" className="font-semibold text-amber-300 underline">
          로그인
        </Link>
        이 필요합니다.
      </div>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-orange-400">계약</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">계약서 초안</h1>
        <p className="mt-2 text-sm text-gray-400">견적 #{id} 기준 · 특약 수정 후 초안 생성 및 PDF</p>
      </div>

      {quote && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-sm text-gray-300">
          <p>
            <span className="text-gray-500">합계</span>{" "}
            {quote.totalAmount != null ? Number(quote.totalAmount).toLocaleString() : "—"}원
          </p>
        </div>
      )}

      <label className="block text-sm font-medium text-gray-300">
        대금 지급 조건
        <input
          className="mt-2 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
        />
      </label>

      <label className="block text-sm font-medium text-gray-300">
        품질보증 기간(개월)
        <input
          type="number"
          className="mt-2 w-40 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          value={warranty}
          onChange={(e) => setWarranty(Number(e.target.value))}
        />
      </label>

      <label className="block text-sm font-medium text-gray-300">
        특약사항
        <textarea
          className="mt-2 min-h-[120px] w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white"
          value={special}
          onChange={(e) => setSpecial(e.target.value)}
          placeholder="추가 조건을 입력하세요."
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={draftLoading}
          onClick={handleDraft}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {draftLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          계약서 초안 생성
        </button>
        <button
          type="button"
          disabled={draftId == null}
          onClick={handlePdf}
          className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-40"
        >
          PDF 다운로드
        </button>
        <button
          type="button"
          onClick={handleSignAlert}
          className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-200 ring-1 ring-gray-600"
        >
          전자서명 요청
        </button>
      </div>

      {draftErr && <p className="text-sm text-red-300">{draftErr}</p>}

      {contractHtml && (
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-white">
          <iframe title="계약서 미리보기" className="h-[520px] w-full" srcDoc={contractHtml} />
        </div>
      )}

      <p className="text-sm text-gray-500">
        <Link to="/quote" className="text-orange-400 underline">
          견적·계약서
        </Link>
        로 돌아가기
      </p>
    </div>
  );
}
