import axios from "axios";
import { ENV } from "../utils/env";

const TOKEN_KEY = "factorylink_token";

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 60000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = String(err.config?.url ?? "");
    if (
      status === 401 &&
      !url.includes("/auth/login") &&
      localStorage.getItem(TOKEN_KEY)
    ) {
      window.dispatchEvent(new Event("factorylink-auth-expired"));
    }
    return Promise.reject(err);
  }
);

/** 채팅 REST (server-node). `env.js` 의 CHAT_API_BASE_URL 사용 */
export const chatApiClient = axios.create({
  baseURL: ENV.CHAT_API_BASE_URL,
  timeout: 15000,
});

chatApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** POST /api/recommend/feedback */
export function postRecommendFeedback({ queryCompanyId, recommendedCompanyId, score, action }) {
  return apiClient.post("/recommend/feedback", {
    queryCompanyId,
    recommendedCompanyId,
    score,
    action,
  });
}

/** GET /api/companies/recommend */
export function fetchHybridRecommend(params) {
  return apiClient.get("/companies/recommend", { params });
}

/** POST /api/ai/parse-requirements */
export function parseRequirements(rawInput) {
  return apiClient.post("/ai/parse-requirements", { rawInput });
}

/** POST /api/quotes */
export function createQuote(body) {
  return apiClient.post("/quotes", body);
}

/** GET /api/quotes/:id */
export function getQuote(id) {
  return apiClient.get(`/quotes/${id}`);
}

/** POST /api/contracts/draft */
export function createContractDraft(body) {
  return apiClient.post("/contracts/draft", body);
}

/** GET /api/pdf/quote/:id — PDF 바이너리 */
export function downloadQuotePdf(quoteId) {
  return apiClient.get(`/pdf/quote/${quoteId}`, { responseType: "blob" });
}

/** GET /api/pdf/contract/:id */
export function downloadContractPdf(draftId) {
  return apiClient.get(`/pdf/contract/${draftId}`, { responseType: "blob" });
}

/** server-node: 채팅 메시지 REST 전송 */
export function postChatMessage({ roomId, userId, message }) {
  return chatApiClient.post("/chat/messages", { roomId, userId, message });
}
