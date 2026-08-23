import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            /**
             * Split the dependencies that change on a different clock from our
             * own code. React and the router are stable across deploys, so once
             * a returning visitor has them cached, shipping a storefront change
             * only invalidates the app chunk rather than all 439 KB.
             *
             * React, react-dom and the scheduler stay in one chunk on purpose —
             * separating them risks a module-initialisation order bug that only
             * shows up in production.
             */
            manualChunks(id: string) {
              if (!id.includes('node_modules')) return;
              if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
              if (id.includes('react-router')) return 'router';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('i18next')) return 'i18n';
              if (id.includes('lucide-react')) return 'icons';
              // Everything else (zustand, tslib, small helpers) rides along with
              // the entry chunk rather than earning a request of its own.
            },
          },
        },
      },
    };
});
