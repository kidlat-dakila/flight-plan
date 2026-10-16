import type { PatternFixture } from "@/catalogue/types"
import { fastapiFixtures } from "./fastapi-fixtures"
import { flaskFixtures } from "./flask-fixtures"

export const PYTHON_LIBRARY_FIXTURES: readonly PatternFixture[] = [...fastapiFixtures, ...flaskFixtures]
