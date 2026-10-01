export type LineColor = "blue" | "green" | "magenta" | "violet" | "teal" | "lime"

export const LINE_COLOR_CLASSES: Record<LineColor, string> = {
  blue: "[--line:var(--line-blue)]",
  green: "[--line:var(--line-green)]",
  magenta: "[--line:var(--line-magenta)]",
  violet: "[--line:var(--line-violet)]",
  teal: "[--line:var(--line-teal)]",
  lime: "[--line:var(--line-lime)]",
}
