import axios from "axios";
import { ENV } from "../utils/env";

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
});

/** 채팅 REST (server-node). `env.js` 의 CHAT_API_BASE_URL 사용 */
export const chatApiClient = axios.create({
  baseURL: ENV.CHAT_API_BASE_URL,
  timeout: 15000,
});
