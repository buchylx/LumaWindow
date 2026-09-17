import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { sourceFingerprint } from "../../scripts/source-fingerprint";
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(
      sourceFingerprint(fileURLToPath(new URL("../../", import.meta.url))),
    ),
  },
  server: { port: 5173, strictPort: true },
  build: { target: "es2022" },
});
