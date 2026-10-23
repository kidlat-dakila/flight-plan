import type { CodeBlockClassification, WalkthroughOrder } from "@flightplan/configurations"

export { WALKTHROUGH_ORDERS, type WalkthroughOrder } from "@flightplan/configurations"

export const WRITE_UP_TIMINGS = ["always", "on-demand"] as const

export type WriteUpTiming = (typeof WRITE_UP_TIMINGS)[number]

export const WRITE_UP_SECTIONS = ["context", "traceDiagram", "blastDiagram", "walkthrough", "findings"] as const

export type WriteUpSection = (typeof WRITE_UP_SECTIONS)[number]

export type SectionWriteUps = Readonly<Record<WriteUpSection, WriteUpTiming>>

export const ARRANGED_SECTIONS = ["context", "traceDiagram", "blastDiagram", "walkthrough"] as const

export type ArrangedSection = (typeof ARRANGED_SECTIONS)[number]

export interface ReviewPreferences {
  readonly spotlight: readonly CodeBlockClassification[]
  readonly sectionWriteUps: SectionWriteUps
  readonly isSegmented: boolean
  readonly walkthroughOrder: WalkthroughOrder
  readonly sectionOrder: readonly ArrangedSection[]
  readonly ignoredPaths: readonly string[]
}

export const DEFAULT_IGNORED_PATHS: readonly string[] = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/__tests__/**",
  "**/e2e/**",
  "**/*.e2e.ts",
  "**/*.e2e-spec.ts",
  "**/test_*.py",
  "**/*_test.py",
  "**/tests/**",
  "**/conftest.py",
]

export const DEFAULT_REVIEW_PREFERENCES: ReviewPreferences = {
  spotlight: ["page", "component", "api-route", "database-read-write", "data-model", "hook"],
  sectionWriteUps: {
    context: "always",
    traceDiagram: "always",
    blastDiagram: "on-demand",
    walkthrough: "on-demand",
    findings: "always",
  },
  isSegmented: false,
  walkthroughOrder: "imports-bottom-up",
  sectionOrder: ARRANGED_SECTIONS,
  ignoredPaths: DEFAULT_IGNORED_PATHS,
}

export const reviewPreferencesOf = (stored: ReviewPreferences | null): ReviewPreferences =>
  stored ?? DEFAULT_REVIEW_PREFERENCES
