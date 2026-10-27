import type { ScriptFlag } from "@/catalogue/types"
import { LIBRARIES } from "@/code-blocks/libraries"
import { listConfigPaths, listScriptConfigPaths } from "@/code-blocks/locations"
import { listFlagValues } from "@/code-blocks/locations/script-flags"

const JEST_CONFIG: ScriptFlag = { scripts: "scripts.*", command: "jest", flags: ["--config", "-c"] }

describe("listFlagValues", () => {
  it("reads the value after the flag, written apart or joined with =", () => {
    expect(listFlagValues("jest --config ./test/jest-e2e.json", JEST_CONFIG)).toStrictEqual(["./test/jest-e2e.json"])
    expect(listFlagValues("jest --config=e2e/jest.json --runInBand", JEST_CONFIG)).toStrictEqual(["e2e/jest.json"])
    expect(listFlagValues("jest -c jest.e2e.config.js", JEST_CONFIG)).toStrictEqual(["jest.e2e.config.js"])
  })

  it("reads the command wherever it stands, through a runner, a path and other commands", () => {
    expect(listFlagValues("cross-env CI=1 npx jest -c \"config/jest e2e.json\"", JEST_CONFIG)).toStrictEqual(["config/jest e2e.json"])
    expect(listFlagValues("node --inspect node_modules/.bin/jest --config jest.debug.js", JEST_CONFIG)).toStrictEqual(["jest.debug.js"])
    expect(listFlagValues("npm run build && jest --config a.json ; jest -c b.json", JEST_CONFIG)).toStrictEqual(["a.json", "b.json"])
  })

  it("reads no flag of another command, no inline JSON and no flag with no value", () => {
    expect(listFlagValues("eslint -c .eslintrc.json && jest", JEST_CONFIG)).toStrictEqual([])
    expect(listFlagValues("jest --config '{\"testMatch\":[\"**/*.check.ts\"]}'", JEST_CONFIG)).toStrictEqual([])
    expect(listFlagValues("jest --config --watch", JEST_CONFIG)).toStrictEqual([])
    expect(listFlagValues("jest --config", JEST_CONFIG)).toStrictEqual([])
  })
})

describe("listScriptConfigPaths", () => {
  const configTextsOf = (files: Readonly<Record<string, string>>): ReadonlyMap<string, string> =>
    new Map(listConfigPaths(Object.keys(files), LIBRARIES).map((configPath) => [configPath, files[configPath]] as const))

  it("lists the configuration files the scripts of a manifest name, from the folder of that manifest", () => {
    const files = {
      "apps/api/package.json": JSON.stringify({ scripts: { "test:e2e": "jest --config ./test/jest-e2e.json", "e2e": "playwright test -c ../../e2e/playwright.ts" } }),
      "apps/api/test/jest-e2e.json": "{}",
      "e2e/playwright.ts": "export default {}",
    }

    expect(listScriptConfigPaths(Object.keys(files), configTextsOf(files), LIBRARIES)).toStrictEqual(["apps/api/test/jest-e2e.json", "e2e/playwright.ts"])
  })

  it("leaves out a path the repository does not hold, one above it, and one already read", () => {
    const files = {
      "package.json": JSON.stringify({ scripts: { a: "jest --config ./missing.json", b: "jest --config ../outside.json", c: "vitest --config vitest.config.ts" } }),
      "vitest.config.ts": "export default {}",
    }

    expect(listScriptConfigPaths(Object.keys(files), configTextsOf(files), LIBRARIES)).toStrictEqual([])
  })
})
