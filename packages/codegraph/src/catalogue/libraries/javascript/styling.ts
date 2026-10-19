import type { CallPattern, CatalogueLibrary } from "@/catalogue/types"

const STYLED_DEFAULT_ELEMENT: CallPattern = { kind: "call", name: "default.*", slots: [], classifies: "styling" }

const LINARIA_STYLED_ELEMENT: CallPattern = { kind: "call", name: "styled.*", slots: [], classifies: "styling" }

export const styledComponentsLibrary: CatalogueLibrary = {
  name: "styled-components",
  specifiers: ["styled-components"],
  documentedVersion: "6.6",
  category: "styling",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [],
      called: { slots: [], classifies: "styling" },
    },
    STYLED_DEFAULT_ELEMENT,
    { kind: "call", name: "css", slots: [], classifies: "styling" },
    { kind: "call", name: "keyframes", slots: [], classifies: "styling" },
    { kind: "call", name: "createGlobalStyle", slots: [], classifies: "styling" },
    { kind: "element", name: "ThemeProvider", slots: [], classifies: "styling" },
  ],
}

export const emotionLibrary: CatalogueLibrary = {
  name: "Emotion",
  specifiers: ["@emotion/styled", "@emotion/react", "@emotion/css"],
  documentedVersion: "11.14",
  category: "styling",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      from: "@emotion/styled",
      methods: [],
      called: { slots: [], classifies: "styling" },
    },
    STYLED_DEFAULT_ELEMENT,
    { kind: "call", name: "css", slots: [], classifies: "styling" },
    { kind: "call", name: "keyframes", slots: [], classifies: "styling" },
    { kind: "call", name: "cx", slots: [], classifies: "styling" },
    { kind: "call", name: "injectGlobal", slots: [], classifies: "styling" },
    { kind: "element", name: "Global", slots: [], classifies: "styling" },
    { kind: "element", name: "ThemeProvider", slots: [], classifies: "styling" },
  ],
}

export const linariaLibrary: CatalogueLibrary = {
  name: "Linaria",
  specifiers: ["@linaria/core", "@linaria/react"],
  documentedVersion: "8.2",
  category: "styling",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "styled",
      methods: [],
      called: { slots: [], classifies: "styling" },
    },
    LINARIA_STYLED_ELEMENT,
    { kind: "call", name: "css", slots: [], classifies: "styling" },
    { kind: "call", name: "cx", slots: [], classifies: "styling" },
  ],
}

export const vanillaExtractLibrary: CatalogueLibrary = {
  name: "vanilla-extract",
  specifiers: ["@vanilla-extract/css", "@vanilla-extract/recipes"],
  documentedVersion: "1.21",
  category: "styling",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "style", slots: [], classifies: "styling" },
    { kind: "call", name: "styleVariants", slots: [], classifies: "styling" },
    { kind: "call", name: "globalStyle", slots: [], classifies: "styling" },
    { kind: "call", name: "keyframes", slots: [], classifies: "styling" },
    { kind: "call", name: "createTheme", slots: [], classifies: "styling" },
    { kind: "call", name: "createGlobalTheme", slots: [], classifies: "styling" },
    { kind: "call", name: "createThemeContract", slots: [], classifies: "styling" },
    { kind: "call", name: "recipe", slots: [], classifies: "styling" },
  ],
}

export const stylexLibrary: CatalogueLibrary = {
  name: "StyleX",
  specifiers: ["@stylexjs/stylex"],
  documentedVersion: "0.19",
  category: "styling",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "create", slots: [], classifies: "styling" },
    { kind: "call", name: "props", slots: [], classifies: "styling" },
    { kind: "call", name: "defineVars", slots: [], classifies: "styling" },
    { kind: "call", name: "createTheme", slots: [], classifies: "styling" },
    { kind: "call", name: "keyframes", slots: [], classifies: "styling" },
  ],
}
