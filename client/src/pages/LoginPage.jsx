import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { btnPrimaryClass, cardClass, inputClass } from "../lib/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      const response = await apiClient.post("/auth/login", { email, password });
      setAuthToken(response.data.token);
      navigate("/dashboard");
    } catch {
      setErrorMessage("로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.");
    }
  };

  return (
    <div className={`${cardClass} w-full max-w-md shadow-xl`}>
      <h2 className="mb-1 text-2xl font-extrabold text-on-surface">로그인</h2>
      <p className="mb-6 text-sm text-stone-600">Factory-Link 계정으로 로그인합니다.</p>
      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">이메일</label>
          <input
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">비밀번호</label>
          <input
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            autoComplete="current-password"
          />
        </div>
        {errorMessage && <p className="rounded-lg bg-error-container/40 p-3 text-sm text-error">{errorMessage}</p>}
        <button className={`${btnPrimaryClass} w-full`} type="submit">
          로그인
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-on-surface-variant">
        계정이 없으신가요?{" "}
        <Link className="font-bold text-primary hover:underline" to="/signup">
          회원가입
        </Link>
      </p>
    </div>
  );
}
