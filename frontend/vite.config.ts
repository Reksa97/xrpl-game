import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Add all node builtin modules as polyfills
      include: ['buffer', 'process', 'util', 'stream', 'events', 'crypto'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 3002,
    strictPort: true,
    host: '0.0.0.0', // Allow connections from outside the container
    proxy: {
      '/api/matchmaker': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/matchmaker/, ''),
      },
      '/api/oracle': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/oracle/, ''),
      },
      '/api/xrpl-proxy': {
        target: 'http://34.88.230.243:51234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xrpl-proxy/, ''),
      },
    },
  },
  define: {
    // Define process.env for xrpl.js
    'process.env': {},
    'process.browser': true,
    'process.version': '"v16.0.0"',
    'import.meta.env.VITE_EGG_SHOP_ADDR': '"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
});