import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedSrc = resolve(projectRoot, "../../packages/shared/src");

export default defineConfig({
  integrations: [react()],
  adapter: node({ mode: "standalone" }),
  output: "server",
  srcDir: "src",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@shared": sharedSrc,
      },
    },
  },
});
