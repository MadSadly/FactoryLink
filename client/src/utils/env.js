function normalizeApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw && String(raw).trim() !== "") {
    const s = String(raw).replace(/\/$/, "");
    return s.endsWith("/api") ? s : `${s}/api`;
  }
  if (import.meta.env.DEV) {
    return "/api";
  }
  return "http://localhost:8080/api";
}

/**
 * 채팅 REST는 server-node(기본 3001)에서 제공한다. Spring(8080)에는 없음.
 * VITE_API_BASE_URL을 8080으로 두면 apiClient만으로는 채팅이 깨지므로 별도 base 사용.
 */
function normalizeChatApiBase() {
  const raw = import.meta.env.VITE_CHAT_API_BASE_URL;
  if (raw && String(raw).trim() !== "") {
    const s = String(raw).replace(/\/$/, "");
    return s.endsWith("/api") ? s : `${s}/api`;
  }
  if (import.meta.env.DEV) {
    return "/api";
  }
  return "http://localhost:3001/api";
}

/** AI FastAPI base (no /api). Default 8000; change if AI_PORT differs on Windows. */
function normalizeAiBase() {
  const raw = import.meta.env.VITE_AI_BASE_URL;
  if (raw && String(raw).trim() !== "") {
    return String(raw).replace(/\/$/, "");
  }
  return "http://localhost:8000";
}

export const ENV = {
  KAKAO_MAP_KEY: String(import.meta.env.VITE_KAKAO_MAP_KEY ?? "").trim(),
  API_BASE_URL: normalizeApiBase(),
  CHAT_API_BASE_URL: normalizeChatApiBase(),
  AI_BASE_URL: normalizeAiBase(),
  SOCKET_URL:
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_CHAT_SERVER_URL ||
    "http://localhost:3001",
};

export function checkEnv() {
  if (!import.meta.env.DEV) return;
  const snapshot = {
    KAKAO_MAP_KEY: ENV.KAKAO_MAP_KEY,
    API_BASE_URL: ENV.API_BASE_URL,
    CHAT_API_BASE_URL: ENV.CHAT_API_BASE_URL,
    SOCKET_URL: ENV.SOCKET_URL,
  };
  const missing = Object.entries(snapshot)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.warn("[Factory-Link] Missing env vars:", missing.join(", "));
  }
}
