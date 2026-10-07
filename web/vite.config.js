import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the browser talks to Vite (5173) and Vite forwards /api to FastAPI (8000).
// Same origin from the browser's point of view, so no CORS setup is needed while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8000" },
  },
});
