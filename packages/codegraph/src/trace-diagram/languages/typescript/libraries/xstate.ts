import { ROWS_ONLY_STORE } from "@/journey-flow-diagram/cards/store"
import type { LibraryCardRules } from "@/journey-flow-diagram/cards/types"

export const xstateCardRules: LibraryCardRules = { library: "XState", extends: "store", rules: ROWS_ONLY_STORE }
