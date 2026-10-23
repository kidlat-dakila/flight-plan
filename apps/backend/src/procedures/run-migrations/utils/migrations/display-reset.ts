import type { ProcedureContext } from "@/procedures/context"
import type { ArrangedSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import type { Migration } from "@/procedures/run-migrations/utils/migration"

const SECTION_ORDER: readonly ArrangedSection[] = ["context", "traceDiagram", "walkthrough", "blastDiagram"]

export const planDisplayReset = (setup: Setup): Setup | null =>
  setup.reviewPreferences === null
    ? null
    : { ...setup, reviewPreferences: { ...setup.reviewPreferences, isSegmented: false, sectionOrder: SECTION_ORDER } }

const resetDisplay = async (context: ProcedureContext): Promise<void> => {
  const setup = planDisplayReset(await context.setupStore.read())
  if (setup !== null) await context.setupStore.write(setup)
}

export const DISPLAY_RESET_MIGRATION: Migration = { version: "0.1.11", migrate: resetDisplay }
