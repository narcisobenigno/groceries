import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
    outDir: "./src/app/public/js",
    rollupOptions: {
      input: {
        app: "./src/app/client/js/app.ts",
      },
      output: {
        entryFileNames: "[name].js",
        format: "es",
      },
    },
  },
  resolve: {
    alias: {
      "@hotwired/turbo": "./node_modules/@hotwired/turbo/dist/turbo.es2017-esm.js",
    },
  },
});
