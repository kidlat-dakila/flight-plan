import { CODE_BLOCK_CLASSIFICATION_LABELS, CODE_BLOCK_CLASSIFICATIONS, type CodeBlockClassification } from "@flightplan/configurations"
import type { SpotlightGroup } from "./schemas"

const SPOTLIGHT_AREAS = ["frontend", "backend", "infrastructure", "miscellaneous"] as const

type SpotlightArea = (typeof SPOTLIGHT_AREAS)[number]

const SPOTLIGHT_AREA_LABELS: Readonly<Record<SpotlightArea, string>> = {
  frontend: "Frontend",
  backend: "Backend",
  infrastructure: "Infrastructure",
  miscellaneous: "Miscellaneous",
}

const SPOTLIGHT_AREA_OF: Readonly<Record<CodeBlockClassification, SpotlightArea>> = {
  "test": "miscellaneous",
  "build-and-infrastructure": "infrastructure",
  "migration": "backend",
  "page": "frontend",
  "component": "frontend",
  "webhook": "backend",
  "server-action": "backend",
  "api-route": "backend",
  "websocket": "backend",
  "messaging": "backend",
  "job": "infrastructure",
  "cli-command": "infrastructure",
  "database-read-write": "backend",
  "data-model": "backend",
  "third-party-integration": "backend",
  "api-request": "frontend",
  "validation": "backend",
  "ui-state": "frontend",
  "hook": "frontend",
  "security": "backend",
  "file-io": "backend",
  "process-execution": "backend",
  "navigation": "frontend",
  "error-handling": "miscellaneous",
  "effect": "miscellaneous",
  "event": "miscellaneous",
  "app-setup": "infrastructure",
  "feature-flag": "infrastructure",
  "config": "infrastructure",
  "storage": "frontend",
  "telemetry": "infrastructure",
  "i18n": "frontend",
  "styling": "frontend",
  "file": "miscellaneous",
  "logic": "miscellaneous",
}

const FEATURED_CLASSIFICATIONS: ReadonlySet<CodeBlockClassification> = new Set([
  "page",
  "component",
  "api-request",
  "server-action",
  "api-route",
  "database-read-write",
  "data-model",
  "validation",
])

const spotlightGroupOf = (area: SpotlightArea): SpotlightGroup => ({
  label: SPOTLIGHT_AREA_LABELS[area],
  choices: CODE_BLOCK_CLASSIFICATIONS
    .filter((classification) => SPOTLIGHT_AREA_OF[classification] === area)
    .map((classification) => ({
      classification,
      ...CODE_BLOCK_CLASSIFICATION_LABELS[classification],
      isFeatured: FEATURED_CLASSIFICATIONS.has(classification),
    })),
})

export const SPOTLIGHT_GROUPS: readonly SpotlightGroup[] = SPOTLIGHT_AREAS.map(spotlightGroupOf)
