import type { PresetName } from "./setup"

export interface PresetOffer {
  readonly label: string
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

export const DEFAULT_PRESET: PresetName = "standard"

export const PRESET_OFFERS: Record<PresetName, PresetOffer> = {
  "standard": {
    label: "Standard",
    bestFor: "Best for general pull requests.",
    description: "The agent writes the full review for a reviewer who knows the codebase.",
    note: null,
  },
  "minimal": {
    label: "Minimal (caveman)",
    bestFor: "Best for saving tokens.",
    description: "The agent writes in caveman style: few words and no filler.",
    note: "Journey Flow Diagrams, the Blast Diagram and the findings on waypoints are off by default. You can generate each of them on demand.",
  },
  "onboardee": {
    label: "Onboardee",
    bestFor: "Best for engineers who are new to the company and the codebase.",
    description: "The agent writes the review with more context on how the codebase works.",
    note: null,
  },
  "unfamiliar-territory": {
    label: "Unfamiliar territory",
    bestFor: "Best for a pull request in a language or framework you do not know well.",
    description: "The agent writes the review with more context on how the technology works.",
    note: null,
  },
}
