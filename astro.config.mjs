import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],

  output: 'static',

  build: {
    inlineStylesheets: 'auto',
  },

  server: {
    port: 3000,
    host: true,
  },

  vite: {
    optimizeDeps: {
      exclude: ['@supabase/supabase-js'],
      include: ['@hookform/resolvers/zod', 'zod', 'react-hook-form'],
    },

    ssr: {
      noExternal: ['react-hook-form', '@hookform/resolvers'],
    },

    build: {
      // ✅ NUEVO: Aumentamos el límite de advertencia a 2000kb (2MB)
      // para que no moleste por las librerías de PDF/Excel.
      chunkSizeWarningLimit: 4000, 

      rollupOptions: {
        output: {
          manualChunks: {
            pdfrenderer: ['@react-pdf/renderer'],
            xlsx: ['xlsx'],
            docx: ['docx', 'file-saver'],
          },
        },
      },
    },
  },

  adapter: vercel(),
});