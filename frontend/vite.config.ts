import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  root: '.',
  publicDir: 'public',
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@': resolve(__dirname, './src'),
      '@features': resolve(__dirname, './src/features'),
      '@shared': resolve(__dirname, './src/shared'),
      '@design-system': resolve(__dirname, './src/design-system'),
      '@app': resolve(__dirname, './src/app'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        // Stable vendor chunks cache well across releases. Package names are
        // matched exactly: a substring test would sweep every "react-*" library
        // into the React chunk.
        manualChunks: (id) => {
          const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(id);
          const name = match?.[1];
          if (!name) return undefined;
          if (
            [
              'react',
              'react-dom',
              'scheduler',
              'react-router',
              'react-router-dom',
              '@remix-run/router',
            ].includes(name)
          ) {
            return 'react';
          }
          // Only MUI's styling core is shared by every page. Components stay with
          // the chunks that use them, so the first page does not download, say,
          // the Slider used by a settings panel that is loaded on demand.
          if (
            name.startsWith('@emotion/') ||
            ['@mui/system', '@mui/utils', '@mui/styled-engine', '@mui/private-theming'].includes(
              name,
            ) ||
            /node_modules\/@mui\/material\/(styles|colors|utils)\//.test(id)
          ) {
            return 'mui';
          }
          if (name === 'cytoscape') return 'cytoscape';
          return undefined;
        },
      },
    },
  },
});
