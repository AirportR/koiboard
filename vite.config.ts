import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.KOIPY_API || "http://127.0.0.1:8899";

const apiProxy = {
  "/api": {
    target: apiTarget,
    changeOrigin: true,
    secure: false,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5288,
    proxy: apiProxy,
    watch: {
      ignored: ["**/.*tmpdir/**", "**/shots/**", "**/dist/**"],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5289,
    proxy: apiProxy,
  },
});
