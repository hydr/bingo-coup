import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  // Relative Pfade, damit das Ergebnis auch unter einem Unterpfad laeuft
  // (GitHub Pages liefert unter /<repo>/ aus).
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173 },
  // Vitest deckt src/ ab; e2e/ laeuft ueber Playwright.
  test: { include: ['src/**/*.test.ts'] },
})
