import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ADD THIS BLOCK BELOW
  server: {
    host: true, // Listen on all local IPs (0.0.0.0)
    port: 5173,
    allowedHosts: true, // Tell Vite to stop blocking Nginx/Gateway requests
  },
});