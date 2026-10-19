import type { PatternFixture } from "@/catalogue/types"
import { SHUTIL_NAMES } from "@/code-blocks/languages/python/libraries/shutil"

const SHUTIL = "shutil"

const shutilCalled = (callee: string): string => `${callee}("uploads/report.csv", "archive/report.csv")`

const shutilFixture = (name: string): PatternFixture => ({
  library: SHUTIL,
  patternKey: `call:${name}:*`,
  matches: [`import shutil\n\n${shutilCalled(`shutil.${name}`)}`, `from shutil import ${name}\n\n${shutilCalled(name)}`],
  rejects: [`shutil = LocalStore()\n\n${shutilCalled(`shutil.${name}`)}`],
})

export const shutilFixtures: readonly PatternFixture[] = SHUTIL_NAMES.map(shutilFixture)
