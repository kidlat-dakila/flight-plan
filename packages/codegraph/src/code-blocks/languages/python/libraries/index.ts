import type { Library } from "@/code-blocks/libraries/types"
import { fastapiLibrary } from "./fastapi"
import { flaskLibrary } from "./flask"

export const PYTHON_LIBRARIES: readonly Library[] = [fastapiLibrary, flaskLibrary]
