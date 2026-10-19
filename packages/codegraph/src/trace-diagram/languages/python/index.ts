import type { LibraryCardRules } from "@/journey-flow-diagram/cards/types"
import { djangoCardRules } from "./libraries/django"
import { fastapiCardRules } from "./libraries/fastapi"
import { flaskCardRules } from "./libraries/flask"

export const PYTHON_CARD_RULES: readonly LibraryCardRules[] = [djangoCardRules, fastapiCardRules, flaskCardRules]
