import * as vscode from "vscode"
import type { RawTheme } from "@code-hike/lighter"
import { customRules, findContribution, themeWithRules } from "../utils/theme"

/**
 * The user's active theme, ready to hand to the highlighter.
 *
 * Found among the extensions VS Code has loaded, which is exact where the
 * API's disk search (`installedTheme` in `src/api/theme.ts`) can only guess
 * at folders. Falls back to a bundled theme matching the current light or
 * dark kind. That happens when the theme cannot be located, for example a
 * theme contributed in a way this does not understand, and it is better than
 * rendering colourless code.
 */
export async function activeTheme(): Promise<RawTheme | string> {
  const name = vscode.workspace
    .getConfiguration("workbench")
    .get<string>("colorTheme")

  const fallback =
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ||
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrastLight
      ? "light-plus"
      : "dark-plus"

  if (!name) return fallback

  const file = findContribution(vscode.extensions.all, name)
  if (file === null) return fallback

  try {
    const setting = vscode.workspace.getConfiguration("editor").get("tokenColorCustomizations")
    return await themeWithRules(file, customRules(setting, name))
  } catch {
    return fallback
  }
}
