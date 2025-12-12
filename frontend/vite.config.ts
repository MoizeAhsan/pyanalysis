import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    jsxImportSource: '@emotion/react',
    babel: {
      plugins: ['@emotion/babel-plugin'],
    },
  })],
  root: '.',
  publicDir: 'public',
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
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
    sourcemap: true,
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Core React and DOM
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor'
            }
            
            // MUI and styling
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui'
            }
            
            // Visualization libraries (large libraries)
            if (id.includes('cytoscape') || id.includes('dagre') || id.includes('cose-bilkent')) {
              return 'cytoscape'
            }
            if (id.includes('d3') || id.includes('react-force-graph')) {
              return 'visualization-d3'
            }
            if (id.includes('vis-network') || id.includes('vis-util') || id.includes('vis-data')) {
              return 'vis-network'
            }
            
            // Export and print libraries
            if (id.includes('html2canvas') || id.includes('jspdf')) {
              return 'export-utils'
            }
            
            // Animation libraries
            if (id.includes('framer-motion')) {
              return 'animation'
            }
            
            // Other utilities
            if (id.includes('lodash') || id.includes('axios') || id.includes('zustand')) {
              return 'utils'
            }
            
            // Remaining node_modules
            return 'vendor'
          }
          
          // App chunks
          if (id.includes('/src/features/visualization/')) {
            return 'features-visualization'
          }
          if (id.includes('/src/features/')) {
            return 'features'
          }
          if (id.includes('/src/design-system/')) {
            return 'design-system'
          }
          if (id.includes('/src/shared/')) {
            return 'shared'
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId && facadeModuleId.includes('node_modules')) {
            return 'assets/vendor/[name]-[hash].js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@mui/material', 
      '@mui/icons-material',
      '@emotion/react', 
      '@emotion/styled',
      'axios',
      'lodash',
      'zustand'
    ],
    exclude: [
      'cytoscape',
      'cytoscape-cose-bilkent',
      'cytoscape-dagre',
      'd3',
      'vis-network',
      'html2canvas',
      'jspdf'
    ],
  },
})