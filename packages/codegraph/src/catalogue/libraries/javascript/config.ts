import type { CatalogueLibrary } from "@/catalogue/types"

const THIRD_ARGUMENT = 2

export const arkenvLibrary: CatalogueLibrary = {
  name: "ArkEnv",
  specifiers: ["arkenv"],
  documentedVersion: "1.0",
  category: "config",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "config" },
  ],
}

export const c12Library: CatalogueLibrary = {
  name: "c12",
  specifiers: ["c12"],
  documentedVersion: "4.0",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "loadConfig", slots: [], makes: "config" },
    { kind: "call", name: "watchConfig", slots: [{ at: "onUpdate", runs: "event" }], makes: "config" },
  ],
}

export const convictLibrary: CatalogueLibrary = {
  name: "Convict",
  specifiers: ["convict"],
  documentedVersion: "6.2",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "config" },
        { kind: "call", name: "loadFile", slots: [], makes: "config" },
        { kind: "call", name: "validate", slots: [], makes: "config" },
      ],
    },
  ],
}

export const dotenvLibrary: CatalogueLibrary = {
  name: "Dotenv",
  specifiers: ["dotenv"],
  documentedVersion: "18.0",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.config", slots: [], makes: "config" },
    { kind: "call", name: "default.parse", slots: [], makes: "config" },
    { kind: "call", name: "default.populate", slots: [], makes: "config" },
  ],
}

export const dotenvFlowLibrary: CatalogueLibrary = {
  name: "dotenv-flow",
  specifiers: ["dotenv-flow"],
  documentedVersion: "4.1",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.config", slots: [], makes: "config" },
    { kind: "call", name: "default.load", slots: [], makes: "config" },
  ],
}

export const dotenvxLibrary: CatalogueLibrary = {
  name: "dotenvx",
  specifiers: ["@dotenvx/dotenvx"],
  documentedVersion: "2.34",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.config", slots: [], makes: "config" },
    { kind: "call", name: "default.set", slots: [], makes: "config" },
  ],
}

export const envalidLibrary: CatalogueLibrary = {
  name: "Envalid",
  specifiers: ["envalid"],
  documentedVersion: "8.2",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "cleanEnv", slots: [], makes: "config" },
    { kind: "call", name: "customCleanEnv", slots: [{ at: THIRD_ARGUMENT, runs: "in-place" }], makes: "config" },
  ],
}

export const nconfLibrary: CatalogueLibrary = {
  name: "nconf",
  specifiers: ["nconf"],
  documentedVersion: "0.13",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.get", slots: [], makes: "config" },
    { kind: "call", name: "default.set", slots: [], makes: "config" },
    { kind: "call", name: "default.file", slots: [], makes: "config" },
    { kind: "call", name: "default.env", slots: [], makes: "config" },
    { kind: "call", name: "default.argv", slots: [], makes: "config" },
    { kind: "call", name: "default.defaults", slots: [], makes: "config" },
    { kind: "call", name: "default.required", slots: [], makes: "config" },
  ],
}

export const nodeConfigLibrary: CatalogueLibrary = {
  name: "node-config",
  specifiers: ["config"],
  documentedVersion: "5.0",
  category: "config",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.get", slots: [], makes: "config" },
    { kind: "call", name: "default.has", slots: [], makes: "config" },
  ],
}

export const t3EnvLibrary: CatalogueLibrary = {
  name: "T3 Env",
  specifiers: ["@t3-oss/env-core", "@t3-oss/env-nextjs"],
  documentedVersion: "0.13",
  category: "config",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createEnv", slots: [], makes: "config" },
  ],
}
