import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import fs from "node:fs/promises"
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const require = createRequire(import.meta.url)

/** This folder: the Vite root, where the HTML entries live. */
const HERE = path.dirname(fileURLToPath(import.meta.url))
/**
 * Copies the codicon stylesheet and its font into the build, verbatim.
 *
 * Not imported through the bundler, and that is forced by how `vscode-icon`
 * works: it draws its glyph inside a shadow root, which document CSS cannot
 * reach, so it looks for `<link id="vscode-codicon-stylesheet">` on the page
 * and re-injects that href into its own shadow root. The rules therefore have
 * to exist as a fetchable file rather than folded into the panel's stylesheet.
 *
 * Copied rather than emitted as a Vite asset so the names stay `codicon.css`
 * and `codicon.ttf`: the extension writes the `<link>` and needs a path it can
 * predict without reading a manifest. The `url()` inside the stylesheet is
 * relative, so the font resolves beside it.
 */
function codicons(): Plugin {
  const from = path.join(path.dirname(require.resolve("@vscode/codicons/package.json")), "dist")
  const NAMES = ["codicon.css", "codicon.ttf"]
  return {
    name: "flight-plan-codicons",
    // The dev server serves the same two files at the same root paths, so the
    // browser pages link `/codicon.css` just as the built panels do.
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = (request.url ?? "").split("?")[0]?.replace(/^\//, "") ?? ""
        if (!NAMES.includes(name)) return next()
        fs.readFile(path.join(from, name)).then(
          (bytes) => {
            response.setHeader("Content-Type", name.endsWith(".css") ? "text/css" : "font/ttf")
            response.end(bytes)
          },
          () => next(),
        )
      })
    },
    async generateBundle() {
      for (const name of NAMES) {
        this.emitFile({
          type: "asset",
          fileName: name,
          source: await fs.readFile(path.join(from, name)),
        })
      }
    },
  }
}

/*
 * @code-hike/lighter ships three builds and only the "default" one carries the
 * 212 grammars locally. Vite would otherwise pick the "browser" build, which
 * carries none and fetches every grammar from lighter.codehike.org at runtime.
 * That failure is invisible on a machine with a network connection, so the
 * alias is load-bearing.
 */
const LIGHTER = require.resolve("@code-hike/lighter/dist/index.esm.mjs")

export default defineConfig({
  // The config is run from the repository root (`--config src/ui/...`), and
  // Vite takes its root from the working directory unless told otherwise.
  root: HERE,
  plugins: [react(), codicons()],
  resolve: { alias: { "@code-hike/lighter": LIGHTER } },
  // Pre-bundling would resolve the package before the alias applies.
  optimizeDeps: { exclude: ["@code-hike/lighter"] },
  // Relative asset URLs: a webview is served from a vscode-webview:// origin,
  // where absolute paths do not resolve.
  base: "./",
  build: {
    outDir: "../../dist/webview",
    emptyOutDir: true,
    // Named entry rather than index.html, so the output is main.js and
    // main.css, which is what the extension's panel links to.
    rollupOptions: {
      // Two entries. The walkthrough carries a syntax highlighter and 200
      // grammars; setup is a form. Sharing one bundle would make the setup
      // panel pay a megabyte for nothing, and giving setup its own page in
      // plain DOM would mean two UI paradigms in one small codebase. A second
      // entry costs about 140 KB of React and keeps one of them.
      input: { main: path.join(HERE, "main.tsx"), setup: path.join(HERE, "setup/main.tsx") },
      /*
       * Chunk names are left to Rollup.
       *
       * Both entries now share React and the VS Code components, so there is a
       * hoisted chunk that neither panel's HTML names: each entry imports it
       * relatively, and a module imported from a nonced module script inherits
       * that nonce. That path is already exercised — the highlighter's ~240
       * grammars are dynamic imports under the same CSP — so it needs no
       * special handling. Naming the chunks by hand renamed the grammars too,
       * which was worse than the default.
       */
      output: { entryFileNames: "[name].js", assetFileNames: "[name][extname]" },
    },
  },
})
