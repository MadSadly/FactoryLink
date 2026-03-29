import axios from "axios";
import { ENV } from "../utils/env";

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
});
