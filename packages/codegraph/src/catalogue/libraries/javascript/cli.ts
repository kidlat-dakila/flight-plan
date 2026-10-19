import type { CatalogueLibrary, Slot } from "@/catalogue/types"

const THIRD_ARGUMENT = 2

const GLUEGUN_COMMAND_SLOTS: readonly Slot[] = [{ at: 0, runs: "command" }, { at: "0.run", runs: "command" }]

export const commanderJsLibrary: CatalogueLibrary = {
  name: "Commander.js",
  specifiers: ["commander"],
  documentedVersion: "15.0",
  category: "cli",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Command",
      methods: [
        { kind: "call", name: "command", slots: [], eventAt: 0 },
        { kind: "call", name: "action", slots: [{ at: 0, runs: "command" }] },
        { kind: "call", name: "parse", slots: [], makes: "config" },
      ],
    },
    { kind: "call", name: "program.action", slots: [{ at: 0, runs: "command" }] },
  ],
}

export const yargsLibrary: CatalogueLibrary = {
  name: "yargs",
  specifiers: ["yargs", "yargs/helpers"],
  documentedVersion: "18.2",
  category: "cli",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "command", slots: [{ at: "last", runs: "command" }, { at: THIRD_ARGUMENT, runs: "in-place" }], eventAt: 0 },
        { kind: "call", name: "middleware", slots: [{ at: 0, runs: "middleware" }] },
        { kind: "call", name: "parse", slots: [], makes: "config" },
      ],
    },
  ],
}

export const oclifLibrary: CatalogueLibrary = {
  name: "oclif",
  specifiers: ["@oclif/core"],
  documentedVersion: "5.1",
  category: "cli",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "class",
      name: "Command",
      members: [{ name: "run", runs: "command" }, { name: "init", runs: "in-place" }, { name: "catch", runs: "event" }],
      methods: [],
    },
  ],
}

export const meowLibrary: CatalogueLibrary = {
  name: "Meow",
  specifiers: ["meow"],
  documentedVersion: "14.1",
  category: "cli",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "config", classifies: "command" },
  ],
}

export const gluegunLibrary: CatalogueLibrary = {
  name: "Gluegun",
  specifiers: ["gluegun"],
  documentedVersion: "5.2",
  category: "cli",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "build",
      methods: [
        { kind: "call", name: "command", slots: [{ at: "0.run", runs: "command" }], eventAt: "0.name" },
        { kind: "call", name: "defaultCommand", slots: GLUEGUN_COMMAND_SLOTS },
        { kind: "call", name: "help", slots: GLUEGUN_COMMAND_SLOTS },
        { kind: "call", name: "version", slots: GLUEGUN_COMMAND_SLOTS },
      ],
    },
  ],
}
