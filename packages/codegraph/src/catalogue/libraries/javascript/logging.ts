import type { CatalogueLibrary } from "@/catalogue/types"

export const analyticsLibrary: CatalogueLibrary = {
  name: "Analytics",
  specifiers: ["analytics"],
  documentedVersion: "0.8",
  category: "logging",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "track", slots: [], makes: "telemetry", eventAt: 0 },
        { kind: "call", name: "page", slots: [], makes: "telemetry" },
        { kind: "call", name: "identify", slots: [], makes: "telemetry" },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const consolaLibrary: CatalogueLibrary = {
  name: "Consola",
  specifiers: ["consola"],
  documentedVersion: "3.4",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "consola.info", slots: [], makes: "telemetry" },
    { kind: "call", name: "consola.start", slots: [], makes: "telemetry" },
    { kind: "call", name: "consola.warn", slots: [], makes: "telemetry" },
    { kind: "call", name: "consola.success", slots: [], makes: "telemetry" },
    { kind: "call", name: "consola.error", slots: [], makes: "telemetry" },
    {
      kind: "factory",
      name: "createConsola",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "error", slots: [], makes: "telemetry" },
        { kind: "call", name: "warn", slots: [], makes: "telemetry" },
      ],
    },
  ],
}

export const debugLibrary: CatalogueLibrary = {
  name: "Debug",
  specifiers: ["debug"],
  documentedVersion: "4.4",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "extend", slots: [], makes: "telemetry" },
      ],
      called: {
        slots: [],
        makes: "telemetry",
      },
    },
  ],
}

export const loglayerLibrary: CatalogueLibrary = {
  name: "LogLayer",
  specifiers: ["loglayer"],
  documentedVersion: "9.4",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "LogLayer",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "withError", slots: [], makes: "telemetry" },
      ],
    },
  ],
}

export const logtapeLibrary: CatalogueLibrary = {
  name: "LogTape",
  specifiers: ["@logtape/logtape"],
  documentedVersion: "2.4",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "configure", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "getLogger",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "error", slots: [], makes: "telemetry" },
        { kind: "call", name: "debug", slots: [], makes: "telemetry" },
        { kind: "call", name: "warn", slots: [], makes: "telemetry" },
      ],
    },
  ],
}

export const morganLibrary: CatalogueLibrary = {
  name: "Morgan",
  specifiers: ["morgan"],
  documentedVersion: "1.12",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "telemetry" },
    { kind: "call", name: "default.token", slots: [{ at: 1, runs: "kept" }] },
  ],
}

export const pinoLibrary: CatalogueLibrary = {
  name: "pino",
  specifiers: ["pino"],
  documentedVersion: "10.4",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "error", slots: [], makes: "telemetry" },
        { kind: "call", name: "warn", slots: [], makes: "telemetry" },
        { kind: "call", name: "debug", slots: [], makes: "telemetry" },
        { kind: "call", name: "fatal", slots: [], makes: "telemetry" },
        { kind: "call", name: "trace", slots: [], makes: "telemetry" },
      ],
    },
  ],
}

export const signaleLibrary: CatalogueLibrary = {
  name: "Signale",
  specifiers: ["signale"],
  documentedVersion: "1.4",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.success", slots: [], makes: "telemetry" },
    { kind: "call", name: "default.error", slots: [], makes: "telemetry" },
    { kind: "call", name: "default.log", slots: [], makes: "telemetry" },
    { kind: "call", name: "default.complete", slots: [], makes: "telemetry" },
  ],
}

export const tslogLibrary: CatalogueLibrary = {
  name: "tslog",
  specifiers: ["tslog"],
  documentedVersion: "5.2",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Logger",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "error", slots: [], makes: "telemetry" },
        { kind: "call", name: "debug", slots: [], makes: "telemetry" },
        { kind: "call", name: "warn", slots: [], makes: "telemetry" },
        { kind: "call", name: "attachTransport", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "getSubLogger", slots: [], makes: "telemetry" },
      ],
    },
  ],
}

export const winstonLibrary: CatalogueLibrary = {
  name: "Winston",
  specifiers: ["winston"],
  documentedVersion: "3.19",
  category: "logging",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createLogger",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "log", slots: [], makes: "telemetry" },
        { kind: "call", name: "add", slots: [], makes: "config" },
      ],
    },
  ],
}
