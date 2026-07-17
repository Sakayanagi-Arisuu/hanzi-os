import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["hanzi-awakening-hero.png", "hanzi-os-mark.svg"],
      manifest: {
        name: "HANZI.OS - Mandarin Awakening System",
        short_name: "HANZI.OS",
        description: "Hệ thống học tiếng Trung thích ứng từ con số 0.",
        theme_color: "#030708",
        background_color: "#030708",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "vi",
        icons: [
          {
            src: "/hanzi-os-mark.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "hanzi-os-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "hanzi-os-character-data",
              expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
  },
});
