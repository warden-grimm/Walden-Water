import { defineConfig } from 'vite';

export default defineConfig({
  // Keep the same build portable between / and /<repository>/ on GitHub Pages.
  base: './',
});
