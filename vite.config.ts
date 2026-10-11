import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev API server (npm run dev:api). Production serves dist/ from Express.
      "/api": "http://localhost:3001",
    },
  },
});
