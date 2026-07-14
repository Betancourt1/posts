import cloudflare from "@astrojs/cloudflare";
import { defineConfig, sessionDrivers } from "astro/config";

export default defineConfig({
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  output: "server",
  publicDir: "./.generated/public",
  session: {
    driver: sessionDrivers.null(),
  },
  site: process.env.SITE_URL || "https://fbetancourt.work",
});
