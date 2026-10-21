import type { WalkthroughOrder, WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"

export const WRITE_UP_SECTION_LABELS: Readonly<Record<WriteUpSection, string>> = {
  context: "Context",
  traceDiagram: "Trace Diagram",
  blastDiagram: "Blast Diagram",
  walkthrough: "Code Walkthrough",
  findings: "Findings",
}

export const WALKTHROUGH_ORDER_LABELS: Readonly<Record<WalkthroughOrder, string>> = {
  "imports-bottom-up": "Building blocks first",
  "imports-top-down": "Entry points first",
  "important-first": "Most important first",
}
