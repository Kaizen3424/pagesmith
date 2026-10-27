/** Playground dev/build config — env-prefix lets MYCMS_* flags reach the harness safely. */
import { defineConfig } from "vite"

export default defineConfig({
  envPrefix: ["VITE_", "MYCMS_"],
  build: {
    target: "es2022",
    sourcemap: false,
  },
})
