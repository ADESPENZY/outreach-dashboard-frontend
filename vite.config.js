import fs from "fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
