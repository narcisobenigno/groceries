import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
    outDir: "./src/public/js",
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, "./src/client/js/app.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "es",
      },
    },
  },
});
