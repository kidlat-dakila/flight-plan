import type { PatternFixture } from "@/catalogue/types"
import { PATHLIB_PATH_METHOD_NAMES } from "@/code-blocks/languages/python/libraries/pathlib"

const PATHLIB = "pathlib"

const PATHLIB_PATH_KEY = "factory:Path:*"

const PATHLIB_PATH = "from pathlib import Path\n\nreport = Path(\"uploads/report.csv\")"

const PATHLIB_LOCAL_PATH = "report = LocalPath(\"uploads/report.csv\")"

const pathlibMethodFixture = (name: string): PatternFixture => ({
  library: PATHLIB,
  patternKey: `${PATHLIB_PATH_KEY}>call:${name}:*`,
  matches: [`${PATHLIB_PATH}\nreport.${name}()`, `import pathlib\n\npathlib.Path("uploads/report.csv").${name}()`],
  rejects: [`${PATHLIB_LOCAL_PATH}\nreport.${name}()`],
})

export const pathlibFixtures: readonly PatternFixture[] = [
  {
    library: PATHLIB,
    patternKey: PATHLIB_PATH_KEY,
    matches: [PATHLIB_PATH],
    rejects: [PATHLIB_LOCAL_PATH, "def Path(name):\n    return name\n\nreport = Path(\"uploads/report.csv\")"],
  },
  ...PATHLIB_PATH_METHOD_NAMES.map(pathlibMethodFixture),
]
