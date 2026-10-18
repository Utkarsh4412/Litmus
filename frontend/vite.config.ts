import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

const backendTarget = process.env.VITE_BACKEND_URL || "http://localhost:8000";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    // Localhost only by default. The Docker image sets VITE_HOST=0.0.0.0 so the
    // container's published port (itself bound to 127.0.0.1) can reach Vite.
    host: process.env.VITE_HOST || "localhost",
    port: 5173,
    // Windows bind mounts need polling; native filesystems use notifications.
    watch: { usePolling: loadEnv(mode, process.cwd(), "VITE_").VITE_POLL === "1", interval: 300 },
    proxy: { "/api": { target: backendTarget, rewrite: (p) => p.replace(/^\/api/, "") } },
  },
}));
