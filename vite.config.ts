import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({command})=>({
  plugins: [react(), ...(command==='build'?[{name:'production-csp',transformIndexHtml(){return [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"},injectTo:'head' as const}];}}]:[])],
  base: './', build: { chunkSizeWarningLimit: 1600 },
}));
