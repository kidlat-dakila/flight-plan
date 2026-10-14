import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"

const DEV_SERVER_PORT = 4400
const PREVIEW_SERVER_PORT = 4500
const REPOSITORY_URL = "https://github.com/kidlat-dakila/flight-plan"

export default defineConfig({
  outDir: "../../dist/apps/site",
  cacheDir: "../../node_modules/.astro/apps/site",
  devToolbar: { enabled: false },
  server: ({ command }) => ({
    host: "localhost",
    port: command === "preview" ? PREVIEW_SERVER_PORT : DEV_SERVER_PORT,
  }),
  integrations: [
    starlight({
      title: "Flight Plan",
      description: "Read a pull request as an ordered walkthrough beside its code, written by your assistant through MCP tools.",
      logo: { src: "./src/assets/logo.svg" },
      favicon: "/favicon.svg",
      social: [{ icon: "github", label: "GitHub", href: REPOSITORY_URL }],
      editLink: { baseUrl: `${REPOSITORY_URL}/edit/main/apps/site/` },
    }),
  ],
})
