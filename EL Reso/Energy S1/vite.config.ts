import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const r = (p: string) => resolve(fileURLToPath(new URL(".", import.meta.url)), p);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": r("src") },
  },
  build: {
    rollupOptions: {
      input: {
        index: r("index.html"),
        game: r("game.html"),
      },
    },
  },
});
