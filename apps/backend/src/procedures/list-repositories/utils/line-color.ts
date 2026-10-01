export const LINE_COLORS = ["blue", "green", "magenta", "violet", "teal", "lime"] as const

export type LineColor = (typeof LINE_COLORS)[number]

const FALLBACK_LINE_COLOR: LineColor = "blue"

export const lineColorAt = (position: number): LineColor =>
  LINE_COLORS[position % LINE_COLORS.length] ?? FALLBACK_LINE_COLOR
