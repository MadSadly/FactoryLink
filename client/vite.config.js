import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // npm run dev 시 브라우저는 localhost:5173 만 보고, /api 는 Spring(8080)으로 넘긴다 (CORS 부담 감소)
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
