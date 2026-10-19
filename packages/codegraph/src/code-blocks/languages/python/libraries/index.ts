import type { Library } from "@/code-blocks/libraries/types"
import { builtinsLibrary } from "./builtins"
import { djangoLibrary } from "./django"
import { fastapiLibrary } from "./fastapi"
import { flaskLibrary } from "./flask"
import { functoolsLibrary } from "./functools"
import { hashlibLibrary, hmacLibrary, secretsLibrary } from "./hashing"
import { pathlibLibrary } from "./pathlib"
import { multiprocessingLibrary, subprocessLibrary } from "./processes"
import { shutilLibrary } from "./shutil"

export const PYTHON_LIBRARIES: readonly Library[] = [builtinsLibrary, djangoLibrary, fastapiLibrary, flaskLibrary, functoolsLibrary, hashlibLibrary, hmacLibrary, secretsLibrary, pathlibLibrary, multiprocessingLibrary, subprocessLibrary, shutilLibrary]
