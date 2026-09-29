import type { RawTheme } from "@code-hike/lighter"

/**
 * VS Code's theme colours as CSS variables, for a browser.
 *
 * A webview gets `--vscode-*` variables from VS Code; a browser gets nothing.
 * So the UI turns the selected theme's `colors` into the same variables, by
 * VS Code's own rule — `editor.background` → `--vscode-editor-background` —
 * and fills every key the theme leaves out from a default table, as VS Code
 * does from its colour registry. Without the table a theme that sets only a
 * few colours would leave the rest empty.
 *
 * The table covers the keys this UI's CSS reads, for a dark and a light
 * theme. Values from VS Code's built-in Dark Modern and Light Modern themes
 * (with the themes they include); the keys those leave to the registry
 * (`charts.*`, `testing.*`, `disabledForeground`, `widget.shadow`, the
 * selection and find colours, `editorInfo`/`editorWarning`,
 * `gitDecoration.addedResourceForeground`, and the dark list colours) take
 * the registry's default values.
 */

export type ThemeKind = "dark" | "light"

const REGISTRY: Record<ThemeKind, Record<string, string>> = {
  dark: {
    "charts.blue": "#3794FF",
    "charts.green": "#89D185",
    "charts.red": "#F14C4C",
    "charts.yellow": "#CCA700",
    disabledForeground: "#CCCCCC80",
    "editor.findMatchHighlightBackground": "#EA5C0055",
    "editor.selectionBackground": "#264F78",
    "editorInfo.foreground": "#3794FF",
    "editorWarning.foreground": "#CCA700",
    "gitDecoration.addedResourceForeground": "#81B88B",
    "list.activeSelectionBackground": "#04395E",
    "list.hoverBackground": "#2A2D2E",
    "testing.iconFailed": "#F14C4C",
    "testing.iconPassed": "#73C991",
    "widget.shadow": "#0000005C",
  },
  light: {
    "charts.blue": "#1A85FF",
    "charts.green": "#388A34",
    "charts.red": "#E51400",
    "charts.yellow": "#BF8803",
    disabledForeground: "#61616180",
    "editor.findMatchHighlightBackground": "#EA5C0055",
    "editor.selectionBackground": "#ADD6FF",
    "editorInfo.foreground": "#1A85FF",
    "editorWarning.foreground": "#BF8803",
    "gitDecoration.addedResourceForeground": "#587C0C",
    "testing.iconFailed": "#F14C4C",
    "testing.iconPassed": "#73C991",
    "widget.shadow": "#00000029",
  },
}

const MODERN: Record<ThemeKind, Record<string, string>> = {
  dark: {
    "badge.background": "#616161",
    "badge.foreground": "#F8F8F8",
    "button.background": "#0078D4",
    "button.border": "#ffffff1a",
    "button.foreground": "#FFFFFF",
    "button.secondaryBackground": "#00000000",
    "button.secondaryForeground": "#CCCCCC",
    descriptionForeground: "#9D9D9D",
    "editor.background": "#1F1F1F",
    "editor.foreground": "#CCCCCC",
    "editorLineNumber.foreground": "#6E7681",
    "editorWidget.background": "#202020",
    errorForeground: "#F85149",
    focusBorder: "#0078D4",
    foreground: "#CCCCCC",
    "icon.foreground": "#CCCCCC",
    "input.background": "#313131",
    "input.border": "#3C3C3C",
    "input.foreground": "#CCCCCC",
    "notifications.background": "#1F1F1F",
    "notifications.foreground": "#CCCCCC",
    "panel.border": "#2B2B2B",
    "sideBar.background": "#181818",
    "textCodeBlock.background": "#2B2B2B",
    "textLink.foreground": "#4daafc",
    "widget.border": "#313131",
  },
  light: {
    "badge.background": "#CCCCCC",
    "badge.foreground": "#3B3B3B",
    "button.background": "#005FB8",
    "button.border": "#0000001a",
    "button.foreground": "#FFFFFF",
    "button.secondaryBackground": "#E5E5E5",
    "button.secondaryForeground": "#3B3B3B",
    descriptionForeground: "#3B3B3B",
    "editor.background": "#FFFFFF",
    "editor.foreground": "#3B3B3B",
    "editorLineNumber.foreground": "#6E7681",
    "editorWidget.background": "#F8F8F8",
    errorForeground: "#F85149",
    focusBorder: "#005FB8",
    foreground: "#3B3B3B",
    "icon.foreground": "#3B3B3B",
    "input.background": "#FFFFFF",
    "input.border": "#CECECE",
    "input.foreground": "#3B3B3B",
    "list.activeSelectionBackground": "#E8E8E8",
    "list.hoverBackground": "#F2F2F2",
    "notifications.background": "#FFFFFF",
    "notifications.foreground": "#3B3B3B",
    "panel.border": "#E5E5E5",
    "sideBar.background": "#F8F8F8",
    "textCodeBlock.background": "#F8F8F8",
    "textLink.foreground": "#005FB8",
    "widget.border": "#E5E5E5",
  },
}

/** Every default, per kind. */
export const DEFAULT_COLORS: Record<ThemeKind, Record<string, string>> = {
  dark: { ...MODERN.dark, ...REGISTRY.dark },
  light: { ...MODERN.light, ...REGISTRY.light },
}

/**
 * The typography VS Code sets beside the colours. Not a theme's to choose, so
 * fixed: VS Code's defaults on this platform family.
 */
const FONTS: Record<string, string> = {
  "--vscode-font-family": '-apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "Ubuntu", "Droid Sans", sans-serif',
  "--vscode-font-size": "13px",
  "--vscode-editor-font-family": 'Menlo, Monaco, Consolas, "Courier New", monospace',
  "--vscode-editor-font-size": "12px",
}

/** Light or dark: a name says so, a theme file has `type`. */
export function themeKind(theme: RawTheme | string): ThemeKind {
  const type = typeof theme === "string" ? theme : (theme.type ?? "dark")
  return /light/i.test(type) ? "light" : "dark"
}

/** `editor.background` → `--vscode-editor-background`. */
export function variableOf(key: string): string {
  return `--vscode-${key.replace(/\./g, "-")}`
}

/** Every `--vscode-*` variable a theme gives, defaults filled in. */
export function themeVariables(theme: RawTheme | string): Record<string, string> {
  const colors = {
    ...DEFAULT_COLORS[themeKind(theme)],
    ...(typeof theme === "string" ? {} : (theme.colors ?? {})),
  }
  const out: Record<string, string> = { ...FONTS }
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === "string" && value !== "") out[variableOf(key)] = value
  }
  return out
}

/**
 * Sets the variables on an element, removing the ones a previous theme set
 * and this one does not.
 */
export function applyVariables(element: HTMLElement, variables: Record<string, string>): void {
  const previous = (element.dataset["fpThemeVariables"] ?? "").split(" ").filter(Boolean)
  for (const name of previous) {
    if (!(name in variables)) element.style.removeProperty(name)
  }
  for (const [name, value] of Object.entries(variables)) element.style.setProperty(name, value)
  element.dataset["fpThemeVariables"] = Object.keys(variables).join(" ")
}
