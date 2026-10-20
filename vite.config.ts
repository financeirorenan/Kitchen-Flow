import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg", "icon-192.png", "icon-512.png", "manifest-courier.json"],
      manifest: {
        id: "/entregador",
        name: "KitchenFlow Entregador - App de Rotas",
        short_name: "KF Motoboy",
        description: "Aplicativo profissional de entregas, navegação GPS em tempo real, controle de ganhos e alertas offline para entregadores.",
        theme_color: "#FF4F18",
        background_color: "#0A0A0A",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/entregador",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    dedupe: ["react", "react-dom", "react-router-dom", "framer-motion", "motion"]
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "framer-motion",
      "lucide-react"
    ]
  },
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
