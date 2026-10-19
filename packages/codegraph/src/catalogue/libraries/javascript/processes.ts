import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const FIRST_ARGUMENT = 0

const SECOND_ARGUMENT = 1

const PROCESS_EXECUTION = "process-execution"

const WORKER_POOL_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "run", slots: [], classifies: PROCESS_EXECUTION },
  { kind: "call", name: "on", slots: [{ at: SECOND_ARGUMENT, runs: "event" }], eventAt: FIRST_ARGUMENT },
]

export const execaLibrary: CatalogueLibrary = {
  name: "Execa",
  specifiers: ["execa"],
  documentedVersion: "10.2",
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "execa", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "execaSync", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "execaNode", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "execaCommand", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "execaCommandSync", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "$", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "$.sync", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "$.s", slots: [], classifies: PROCESS_EXECUTION },
  ],
}

export const piscinaLibrary: CatalogueLibrary = {
  name: "Piscina",
  specifiers: ["piscina"],
  documentedVersion: "5.3",
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "Piscina", methods: WORKER_POOL_METHODS },
    { kind: "factory", name: "default", methods: WORKER_POOL_METHODS },
  ],
}

export const tinypoolLibrary: CatalogueLibrary = {
  name: "Tinypool",
  specifiers: ["tinypool"],
  documentedVersion: "2.2",
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "Tinypool", methods: WORKER_POOL_METHODS },
    { kind: "factory", name: "default", methods: WORKER_POOL_METHODS },
  ],
}

export const workerpoolLibrary: CatalogueLibrary = {
  name: "Workerpool",
  specifiers: ["workerpool"],
  documentedVersion: "10.0",
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "pool",
      methods: [
        { kind: "call", name: "exec", slots: [{ at: "2.on", runs: "event" }], classifies: PROCESS_EXECUTION },
        { kind: "call", name: "proxy", slots: [], classifies: PROCESS_EXECUTION },
      ],
    },
    { kind: "call", name: "worker", slots: [{ at: "0.*", runs: "job" }], classifies: PROCESS_EXECUTION },
  ],
}

export const zxLibrary: CatalogueLibrary = {
  name: "zx",
  specifiers: ["zx"],
  documentedVersion: "8.8",
  category: "processes",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "$", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "$.sync", slots: [], classifies: PROCESS_EXECUTION },
  ],
}
