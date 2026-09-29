import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import * as jsonc from "jsonc-parser"
import type { RawTheme } from "@code-hike/lighter"

/*
 * A VS Code theme file has the shape the highlighter accepts: lighter's
 * `RawTheme`, `{ name?, type?, tokenColors?, colors?, ... }`. So a theme file
 * is handed over with no conversion, and this module uses lighter's type
 * rather than declaring its own.
 */

/**
 * Reads a theme file, following `include` chains.
 *
 * Theme files are JSONC: comments and trailing commas are common, so a tolerant
 * parser is required. Many themes are a thin file that includes a base and
 * overrides part of it, so the two have to be merged rather than replaced.
 */
export async function readThemeFile(file: string): Promise<RawTheme> {
  const text = await fs.readFile(file, "utf8")
  const parsed = jsonc.parse(text) as (RawTheme & { include?: string }) | undefined
  if (parsed === undefined) return {}

  if (typeof parsed.include !== "string") return parsed

  const base = await readThemeFile(path.resolve(path.dirname(file), parsed.include))
  return {
    ...base,
    ...parsed,
    tokenColors: [...(base.tokenColors ?? []), ...(parsed.tokenColors ?? [])],
    colors: { ...(base.colors ?? {}), ...(parsed.colors ?? {}) },
  }
}

/** One installed extension, as far as themes are concerned. */
export type ThemePackage = { extensionPath: string; packageJSON: unknown }

type ThemeContribution = { id?: string; label?: string; path: string }

/**
 * The theme file an extension contributes under this label or id.
 *
 * Both, because a built-in theme's label is a `%placeholder%` for its
 * translations and only its id matches the setting.
 */
export function findContribution(
  packages: Iterable<ThemePackage>,
  name: string,
): string | null {
  for (const { extensionPath, packageJSON } of packages) {
    const themes = (packageJSON as { contributes?: { themes?: ThemeContribution[] } } | null)
      ?.contributes?.themes
    for (const contribution of themes ?? []) {
      if (typeof contribution.path !== "string") continue
      if (contribution.label === name || contribution.id === name) {
        return path.join(extensionPath, contribution.path)
      }
    }
  }
  return null
}

/**
 * Token colour customisations the user has set on top of their theme.
 *
 * `setting` is `editor.tokenColorCustomizations`. Handles the plain
 * `textMateRules` and the per-theme `[Theme Name]` form.
 */
export function customRules(setting: unknown, themeName: string): unknown[] {
  if (setting === null || typeof setting !== "object") return []
  const record = setting as Record<string, unknown>
  const scoped = record[`[${themeName}]`] as { textMateRules?: unknown } | undefined
  const global = record["textMateRules"]
  return [
    ...(Array.isArray(global) ? global : []),
    ...(Array.isArray(scoped?.textMateRules) ? scoped.textMateRules : []),
  ]
}

/** A theme file with the user's own rules added after its own. */
export async function themeWithRules(file: string, rules: unknown[]): Promise<RawTheme> {
  const theme = await readThemeFile(file)
  if (rules.length > 0) {
    // The user's rules are settings JSON, as unchecked as the theme file.
    theme.tokenColors = [
      ...(theme.tokenColors ?? []),
      ...(rules as NonNullable<RawTheme["tokenColors"]>),
    ]
  }
  return theme
}

/**
 * The highlighter's own theme when the user's cannot be found.
 *
 * VS Code's default dark theme, which is also what the extension falls back
 * to for a dark window.
 */
export const DEFAULT_THEME = "dark-plus"

/**
 * What VS Code uses when `workbench.colorTheme` is not set.
 *
 * The id, which is what the setting stores; the built-in theme's label is a
 * translation placeholder.
 */
const DEFAULT_THEME_ID = "Default Dark Modern"

/** Where VS Code keeps things on this machine. */
export type VsCodeLocations = {
  /** The user `settings.json`. */
  settings: string
  /** Folders whose children are extensions: the user's, then the built-in ones. */
  extensions: string[]
}

/**
 * VS Code stable's folders on this platform.
 *
 * Stable only: Insiders, Cursor and profiles keep their settings elsewhere,
 * and which of them to read is an open question. `FLIGHTPLAN_VSCODE_SETTINGS`
 * and `FLIGHTPLAN_VSCODE_EXTENSIONS`
 * (a `path.delimiter` list) override them.
 */
export function vscodeLocations(env: NodeJS.ProcessEnv = process.env): VsCodeLocations {
  const home = os.homedir()
  const platform = process.platform
  const user =
    platform === "darwin"
      ? path.join(home, "Library", "Application Support", "Code", "User")
      : platform === "win32"
        ? path.join(env["APPDATA"] ?? path.join(home, "AppData", "Roaming"), "Code", "User")
        : path.join(env["XDG_CONFIG_HOME"] ?? path.join(home, ".config"), "Code", "User")
  const builtIn =
    platform === "darwin"
      ? ["/Applications/Visual Studio Code.app/Contents/Resources/app/extensions"]
      : platform === "win32"
        ? [
            path.join(
              env["LOCALAPPDATA"] ?? path.join(home, "AppData", "Local"),
              "Programs",
              "Microsoft VS Code",
              "resources",
              "app",
              "extensions",
            ),
          ]
        : ["/usr/share/code/resources/app/extensions", "/opt/visual-studio-code/resources/app/extensions"]

  const settings = env["FLIGHTPLAN_VSCODE_SETTINGS"]
  const extensions = env["FLIGHTPLAN_VSCODE_EXTENSIONS"]
  return {
    settings: settings !== undefined && settings !== "" ? settings : path.join(user, "settings.json"),
    extensions:
      extensions !== undefined && extensions !== ""
        ? extensions.split(path.delimiter)
        : [path.join(home, ".vscode", "extensions"), ...builtIn],
  }
}

/** Every extension under the given folders that has a readable manifest. */
async function* packagesIn(folders: readonly string[]): AsyncGenerator<ThemePackage> {
  for (const folder of folders) {
    let entries: string[]
    try {
      entries = await fs.readdir(folder)
    } catch {
      continue
    }
    for (const entry of entries.sort()) {
      const extensionPath = path.join(folder, entry)
      try {
        const text = await fs.readFile(path.join(extensionPath, "package.json"), "utf8")
        yield { extensionPath, packageJSON: JSON.parse(text) as unknown }
      } catch {
        // Not an extension, or an unreadable one.
      }
    }
  }
}

/**
 * The theme the user selected in VS Code, read from disk.
 *
 * For a browser, where no VS Code injects anything: `workbench.colorTheme` from
 * the user settings, then the theme file from the installed extensions, with
 * the user's token colour rules on top. The default theme when any step finds
 * nothing.
 */
export async function installedTheme(
  locations: VsCodeLocations = vscodeLocations(),
): Promise<RawTheme | string> {
  let settings: Record<string, unknown> = {}
  try {
    const parsed = jsonc.parse(await fs.readFile(locations.settings, "utf8")) as unknown
    if (parsed !== null && typeof parsed === "object") settings = parsed as Record<string, unknown>
  } catch {
    // No settings file: VS Code's defaults.
  }
  const selected = settings["workbench.colorTheme"]
  const name = typeof selected === "string" && selected !== "" ? selected : DEFAULT_THEME_ID

  const packages: ThemePackage[] = []
  for await (const one of packagesIn(locations.extensions)) packages.push(one)
  const file = findContribution(packages, name)
  if (file === null) return DEFAULT_THEME
  try {
    return await themeWithRules(file, customRules(settings["editor.tokenColorCustomizations"], name))
  } catch {
    return DEFAULT_THEME
  }
}
