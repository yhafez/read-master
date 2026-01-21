import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { resolve } from "path";
import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Precache navigation routes for app shell
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/sign-in/,
          /^\/sign-up/,
          /^\/oauth\//,
          /^\/webhook/,
        ],
        // Clean up old caches on new service worker activation
        cleanupOutdatedCaches: true,
        // Skip waiting to activate new service worker immediately
        skipWaiting: true,
        // Claim clients immediately
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: "Read Master",
        short_name: "ReadMaster",
        description:
          "AI-powered reading comprehension platform that dramatically improves reading comprehension and retention",
        theme_color: "#1976d2",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icons/icon-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-128x128.png",
            sizes: "128x128",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-144x144.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-152x152.png",
            sizes: "152x152",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "maskable any",
          },
          {
            src: "icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable any",
          },
        ],
        categories: ["education", "books", "productivity"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ];

  // Upload source maps to Sentry in production builds
  if (mode === "production" && process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT || "read-master-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: {
          name: process.env.VITE_APP_VERSION || "unknown",
          uploadLegacySourcemaps: false,
        },
        sourcemaps: {
          assets: "./dist/**",
          ignore: ["**/node_modules/**"],
          filesToDeleteAfterUpload: ["**/*.js.map", "**/*.mjs.map"],
        },
        telemetry: false,
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
