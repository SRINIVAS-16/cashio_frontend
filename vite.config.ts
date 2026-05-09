import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/setupTests.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      testTimeout: 10000,
      hookTimeout: 10000,
      teardownTimeout: 5000,
      pool: "threads",
      coverage: {
        provider: "v8",
        reporter: ["text", "text-summary", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/setupTests.ts", "src/main.tsx", "src/vite-env.d.ts"],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
            pdf: ["jspdf", "jspdf-autotable"],
            xlsx: ["xlsx"],
            query: ["@tanstack/react-query"],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
  };
});
