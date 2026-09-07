import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  // Relative paths, so the build also works under a sub-path (GitHub Pages
  // serves from /<repo>/).
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173 },
  // Vitest covers src/; e2e/ runs through Playwright.
  test: { include: ['src/**/*.test.ts'] },
})
