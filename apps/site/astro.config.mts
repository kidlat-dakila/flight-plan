import { satteri } from "@astrojs/markdown-satteri"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import { DOCS_CONTENT_FOLDER } from "./src/docs-content"
import { themeMediaPlugin } from "./src/markdown/theme-media"

const DEV_SERVER_PORT = 4400
const PREVIEW_SERVER_PORT = 4500
const REPOSITORY_URL = "https://github.com/kidlat-dakila/flight-plan"

const PAUSE_CLIPS_ON_REDUCED_MOTION = `
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("video[data-docs-clip]").forEach((clip) => {
      clip.removeAttribute("autoplay")
      clip.pause()
    })
  })
}
`

export default defineConfig({
  outDir: "../../dist/apps/site",
  cacheDir: "../../node_modules/.astro/apps/site",
  devToolbar: { enabled: false },
  server: ({ command }) => ({
    host: "localhost",
    port: command === "preview" ? PREVIEW_SERVER_PORT : DEV_SERVER_PORT,
  }),
  markdown: {
    processor: satteri({ mdastPlugins: [themeMediaPlugin] }),
  },
  integrations: [
    starlight({
      title: "Flight Plan",
      description: "Read a pull request as an ordered walkthrough beside its code, written by your assistant through MCP tools.",
      logo: { src: "./src/assets/logo.svg" },
      favicon: "/favicon.svg",
      social: [{ icon: "github", label: "GitHub", href: REPOSITORY_URL }],
      editLink: { baseUrl: `${REPOSITORY_URL}/edit/main/packages/docs/src/` },
      customCss: ["./src/styles/docs.css"],
      head: [{ tag: "script", content: PAUSE_CLIPS_ON_REDUCED_MOTION }],
      markdown: { processedDirs: [DOCS_CONTENT_FOLDER] },
      sidebar: [
        { slug: "docs" },
        { slug: "docs/installation" },
        {
          label: "Setup",
          items: [
            "docs/setup",
            "docs/setup/agent-integration",
            "docs/setup/git-integration",
            "docs/setup/prompt-configuration",
            "docs/setup/repositories",
          ],
        },
        { slug: "docs/supported-languages" },
        { slug: "docs/how-it-works" },
        {
          label: "Review artifacts",
          items: [
            { slug: "docs/review-artifacts" },
            {
              label: "Parts of the artifact",
              items: [
                "docs/review-artifacts/parts/segments",
                "docs/review-artifacts/parts/context",
                "docs/review-artifacts/parts/trace-diagram",
                "docs/review-artifacts/parts/blast-diagram",
                "docs/review-artifacts/parts/code-walkthrough",
                "docs/review-artifacts/parts/findings",
                "docs/review-artifacts/parts/context-code-blocks",
              ],
            },
            {
              label: "Around the artifact",
              items: [
                "docs/review-artifacts/features/comments-and-threads",
                "docs/review-artifacts/features/reviewed-marks",
                "docs/review-artifacts/features/submitting-a-review",
                "docs/review-artifacts/features/agent-chat",
                "docs/review-artifacts/features/sharing",
                "docs/review-artifacts/features/git-features",
                "docs/review-artifacts/features/your-own-flight-plan",
              ],
            },
          ],
        },
        { slug: "docs/presets" },
        {
          label: "Git connection",
          items: [
            "docs/git-connection",
            "docs/git-connection/local-git",
            "docs/git-connection/github",
            "docs/git-connection/gitlab",
            "docs/git-connection/bitbucket",
          ],
        },
      ],
    }),
  ],
})
