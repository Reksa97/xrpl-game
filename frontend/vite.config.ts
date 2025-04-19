import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "process", "crypto", "stream", "util"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    port: 3002,
    strictPort: true,
    host: "0.0.0.0", // Allow connections from outside the container
    proxy: {
      "/api/matchmaker": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/matchmaker/, ""),
      },
      "/api/oracle": {
        target: "http://localhost:8081",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/oracle/, ""),
      },
      "/api/xrpl-proxy": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/fund-account": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  define: {
    // Define process.env for xrpl.js
    "process.env": {},
    "process.browser": true,
    "process.version": '"v16.0.0"',
    "import.meta.env.VITE_EGG_SHOP_ADDR":
      '"rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    include: [
      "xrpl",
      "buffer",
      "crypto-browserify",
      "stream-browserify",
      "util",
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [
        {
          name: "node-polyfills",
          resolveId(id) {
            if (id === "buffer") {
              return { id: "buffer/", external: true };
            }
          },
        },
      ],
    },
  },
});
