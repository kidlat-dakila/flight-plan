import type { WalkthroughOrder, WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"

export const WRITE_UP_SECTION_LABELS: Readonly<Record<WriteUpSection, string>> = {
  context: "Context",
  traceDiagram: "Trace Diagram",
  blastDiagram: "Blast Diagram",
  walkthrough: "Code Walkthrough",
  findings: "Findings",
}

export interface WalkthroughOrderOffer {
  readonly label: string
  readonly description: string
}

export const WALKTHROUGH_ORDER_OFFERS: Readonly<Record<WalkthroughOrder, WalkthroughOrderOffer>> = {
  "imports-bottom-up": {
    label: "Bottom up",
    description: "A file comes before the files that import it. If c.ts imports b.ts and b.ts imports a.ts, the walkthrough reads a.ts, b.ts, c.ts.",
  },
  "imports-top-down": {
    label: "Top down",
    description: "A file comes before the files it imports: c.ts, b.ts, a.ts.",
  },
  "important-first": {
    label: "Important changes first",
    description: "Files with a core change and a spotlight change come first, then the core changes, then the spotlight changes, then the rest.",
  },
}
