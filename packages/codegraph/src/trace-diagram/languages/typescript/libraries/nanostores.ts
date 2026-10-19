import { ROWS_ONLY_STORE } from "@/trace-diagram/cards/store"
import type { LibraryCardRules } from "@/trace-diagram/cards/types"

export const nanostoresCardRules: LibraryCardRules = { library: "Nano Stores", extends: "store", rules: ROWS_ONLY_STORE }
