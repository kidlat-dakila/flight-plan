import { ROWS_ONLY_STORE } from "@/trace-diagram/cards/store"
import type { LibraryCardRules } from "@/trace-diagram/cards/types"

export const piniaCardRules: LibraryCardRules = { library: "Pinia", extends: "store", rules: ROWS_ONLY_STORE }
