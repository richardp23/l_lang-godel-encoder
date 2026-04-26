import { defineConfig } from "vite";

const repoBase = "/l_lang-godel-encoder/";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? repoBase : "/",
}));
