import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackStartVite } from "@tanstack/start-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackStartVite({
      target: "vercel",
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});