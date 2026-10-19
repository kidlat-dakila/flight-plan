import type { PatternFixture } from "@/catalogue/types"
import { builtinsFixtures } from "./builtins-fixtures"
import { djangoFixtures } from "./django-fixtures"
import { fastapiFixtures } from "./fastapi-fixtures"
import { flaskFixtures } from "./flask-fixtures"
import { functoolsFixtures } from "./functools-fixtures"
import { hashlibFixtures, hmacFixtures, secretsFixtures } from "./hashing-fixtures"
import { pathlibFixtures } from "./pathlib-fixtures"
import { multiprocessingFixtures, subprocessFixtures } from "./processes-fixtures"
import { shutilFixtures } from "./shutil-fixtures"

export const PYTHON_LIBRARY_FIXTURES: readonly PatternFixture[] = [
  ...builtinsFixtures,
  ...djangoFixtures,
  ...fastapiFixtures,
  ...flaskFixtures,
  ...functoolsFixtures,
  ...hashlibFixtures,
  ...hmacFixtures,
  ...secretsFixtures,
  ...pathlibFixtures,
  ...multiprocessingFixtures,
  ...subprocessFixtures,
  ...shutilFixtures,
]
