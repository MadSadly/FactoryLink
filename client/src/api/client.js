import axios from "axios";

// 개발: Vite 프록시 사용 시 같은 출처의 /api (vite.config.js 의 proxy)
// 운영·Docker: VITE_API_BASE_URL 로 전체 URL 지정
const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:8080/api");

export const apiClient = axios.create({
  baseURL: defaultBaseUrl,
  timeout: 10000,
});
