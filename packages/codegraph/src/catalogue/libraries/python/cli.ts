import type { CatalogueLibrary } from "@/catalogue/types"

export const clickLibrary: CatalogueLibrary = {
  name: "Click",
  specifiers: ["click"],
  documentedVersion: "8.5",
  category: "cli",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "command", runs: "command" },
    { kind: "decorator", name: "option", makes: "config" },
    { kind: "decorator", name: "argument", makes: "config" },
    { kind: "call", name: "echo", slots: [], makes: "telemetry" },
  ],
}

export const cementLibrary: CatalogueLibrary = {
  name: "Cement",
  specifiers: ["cement"],
  documentedVersion: "3.0",
  category: "cli",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "ex", runs: "command" },
    {
      kind: "class",
      name: "App",
      makes: "config",
      members: [],
      methods: [],
    },
  ],
}

export const cliffLibrary: CatalogueLibrary = {
  name: "cliff",
  specifiers: ["cliff", "cliff.command", "cliff.app"],
  documentedVersion: "4.16",
  category: "cli",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Command",
      members: [{ name: "take_action", runs: "command" }, { name: "get_parser", runs: "in-place" }],
      methods: [],
    },
  ],
}

export const docoptLibrary: CatalogueLibrary = {
  name: "docopt",
  specifiers: ["docopt"],
  documentedVersion: "0.6",
  category: "cli",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "docopt", slots: [], makes: "config", classifies: "cli-command" },
  ],
}

export const pythonFireLibrary: CatalogueLibrary = {
  name: "Python Fire",
  specifiers: ["fire"],
  documentedVersion: "0.7",
  category: "cli",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "Fire", slots: [{ at: [0, "component"], runs: "command" }, { at: "0.*", runs: "command" }] },
  ],
}
