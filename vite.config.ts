import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoBase = "/l_lang-godel-encoder/";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? repoBase : "/",
  plugins: [react()],
}));
