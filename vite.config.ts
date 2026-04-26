import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';

/**
 * file:// + `crossorigin` → CORS failure. file:// + `type="module"` → Chrome still blocks the script fetch.
 * Production bundle is IIFE; use a classic script tag so opening dist/index.html from disk works.
 * Use `defer` so the bundle runs after `<body>` is parsed — without it, a head script runs before `#root` exists (React #299).
 */
function htmlForFileUrlOpen(): Plugin {
  return {
    name: 'html-for-file-url-open',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html;
        return html
          .replace(/\s+crossorigin(?:="[^"]*")?/g, '')
          .replace(/<script type="module" /g, '<script defer ');
      },
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Relative asset URLs so `dist/index.html` works when opened via file:// or deployed under a subpath.
    base: './',
    build: {
      // ES module scripts are blocked from file:// in Chrome; IIFE + classic <script> works when opened from disk.
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
          name: 'C2App',
        },
      },
    },
    plugins: [react(), tailwindcss(), htmlForFileUrlOpen()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
