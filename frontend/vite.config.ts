import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rawBase = process.env.VITE_BASE_PATH?.trim() || "/";
const base = rawBase.endsWith("/") ? rawBase : rawBase + "/";

export default defineConfig({
  plugins: [react()],
  base,
});
