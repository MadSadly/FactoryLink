import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";

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
      navigate("/");
    } catch {
      setErrorMessage("로그인에 실패했습니다. 계정 정보를 확인하세요.");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-semibold">로그인</h2>
      <form className="space-y-3" onSubmit={handleLogin}>
        <input
          className="w-full rounded border p-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email"
          required
          type="email"
        />
        <input
          className="w-full rounded border p-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          required
          type="password"
        />
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <button className="w-full rounded bg-blue-600 p-2 text-white" type="submit">
          로그인
        </button>
      </form>
    </div>
  );
}
