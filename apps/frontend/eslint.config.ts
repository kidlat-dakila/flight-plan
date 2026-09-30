import baseConfig, { defineProjectConfig, moduleBoundaries, react } from "../../eslint.base.config"

const BACKEND_ROUTER_IMPORT = String.raw`^@flightplan/backend/router$`

const BACKEND_ROUTER_TYPES_ONLY = {
  name: "@flightplan/backend/router",
  allowTypeImports: true,
  message: "The frontend imports only the AppRouter type from the backend, never a value.",
}

const BACKEND_ACCESS = {
  group: ["@tanstack/react-query", "@trpc/*", "**/trpc"],
  message: "Only route files talk to the backend. Components receive data and callbacks through props.",
}

export default defineProjectConfig(
  baseConfig,
  react,
  {
    rules: {
      "@nx/enforce-module-boundaries": ["error", moduleBoundaries([BACKEND_ROUTER_IMPORT])],
      "@typescript-eslint/no-restricted-imports": ["error", { paths: [BACKEND_ROUTER_TYPES_ONLY] }],
    },
  },
  {
    files: ["src/routes/**/-components/**"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { paths: [BACKEND_ROUTER_TYPES_ONLY], patterns: [BACKEND_ACCESS] },
      ],
    },
  },
  {
    files: ["src/routes/**"],
    ignores: ["src/routes/**/-components/**", "src/routes/**/__tests__/**"],
    rules: {
      "check-file/filename-naming-convention": "off",
    },
  },
)
