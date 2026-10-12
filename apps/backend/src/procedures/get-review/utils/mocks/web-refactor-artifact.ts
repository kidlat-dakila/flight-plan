import { parseMarkedSource } from "@flightplan/codegraph"
import type { ReviewArtifact, SourceFile } from "@flightplan/configurations"
import { mockJourney } from "./mock-journey"

const SERVER_CONFIG_PATH = "apps/backend/src/config.ts"
const SERVER_MAIN_PATH = "apps/backend/src/main.ts"

const SERVER_CONFIG = [
  " const DEFAULT_HOST = \"localhost\"",
  " const DEFAULT_PORT = 3000",
  " ",
  "#region readServerConfig",
  "-export const readServerConfig = (): ServerConfig => ({",
  "-  host: process.env.HOST ?? DEFAULT_HOST,",
  "-  port: Number(process.env.PORT) || DEFAULT_PORT,",
  "+export const readServerConfig = (environment: Environment): ServerConfig => ({",
  "+  host: environment.HOST ?? DEFAULT_HOST,",
  "+  port: parsePort(environment.PORT),",
  " })",
  "#endregion readServerConfig",
].join("\n")

const SERVER_MAIN = [
  " import { readServerConfig } from \"./config\"",
  " import { buildServer } from \"./server\"",
  " ",
  "#region start",
  " const start = async (): Promise<void> => {",
  "-  const { host, port } = readServerConfig()",
  "+  const { host, port } = readServerConfig(process.env)",
  "   const server = await buildServer({ logger: true })",
  "   await server.listen({ host, port })",
  " }",
  "#endregion start",
].join("\n")

const WEB_REFACTOR_SOURCES: readonly SourceFile[] = [
  parseMarkedSource(SERVER_CONFIG_PATH, "typescript", SERVER_CONFIG),
  parseMarkedSource(SERVER_MAIN_PATH, "typescript", SERVER_MAIN),
]

export const WEB_REFACTOR_ARTIFACT: ReviewArtifact = {
  title: "refactor-to-full-web",
  status: "complete",
  commit: "f80a472",
  isSegmented: false,
  segments: [
    {
      id: "all",
      title: "refactor-to-full-web",
      changedPaths: [SERVER_CONFIG_PATH, SERVER_MAIN_PATH],
      context: [
        "The server read its settings from the environment in the middle of a function, which made the function impossible to test without changing the process. The settings are now passed in.",
        "",
        "## Overview",
        "",
        "- **When** the server starts with `PORT` set to something that is not a number, **then** it refuses to start and names the bad value, where it used to fall back to port 3000 silently.",
        "",
        "## Implementation",
        "",
        "**`apps/backend/src`**",
        "",
        "- Makes [`readServerConfig()`](code:apps/backend/src/config.ts#readServerConfig) take the environment as a parameter.",
        "- Passes `process.env` from [`start()`](code:apps/backend/src/main.ts#start).",
      ].join("\n"),
      journey: mockJourney(
        WEB_REFACTOR_SOURCES,
        [
          { id: "start", type: "function", path: SERVER_MAIN_PATH, declaration: "start", isChanged: true, label: "Read settings, build, listen", description: "The only place that reads the environment." },
          { id: "read-server-config", type: "function", path: SERVER_CONFIG_PATH, declaration: "readServerConfig", isChanged: true, label: "Parse the server settings", description: "A pure function from the environment to the host and the port." },
        ],
        [
          ["start", "read-server-config"],
        ],
      ),
      blast: null,
      walkthrough: {
        intro: "The tour reads the parser first, then the one place that calls it.",
        files: [
          {
            path: SERVER_CONFIG_PATH,
            title: "The settings parser takes its environment",
            summary: [
              "Makes [`readServerConfig()`](code:apps/backend/src/config.ts#readServerConfig) take the environment as a parameter.",
            ],
            waypoints: [
              {
                id: "read-server-config",
                title: "The settings parser no longer reads the process",
                declaration: "readServerConfig",
                codeBlocks: [],
                reading: "With the environment as a parameter, a test can pass any values it wants. The port now goes through `parsePort`, which rejects a value that is not a positive integer.",
                needsAttention: null,
                findings: [],
                children: [],
              },
            ],
          },
          {
            path: SERVER_MAIN_PATH,
            title: "The shell passes the environment in",
            summary: ["Passes `process.env` from [`start()`](code:apps/backend/src/main.ts#start)."],
            waypoints: [
              {
                id: "start",
                title: "The shell hands the environment in",
                declaration: "start",
                codeBlocks: [],
                reading: "One argument is all that changes at the call site.",
                needsAttention: null,
                findings: [],
                children: [],
              },
            ],
          },
        ],
      },
    },
  ],
  sources: WEB_REFACTOR_SOURCES,
  changedPaths: [SERVER_CONFIG_PATH, SERVER_MAIN_PATH],
}
