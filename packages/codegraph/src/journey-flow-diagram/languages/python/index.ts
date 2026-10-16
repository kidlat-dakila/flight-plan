import type { LibraryCardRules } from "@/journey-flow-diagram/cards/types"
import { fastapiCardRules } from "./libraries/fastapi"
import { flaskCardRules } from "./libraries/flask"

export const PYTHON_CARD_RULES: readonly LibraryCardRules[] = [fastapiCardRules, flaskCardRules]
