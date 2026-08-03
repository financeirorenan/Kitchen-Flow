import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/firebase/")) {
            return "vendor-firebase";
          }
          if (id.includes("node_modules/lucide-react/") || id.includes("node_modules/framer-motion/") || id.includes("node_modules/motion/")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/recharts/")) {
            return "vendor-recharts";
          }
        }
      }
    }
  }
});

