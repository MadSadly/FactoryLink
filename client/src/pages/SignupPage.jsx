import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { btnPrimaryClass, cardClass, inputClass } from "../lib/ui";
import { formatBusinessNumberDigits } from "../utils/inputMask";

/** 백엔드는 SELLER/BOTH 업체에만 가입 허용 */
function eligibleCompanies(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((c) => c.type === "SELLER" || c.type === "BOTH");
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { setAuthToken } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loadErr, setLoadErr] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    companyId: "",
    businessNumber: "",
  });
  const [verifyMsg, setVerifyMsg] = useState("");
  const [bnVerified, setBnVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/companies");
        const list = data?.success ? data.data : data;
        if (!cancelled) setCompanies(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setLoadErr("업체 목록을 불러오지 못했습니다. 서버·DB를 확인하세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => eligibleCompanies(companies), [companies]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "businessNumber") {
      setBnVerified(false);
      setVerifyMsg("");
    }
    if (key === "companyId") {
      setBnVerified(false);
      setVerifyMsg("");
    }
  };

  const onBusinessNumberInput = (e) => {
    const formatted = formatBusinessNumberDigits(e.target.value);
    handleChange("businessNumber", formatted);
  };

  const handleVerifyBn = async () => {
    setVerifyMsg("");
    const bn = String(form.businessNumber || "").trim();
    if (!bn) {
      setVerifyMsg("사업자등록번호를 입력하세요.");
      return;
    }
    try {
      const { data } = await apiClient.post("/auth/verify-business-number", {
        businessNumber: bn,
      });
      if (data?.success) {
        setBnVerified(true);
        setVerifyMsg(data?.message || "인증되었습니다.");
      } else {
        setBnVerified(false);
        setVerifyMsg(data?.message || "인증에 실패했습니다.");
      }
    } catch (e) {
      setBnVerified(false);
      const m = e?.response?.data?.message;
      setVerifyMsg(typeof m === "string" ? m : "인증 요청에 실패했습니다.");
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setMessage("");
    const cid = form.companyId === "" ? null : Number(form.companyId);
    if (cid == null || Number.isNaN(cid)) {
      setMessage("소속 업체를 선택하세요.");
      return;
    }
    if (!String(form.businessNumber || "").trim()) {
      setMessage("사업자등록번호를 입력하고 인증해 주세요.");
      return;
    }
    if (!bnVerified) {
      setMessage('사업자등록번호에서 「인증하기」를 눌러 검증을 완료하세요.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/auth/signup", {
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        role: "MEMBER",
        companyId: cid,
        businessNumber: String(form.businessNumber).trim(),
      });
      if (data?.token) {
        setAuthToken(data.token);
      }
      setMessage("회원가입이 완료되었습니다.");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (e) {
      const m = e?.response?.data?.message;
      setMessage(
        typeof m === "string" && m.trim()
          ? m
          : "회원가입에 실패했습니다. 이메일·업체·사업자번호를 확인하세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${cardClass} w-full max-w-md shadow-xl`}>
      <h2 className="mb-1 text-2xl font-extrabold text-on-surface">회원가입</h2>
      <p className="mb-6 text-sm text-on-surface-variant">
        공장·제조 소속(공급사/겸업) 업체를 선택하고, 사업자등록번호를 인증한 뒤 가입합니다.
      </p>
      <form className="space-y-4" onSubmit={handleSignup}>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            소속 업체
          </label>
          <select
            className={inputClass}
            value={form.companyId}
            onChange={(e) => handleChange("companyId", e.target.value)}
            required
          >
            <option value="">업체 선택…</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.type}
              </option>
            ))}
          </select>
          {loadErr && <p className="mt-1 text-xs text-red-600">{loadErr}</p>}
          {!loadErr && options.length === 0 && companies.length > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              가입 가능한 업체(SELLER/BOTH)가 없습니다. DB에 공급사 유형 업체가 있는지 확인하세요.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            사업자등록번호
          </label>
          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              placeholder="숫자만 입력"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={form.businessNumber}
              onChange={onBusinessNumberInput}
              required
            />
            <button
              type="button"
              className="shrink-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              onClick={handleVerifyBn}
            >
              인증하기
            </button>
          </div>
          {verifyMsg && (
            <p
              className={`mt-1 text-xs ${bnVerified ? "text-emerald-700" : "text-red-600"}`}
            >
              {verifyMsg}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">이름</label>
          <input
            className={inputClass}
            placeholder="홍길동"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">이메일</label>
          <input
            className={inputClass}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            type="email"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">비밀번호</label>
          <input
            className={inputClass}
            placeholder="8자 이상 권장"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
            type="password"
            autoComplete="new-password"
          />
        </div>
        {message && (
          <p
            className={`rounded-lg p-3 text-sm ${
              message.includes("완료")
                ? "bg-secondary-fixed/40 text-on-secondary-fixed"
                : "bg-error-container/40 text-error"
            }`}
          >
            {message}
          </p>
        )}
        <button
          className={`${btnPrimaryClass} w-full`}
          type="submit"
          disabled={submitting}
        >
          {submitting ? "처리 중…" : "가입하기"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-on-surface-variant">
        이미 계정이 있으신가요?{" "}
        <Link className="font-bold text-primary hover:underline" to="/login">
          로그인
        </Link>
      </p>
    </div>
  );
}
