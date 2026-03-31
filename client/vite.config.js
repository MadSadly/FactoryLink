import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const localProxy = {
  "/api/chat": {
    target: "http://localhost:3001",
    changeOrigin: true,
  },
  "/socket.io": {
    target: "http://localhost:3001",
    changeOrigin: true,
    ws: true,
  },
  "/api": {
    target: "http://localhost:8080",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // localhost / 127.0.0.1 / 같은 PC의 다른 호스트명으로 접속할 때 바인딩 문제 완화
    host: true,
    proxy: localProxy,
  },
  preview: {
    port: 4173,
    proxy: localProxy,
  },
});
