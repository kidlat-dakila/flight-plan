import type { CatalogueLibrary, MethodPattern, Slot } from "@/catalogue/types"

const PROCESS_EXECUTION = "process-execution"

const PEXPECT_CHILD_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "expect", slots: [], classifies: PROCESS_EXECUTION },
  { kind: "call", name: "expect_exact", slots: [], classifies: PROCESS_EXECUTION },
  { kind: "call", name: "send", slots: [], classifies: PROCESS_EXECUTION },
  { kind: "call", name: "sendline", slots: [], classifies: PROCESS_EXECUTION },
]

const SARGE_RUN_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "run", slots: [], classifies: PROCESS_EXECUTION },
]

const SH_CALLBACK_SLOTS: readonly Slot[] = [
  { at: "_out", runs: "event" },
  { at: "_err", runs: "event" },
  { at: "_done", runs: "event" },
]

export const delegatorPyLibrary: CatalogueLibrary = {
  name: "delegator.py",
  specifiers: ["delegator"],
  documentedVersion: "0.1",
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "run", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "chain", slots: [], classifies: PROCESS_EXECUTION },
  ],
}

export const pexpectLibrary: CatalogueLibrary = {
  name: "Pexpect",
  specifiers: ["pexpect", "pexpect.popen_spawn"],
  documentedVersion: "4.9",
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "spawn", classifies: PROCESS_EXECUTION, methods: [...PEXPECT_CHILD_METHODS, { kind: "call", name: "interact", slots: [], classifies: PROCESS_EXECUTION }] },
    { kind: "factory", name: "PopenSpawn", classifies: PROCESS_EXECUTION, methods: PEXPECT_CHILD_METHODS },
    { kind: "call", name: "run", slots: [], classifies: PROCESS_EXECUTION },
  ],
}

export const plumbumLibrary: CatalogueLibrary = {
  name: "Plumbum",
  specifiers: ["plumbum", "plumbum.cmd"],
  documentedVersion: "2.0",
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "local", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "*", from: "plumbum.cmd", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "factory", name: "SshMachine", methods: [], called: { slots: [], classifies: PROCESS_EXECUTION } },
  ],
}

export const sargeLibrary: CatalogueLibrary = {
  name: "sarge",
  specifiers: ["sarge"],
  documentedVersion: "0.1",
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "run", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "capture_stdout", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "get_stdout", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "capture_stderr", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "get_stderr", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "capture_both", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "call", name: "get_both", slots: [], classifies: PROCESS_EXECUTION },
    { kind: "factory", name: "Command", methods: SARGE_RUN_METHODS },
    { kind: "factory", name: "Pipeline", methods: SARGE_RUN_METHODS },
  ],
}

export const shLibrary: CatalogueLibrary = {
  name: "sh",
  specifiers: ["sh"],
  documentedVersion: "2.4",
  category: "processes",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "Command", methods: [], called: { slots: SH_CALLBACK_SLOTS, classifies: PROCESS_EXECUTION } },
    { kind: "call", name: "*", slots: SH_CALLBACK_SLOTS, classifies: PROCESS_EXECUTION },
  ],
}
