import * as fs from "node:fs"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { DEFAULT_COLORS, themeKind, themeVariables, variableOf } from "../colors"

/** VS Code's colour rule, and the defaults behind a theme's gaps. */
describe("theme variables", () => {
  it("should name a variable the way VS Code does", () => {
    expect(variableOf("editor.background")).toBe("--vscode-editor-background")
    expect(variableOf("editorWidget.background")).toBe("--vscode-editorWidget-background")
  })

  it("should take the theme's colours over the defaults, and keep the rest", () => {
    const vars = themeVariables({ type: "dark", colors: { "editor.background": "#101010" } })
    expect(vars["--vscode-editor-background"]).toBe("#101010")
    expect(vars["--vscode-foreground"]).toBe(DEFAULT_COLORS.dark["foreground"])
    expect(vars["--vscode-editor-font-family"]).toContain("monospace")
  })

  it("should use the light defaults for a light theme or name", () => {
    expect(themeKind({ type: "light" })).toBe("light")
    expect(themeKind("light-plus")).toBe("light")
    expect(themeKind("dark-plus")).toBe("dark")
    expect(themeVariables("light-plus")["--vscode-editor-background"]).toBe("#FFFFFF")
  })

  it("should have a default for every colour key in both kinds", () => {
    expect(Object.keys(DEFAULT_COLORS.dark).sort()).toEqual(Object.keys(DEFAULT_COLORS.light).sort())
  })

  /*
   * A variable the CSS reads and no default gives is empty in a browser for
   * every theme that leaves it out. This fails when the CSS starts using one.
   */
  it("should have a default for every --vscode- colour the UI's CSS reads", () => {
    const ui = path.resolve(__dirname, "../..")
    const css = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return entry.name === "node_modules" ? [] : css(full)
        return entry.name.endsWith(".css") ? [fs.readFileSync(full, "utf8")] : []
      })
    const used = new Set(css(ui).flatMap((text) => [...text.matchAll(/--vscode-([A-Za-z0-9-]+)/g)].map((m) => m[1] ?? "")))
    const given = new Set(Object.keys(themeVariables("dark-plus")).map((name) => name.slice("--vscode-".length)))
    const missing = [...used].filter((name) => !given.has(name) && name !== "charts-")
    expect(missing).toEqual([])
  })
})
