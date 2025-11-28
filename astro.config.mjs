import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // Integraciones
  integrations: [
    react(),
    tailwind({
      // Aplicar estilos base de Tailwind
      applyBaseStyles: false, // Lo haremos manualmente para más control
    }),
  ],

  // Output estático por defecto (SSG)
  output: 'static',

  // Build configuration
  build: {
    inlineStylesheets: 'auto',
  },

  // Server configuration (para desarrollo)
  server: {
    port: 3000,
    host: true, // Permite acceso desde red local
  },

  // Vite configuration
  vite: {
    optimizeDeps: {
      exclude: ['@supabase/supabase-js'],
    },

    ssr: {
      noExternal: ['react-hook-form', '@hookform/resolvers'],
    },
    optimizeDeps: {
      include: ['@hookform/resolvers/zod', 'zod', 'react-hook-form'],
    },
  },

  // Experimental features
  // experimental: {
  //   contentCollectionCache: true,
  // },
});