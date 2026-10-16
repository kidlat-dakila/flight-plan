import type { PatternFixture } from "@/catalogue/types"
import { djangoFixtures } from "./django-fixtures"
import { fastapiFixtures } from "./fastapi-fixtures"
import { flaskFixtures } from "./flask-fixtures"

export const PYTHON_LIBRARY_FIXTURES: readonly PatternFixture[] = [...djangoFixtures, ...fastapiFixtures, ...flaskFixtures]
