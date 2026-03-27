import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

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
      setMessage("회원가입에 실패했습니다. 이미 존재하는 계정인지 확인하세요.");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-semibold">회원가입</h2>
      <form className="space-y-3" onSubmit={handleSignup}>
        <input
          className="w-full rounded border p-2"
          placeholder="name"
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          placeholder="email"
          value={form.email}
          onChange={(event) => handleChange("email", event.target.value)}
          required
          type="email"
        />
        <input
          className="w-full rounded border p-2"
          placeholder="password"
          value={form.password}
          onChange={(event) => handleChange("password", event.target.value)}
          required
          type="password"
        />
        <select
          className="w-full rounded border p-2"
          value={form.role}
          onChange={(event) => handleChange("role", event.target.value)}
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        {message && <p className="text-sm text-slate-700">{message}</p>}
        <button className="w-full rounded bg-blue-600 p-2 text-white" type="submit">
          회원가입
        </button>
      </form>
    </div>
  );
}
