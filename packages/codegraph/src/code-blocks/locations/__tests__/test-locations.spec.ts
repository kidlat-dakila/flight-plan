import { codeOf, manifestWith, pathsPlacedAs, requirementsWith } from "./locations-fixture"

const JAVASCRIPT_CANDIDATES = [
  "src/cart.test.ts",
  "src/cart.spec.tsx",
  "src/__tests__/cart.ts",
  "src/cart.ts",
  "tests/cart.check.ts",
  "e2e/checkout.spec.ts",
  "cypress/e2e/checkout.cy.ts",
  "src/Button.stories.tsx",
  "stories/Button.stories.tsx",
]

const testsOf = (files: Readonly<Record<string, string>>, candidates: readonly string[] = JAVASCRIPT_CANDIDATES): string[] => pathsPlacedAs(files, "test", candidates)

describe("where a repository keeps its tests", () => {
  it("places no test when no test runner is installed", () => {
    expect(testsOf({ "package.json": manifestWith("react") })).toStrictEqual([])
  })

  describe("Vitest", () => {
    it("uses its default include when no configuration file is there", () => {
      expect(testsOf({ "package.json": manifestWith("vitest") })).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "e2e/checkout.spec.ts"])
    })

    it("uses its default include when the configuration is silent", () => {
      const files = { "package.json": manifestWith("vitest"), "vite.config.ts": codeOf("export default defineConfig({ plugins: [react()] })") }

      expect(testsOf(files)).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "e2e/checkout.spec.ts"])
    })

    it("reads test.include when the configuration moves the tests", () => {
      const files = { "package.json": manifestWith("vitest"), "vitest.config.ts": codeOf("export default defineConfig({ test: { include: [\"tests/**/*.check.ts\"] } })") }

      expect(testsOf(files)).toStrictEqual(["tests/cart.check.ts"])
    })

    it("falls back to its default when the include is computed", () => {
      const files = { "package.json": manifestWith("vitest"), "vitest.config.ts": codeOf("export default defineConfig({ test: { include: listIncludes() } })") }

      expect(testsOf(files)).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "e2e/checkout.spec.ts"])
    })

    it("follows a configuration held in a constant", () => {
      const files = { "package.json": manifestWith("vitest"), "vitest.config.ts": codeOf("const config = { test: { include: [\"tests/**\"] } }", "export default config") }

      expect(testsOf(files)).toStrictEqual(["tests/cart.check.ts"])
    })

    it("reads each package of a monorepo with its own configuration, and the default elsewhere", () => {
      const files = {
        "package.json": manifestWith("vitest"),
        "packages/cart/package.json": manifestWith(),
        "packages/cart/vitest.config.ts": codeOf("export default defineConfig({ test: { include: [\"checks/**/*.ts\"] } })"),
        "packages/users/package.json": manifestWith(),
      }
      const candidates = ["packages/cart/checks/total.ts", "packages/cart/src/total.test.ts", "packages/users/src/name.test.ts", "src/app.test.ts"]

      expect(testsOf(files, candidates)).toStrictEqual(["packages/cart/checks/total.ts", "packages/users/src/name.test.ts", "src/app.test.ts"])
    })
  })

  describe("Jest", () => {
    it("uses its default testMatch, which takes __tests__ folders too", () => {
      expect(testsOf({ "package.json": manifestWith("jest") })).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "src/__tests__/cart.ts", "e2e/checkout.spec.ts"])
    })

    it("reads testMatch from the jest key of package.json", () => {
      const manifest = JSON.stringify({ devDependencies: { jest: "29.7.0" }, jest: { testMatch: ["**/*.check.ts"] } })

      expect(testsOf({ "package.json": manifest })).toStrictEqual(["tests/cart.check.ts"])
    })

    it("reads testRegex in place of the default testMatch", () => {
      const files = { "package.json": manifestWith("jest"), "jest.config.js": codeOf("module.exports = { testRegex: \"/e2e/.*\\\\.spec\\\\.ts$\" }") }

      expect(testsOf(files)).toStrictEqual(["e2e/checkout.spec.ts"])
    })

    it("scopes the default testMatch to its roots", () => {
      const files = { "package.json": manifestWith("jest"), "jest.config.ts": codeOf("export default { roots: [\"<rootDir>/src\"] }") }

      expect(testsOf(files)).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "src/__tests__/cart.ts"])
    })

    it("falls back to its default when testMatch is computed", () => {
      const files = { "package.json": manifestWith("jest"), "jest.config.js": codeOf("module.exports = { testMatch: patterns.map(toGlob) }") }

      expect(testsOf(files)).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "src/__tests__/cart.ts", "e2e/checkout.spec.ts"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/web/package.json": manifestWith("jest"),
        "apps/web/jest.config.js": codeOf("module.exports = { testMatch: [\"**/*.check.ts\"] }"),
        "apps/api/package.json": manifestWith("jest"),
      }
      const candidates = ["apps/web/src/total.check.ts", "apps/web/src/total.test.ts", "apps/api/src/order.test.ts"]

      expect(testsOf(files, candidates)).toStrictEqual(["apps/web/src/total.check.ts", "apps/api/src/order.test.ts"])
    })
  })

  describe("Playwright", () => {
    it("matches its default testMatch below the folder of its configuration", () => {
      const files = { "package.json": manifestWith("@playwright/test"), "playwright.config.ts": codeOf("export default defineConfig({ retries: 2 })") }

      expect(testsOf(files)).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "e2e/checkout.spec.ts"])
    })

    it("reads testDir when the configuration moves the tests", () => {
      const files = { "package.json": manifestWith("@playwright/test"), "playwright.config.ts": codeOf("export default defineConfig({ testDir: \"./e2e\" })") }

      expect(testsOf(files)).toStrictEqual(["e2e/checkout.spec.ts"])
    })

    it("falls back to its default when testDir is computed", () => {
      const files = { "package.json": manifestWith("@playwright/test"), "playwright.config.ts": codeOf("export default defineConfig({ testDir: path.join(__dirname, \"e2e\") })") }

      expect(testsOf(files)).toStrictEqual(["src/cart.test.ts", "src/cart.spec.tsx", "e2e/checkout.spec.ts"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/web/package.json": manifestWith("@playwright/test"),
        "apps/web/playwright.config.ts": codeOf("export default defineConfig({ testDir: \"./flows\" })"),
        "apps/admin/package.json": manifestWith("@playwright/test"),
        "apps/admin/playwright.config.ts": codeOf("export default defineConfig({})"),
      }
      const candidates = ["apps/web/flows/login.spec.ts", "apps/web/src/login.spec.ts", "apps/admin/src/login.spec.ts"]

      expect(testsOf(files, candidates)).toStrictEqual(["apps/web/flows/login.spec.ts", "apps/admin/src/login.spec.ts"])
    })
  })

  describe("Cypress", () => {
    it("uses its default e2e spec pattern, and its component one only when component testing is configured", () => {
      const component = { "package.json": manifestWith("cypress"), "cypress.config.ts": codeOf("export default defineConfig({ component: { devServer: { framework: \"react\" } } })") }

      expect(testsOf({ "package.json": manifestWith("cypress") })).toStrictEqual(["cypress/e2e/checkout.cy.ts"])
      expect(testsOf(component, ["src/Button.cy.tsx", "src/Button.tsx"])).toStrictEqual(["src/Button.cy.tsx"])
    })

    it("reads e2e.specPattern when the configuration moves the specs", () => {
      const files = { "package.json": manifestWith("cypress"), "cypress.config.ts": codeOf("export default defineConfig({ e2e: { specPattern: \"e2e/**/*.spec.ts\" } })") }

      expect(testsOf(files)).toStrictEqual(["e2e/checkout.spec.ts"])
    })

    it("falls back to its default when specPattern is computed", () => {
      const files = { "package.json": manifestWith("cypress"), "cypress.config.ts": codeOf("export default defineConfig({ e2e: { specPattern: specs() } })") }

      expect(testsOf(files)).toStrictEqual(["cypress/e2e/checkout.cy.ts"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "apps/web/package.json": manifestWith("cypress"),
        "apps/web/cypress.config.ts": codeOf("export default defineConfig({ e2e: { specPattern: \"flows/**/*.ts\" } })"),
        "apps/shop/package.json": manifestWith("cypress"),
      }
      const candidates = ["apps/web/flows/login.ts", "apps/web/cypress/e2e/login.cy.ts", "apps/shop/cypress/e2e/cart.cy.ts"]

      expect(testsOf(files, candidates)).toStrictEqual(["apps/web/flows/login.ts", "apps/shop/cypress/e2e/cart.cy.ts"])
    })
  })

  describe("Storybook", () => {
    it("reads stories relative to the .storybook folder", () => {
      const files = { "package.json": manifestWith("storybook"), ".storybook/main.ts": codeOf("export default { stories: [\"../src/**/*.stories.tsx\"] }") }

      expect(testsOf(files)).toStrictEqual(["src/Button.stories.tsx"])
    })

    it("falls back to every story when stories is computed or silent", () => {
      const computed = { "package.json": manifestWith("storybook"), ".storybook/main.ts": codeOf("export default { stories: findStories() }") }
      const silent = { "package.json": manifestWith("storybook"), ".storybook/main.ts": codeOf("export default { addons: [] }") }

      expect(testsOf(computed)).toStrictEqual(["src/Button.stories.tsx", "stories/Button.stories.tsx"])
      expect(testsOf(silent)).toStrictEqual(["src/Button.stories.tsx", "stories/Button.stories.tsx"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "packages/ui/package.json": manifestWith("storybook"),
        "packages/ui/.storybook/main.ts": codeOf("export default { stories: [\"../components/**/*.stories.tsx\"] }"),
        "packages/forms/package.json": manifestWith("storybook"),
        "packages/forms/.storybook/main.ts": codeOf("export default { stories: [\"../src/**/*.stories.tsx\"] }"),
      }
      const candidates = ["packages/ui/components/Button.stories.tsx", "packages/ui/src/Button.stories.tsx", "packages/forms/src/Input.stories.tsx"]

      expect(testsOf(files, candidates)).toStrictEqual(["packages/ui/components/Button.stories.tsx", "packages/forms/src/Input.stories.tsx"])
    })
  })

  describe("pytest", () => {
    const pythonCandidates: readonly string[] = ["tests/test_orders.py", "orders/orders_test.py", "tests/conftest.py", "checks/check_orders.py", "orders/latest.py", "tests/test_users.py"]

    it("uses its default python_files and conftest.py when no configuration file is there", () => {
      expect(testsOf({ "requirements-dev.txt": requirementsWith("pytest") }, pythonCandidates)).toStrictEqual([
        "tests/test_orders.py",
        "orders/orders_test.py",
        "tests/conftest.py",
        "tests/test_users.py",
      ])
    })

    it("reads testpaths and python_files from pyproject.toml", () => {
      const pyproject = codeOf("[project]", "dependencies = [\"pytest>=8\"]", "", "[tool.pytest.ini_options]", "testpaths = [\"checks\"]", "python_files = [\"check_*.py\"]")

      expect(testsOf({ "pyproject.toml": pyproject }, pythonCandidates)).toStrictEqual(["tests/conftest.py", "checks/check_orders.py"])
    })

    it("reads space separated values from pytest.ini, and keeps the default it is silent on", () => {
      const files = { "requirements.txt": requirementsWith("pytest"), "pytest.ini": codeOf("[pytest]", "testpaths = tests checks") }

      expect(testsOf(files, pythonCandidates)).toStrictEqual(["tests/test_orders.py", "tests/conftest.py", "tests/test_users.py"])
    })

    it("reads the tool:pytest section of setup.cfg", () => {
      const files = { "requirements.txt": requirementsWith("pytest"), "setup.cfg": codeOf("[metadata]", "name = shop", "", "[tool:pytest]", "python_files =", "    check_*.py") }

      expect(testsOf(files, pythonCandidates)).toStrictEqual(["tests/conftest.py", "checks/check_orders.py"])
    })

    it("reads each package of a monorepo with its own configuration", () => {
      const files = {
        "services/orders/pyproject.toml": codeOf("[project]", "dependencies = [\"pytest\"]", "[tool.pytest.ini_options]", "testpaths = [\"checks\"]"),
        "services/users/requirements.txt": requirementsWith("pytest"),
      }
      const candidates = ["services/orders/checks/test_total.py", "services/orders/app/test_total.py", "services/users/app/test_name.py"]

      expect(testsOf(files, candidates)).toStrictEqual(["services/orders/checks/test_total.py", "services/users/app/test_name.py"])
    })
  })

  describe("Django", () => {
    it("takes the default pattern of its test runner", () => {
      expect(testsOf({ "requirements.txt": requirementsWith("django") }, ["orders/tests.py", "orders/test_views.py", "orders/views.py"])).toStrictEqual([
        "orders/tests.py",
        "orders/test_views.py",
      ])
    })
  })
})
