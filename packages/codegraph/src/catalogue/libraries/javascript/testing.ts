import type { CatalogueLibrary } from "@/catalogue/types"

export const vitestLibrary: CatalogueLibrary = {
  name: "Vitest",
  specifiers: ["vitest"],
  documentedVersion: "4.1.6",
  category: "testing",
  type: "fullstack",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "test",
      files: [{ glob: "vitest.config.*" }, { glob: "vite.config.*" }],
      keys: [{ key: "test.include", holds: "globs", default: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"] }],
    },
  ],
}

export const jestLibrary: CatalogueLibrary = {
  name: "Jest",
  specifiers: ["jest"],
  documentedVersion: "29.7.0",
  category: "testing",
  type: "fullstack",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "test",
      files: [{ glob: "jest.config.*" }, { glob: "package.json", under: "jest" }],
      keys: [
        { key: "roots", holds: "folders", isScope: true },
        { key: "testMatch", holds: "globs", default: ["**/__tests__/**/*.?([mc])[jt]s?(x)", "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"], unlessRead: "testRegex" },
        { key: "testRegex", holds: "regex" },
      ],
    },
  ],
}

export const playwrightLibrary: CatalogueLibrary = {
  name: "Playwright",
  specifiers: ["@playwright/test"],
  documentedVersion: "1.58.2",
  category: "testing",
  type: "fullstack",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "test",
      files: [{ glob: "playwright.config.*" }],
      keys: [
        { key: "testDir", holds: "folders", isScope: true },
        { key: "testMatch", holds: "globs", default: ["**/*.@(spec|test).?(c|m)[jt]s?(x)"] },
      ],
    },
  ],
}

export const cypressLibrary: CatalogueLibrary = {
  name: "Cypress",
  specifiers: ["cypress"],
  documentedVersion: "13.0.0",
  category: "testing",
  type: "fullstack",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "test",
      files: [{ glob: "cypress.config.*" }],
      keys: [
        { key: "e2e.specPattern", holds: "globs", default: ["cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"] },
        { key: "component.specPattern", holds: "globs", default: ["**/*.cy.{js,jsx,ts,tsx}"], defaultWhen: "component" },
      ],
    },
  ],
}

export const storybookLibrary: CatalogueLibrary = {
  name: "Storybook",
  specifiers: ["storybook", "@storybook/react", "@storybook/react-vite", "@storybook/nextjs", "@storybook/vue3", "@storybook/vue3-vite"],
  documentedVersion: "9.0.0",
  category: "testing",
  type: "frontend",
  language: "javascript",
  patterns: [],
  locations: [
    {
      classification: "test",
      files: [{ glob: ".storybook/main.*" }],
      keys: [{ key: "stories", holds: "globs", default: ["../**/*.stories.@(js|jsx|mjs|ts|tsx)", "../**/*.mdx"] }],
    },
  ],
}
