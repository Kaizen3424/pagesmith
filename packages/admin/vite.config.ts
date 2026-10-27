/**
 * Vite build for the admin SPA (D2 stack). Workspace packages are consumed
 * AS SOURCE (gotcha: `resolve.dedupe` React; internal exports resolve to src).
 * Prod purity: no sourcemaps in the shipped artifact (INV-N04 scan).
 */
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
