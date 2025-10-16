import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const sharedSrc = resolve(projectRoot, "../../packages/shared/src");

export default defineConfig({
  integrations: [react()],
  output: "static",
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
