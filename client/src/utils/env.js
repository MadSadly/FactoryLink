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

export const ENV = {
  KAKAO_MAP_KEY: import.meta.env.VITE_KAKAO_MAP_KEY,
  API_BASE_URL: normalizeApiBase(),
  SOCKET_URL:
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_CHAT_SERVER_URL ||
    "http://localhost:3001",
};

export function checkEnv() {
  const snapshot = {
    KAKAO_MAP_KEY: ENV.KAKAO_MAP_KEY,
    API_BASE_URL: ENV.API_BASE_URL,
    SOCKET_URL: ENV.SOCKET_URL,
  };
  const missing = Object.entries(snapshot)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.warn("[Factory-Link] Missing env vars:", missing.join(", "));
  }
}
