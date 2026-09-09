import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [remix({ ssr: false })],
  resolve: { dedupe: ['react', 'react-dom'], alias: {
    "next/dynamic": fileURLToPath(new URL('./lib/compat/dynamic.tsx', import.meta.url)),
    "next/image": fileURLToPath(new URL('./lib/compat/image.tsx', import.meta.url)),
    "@": fileURLToPath(new URL('.', import.meta.url)),
  } },
});
