import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { btnPrimaryClass, cardClass, inputClass } from "../lib/ui";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "USER",
  });
  const [message, setMessage] = useState("");

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await apiClient.post("/auth/signup", form);
      setMessage("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => navigate("/login"), 800);
    } catch {
      setMessage("회원가입에 실패했습니다. 이미 등록된 이메일인지 확인하세요.");
    }
  };

  return (
    <div className={`${cardClass} w-full max-w-md shadow-xl`}>
      <h2 className="mb-1 text-2xl font-extrabold text-on-surface">회원가입</h2>
      <p className="mb-6 text-sm text-on-surface-variant">새 계정을 만들고 포털 서비스를 이용하세요.</p>
      <form className="space-y-4" onSubmit={handleSignup}>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">이름</label>
          <input
            className={inputClass}
            placeholder="홍길동"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
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
            onChange={(event) => handleChange("email", event.target.value)}
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
            onChange={(event) => handleChange("password", event.target.value)}
            required
            type="password"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">역할</label>
          <select
            className={inputClass}
            value={form.role}
            onChange={(event) => handleChange("role", event.target.value)}
          >
            <option value="USER">일반 사용자 (USER)</option>
            <option value="ADMIN">관리자 (ADMIN)</option>
          </select>
        </div>
        {message && (
          <p
            className={`rounded-lg p-3 text-sm ${message.includes("완료") ? "bg-secondary-fixed/40 text-on-secondary-fixed" : "bg-error-container/40 text-error"}`}
          >
            {message}
          </p>
        )}
        <button className={`${btnPrimaryClass} w-full`} type="submit">
          가입하기
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
