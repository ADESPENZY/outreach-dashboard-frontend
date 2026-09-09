import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// Bake the version the bundle was built with into the code (single source of
// truth = public/version.json). VersionCheck.jsx compares this against the
// deployed /version.json to detect when a newer build has shipped.
const appVersion = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "public/version.json"), "utf-8"),
).version

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Emit the SW registration ourselves is unnecessary — 'auto' injects it.
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "applydir-apple-touch-icon-180.png", "applydir-favicon.svg"],
      manifest: {
        name: "ApplyDir — Your AI Headhunter",
        short_name: "ApplyDir",
        description:
          "ApplyDir finds who's hiring and introduces you. Your AI headhunter for remote roles.",
        theme_color: "#FF5B2E",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        // "any" and "maskable" are declared separately on purpose: a maskable
        // icon is full-bleed with the mark inside the inner 60%, so reusing it
        // as "any" would show a huge margin in launchers that don't mask.
        icons: [
          { src: "applydir-app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "applydir-app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "applydir-maskable-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "applydir-maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Pull our push/notificationclick handlers into the generated SW without
        // disturbing its precache logic.
        importScripts: ["/push-sw.js"],
        // Precache the built app shell for offline load + installability.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // NEVER precache version.json — VersionCheck.jsx must always read the
        // live file to detect new deploys. Precaching it would freeze the app
        // on an old version.
        globIgnores: ["**/version.json"],
        // SPA fallback for client-side routes, but let real files/APIs pass
        // through to the network untouched.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /version\.json/],
        // Don't hold the SW hostage to an old build after a deploy.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Google Fonts stylesheet
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            // Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Let the dev server serve the SW so we can test install locally.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
