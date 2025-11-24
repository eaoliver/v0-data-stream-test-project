import { defineConfig } from "vite";

import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    svelte({
      preprocess: [sveltePreprocess({ typescript: true })],
    }),
  ],
});
