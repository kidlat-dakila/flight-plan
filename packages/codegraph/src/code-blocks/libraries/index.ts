import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { PYTHON_LIBRARIES } from "@/code-blocks/languages/python/libraries"
import { TYPESCRIPT_LIBRARIES } from "@/code-blocks/languages/typescript/libraries"
import type { Library } from "./types"

export type { CardSeed, Library } from "./types"

export const LIBRARIES: readonly Library[] = [...BUILT_IN_LIBRARIES, ...TYPESCRIPT_LIBRARIES, ...PYTHON_LIBRARIES]
