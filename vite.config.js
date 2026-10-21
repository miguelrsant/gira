import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// npm run build        → dist/ (index.html + assets/), pronto para qualquer hospedagem estática
// npm run build:single → dist-single/index.html: o jogo inteiro num arquivo só, abre direto no navegador
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [react(), single && viteSingleFile()],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      // three.js sozinho já passa do aviso padrão de 500 kB
      chunkSizeWarningLimit: 1600,
    },
  };
});
