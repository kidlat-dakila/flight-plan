import type { Library } from "@/code-blocks/libraries/types"
import { djangoLibrary } from "./django"
import { fastapiLibrary } from "./fastapi"
import { flaskLibrary } from "./flask"

export const PYTHON_LIBRARIES: readonly Library[] = [djangoLibrary, fastapiLibrary, flaskLibrary]
