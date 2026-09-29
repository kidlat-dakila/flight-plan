import * as assert from "assert"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { DEFAULT_THEME, customRules, installedTheme } from "../theme"

/**
 * The browser's theme: the one selected in VS Code's settings, found
 * among the installed extensions, with the user's rules on top.
 */
suite("installed theme", () => {
  let root = ""
  const settings = () => path.join(root, "settings.json")
  const extensions = () => path.join(root, "extensions")

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fp-theme-"))
    const extension = path.join(extensions(), "acme.night-1.0.0")
    await fs.mkdir(path.join(extension, "themes"), { recursive: true })
    await fs.writeFile(
      path.join(extension, "package.json"),
      JSON.stringify({ contributes: { themes: [{ id: "Acme Night", label: "%label%", path: "./themes/night.json" }] } }),
    )
    await fs.writeFile(
      path.join(extension, "themes", "night.json"),
      '{ /* JSONC */ "name": "Acme Night", "type": "dark", "colors": { "editor.background": "#101010", }, "tokenColors": [] }',
    )
  })
  afterAll(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  test("reads the selected theme, by id, with the user's rules", async () => {
    await fs.writeFile(
      settings(),
      '{ "workbench.colorTheme": "Acme Night", // a comment\n "editor.tokenColorCustomizations": { "[Acme Night]": { "textMateRules": [{ "scope": "comment" }] } } }',
    )
    const theme = await installedTheme({ settings: settings(), extensions: [extensions()] })
    assert.ok(typeof theme === "object")
    assert.strictEqual(theme.colors?.["editor.background"], "#101010")
    assert.strictEqual(theme.tokenColors?.length, 1)
  })

  test("falls back to the default when the theme is not installed or nothing is set", async () => {
    await fs.writeFile(settings(), '{ "workbench.colorTheme": "Not Installed" }')
    assert.strictEqual(await installedTheme({ settings: settings(), extensions: [extensions()] }), DEFAULT_THEME)
    assert.strictEqual(
      await installedTheme({ settings: path.join(root, "none.json"), extensions: [path.join(root, "none")] }),
      DEFAULT_THEME,
    )
  })

  test("reads both forms of token colour customisation", () => {
    assert.deepStrictEqual(customRules({ textMateRules: [1], "[T]": { textMateRules: [2] } }, "T"), [1, 2])
    assert.deepStrictEqual(customRules(undefined, "T"), [])
  })
})
