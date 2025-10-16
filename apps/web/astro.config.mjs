import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sharedSrc = resolve(projectRoot, '../../packages/shared/src');

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      config: {
        applyBaseStyles: false
      }
    })
  ],
  output: 'static',
  srcDir: 'src',
  vite: {
    resolve: {
      alias: {
        '@shared': sharedSrc
      }
    }
  }
});
