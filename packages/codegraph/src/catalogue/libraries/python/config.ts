import type { CatalogueLibrary } from "@/catalogue/types"

export const configobjLibrary: CatalogueLibrary = {
  name: "ConfigObj",
  specifiers: ["configobj"],
  documentedVersion: "5.0",
  category: "config",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "ConfigObj",
      makes: "config",
      methods: [
        { kind: "call", name: "validate", slots: [], makes: "config" },
        { kind: "call", name: "write", slots: [], makes: "config" },
      ],
    },
  ],
}

export const hydraLibrary: CatalogueLibrary = {
  name: "Hydra",
  specifiers: ["hydra"],
  documentedVersion: "1.3",
  category: "config",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "main", runs: "command", makes: "config" },
    { kind: "call", name: "compose", slots: [], makes: "config" },
    { kind: "call", name: "initialize", slots: [], makes: "config" },
  ],
}

export const profigLibrary: CatalogueLibrary = {
  name: "profig",
  specifiers: ["profig"],
  documentedVersion: "0.5",
  category: "config",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Config",
      makes: "config",
      methods: [
        { kind: "call", name: "init", slots: [], makes: "config" },
        { kind: "call", name: "sync", slots: [], makes: "config" },
      ],
    },
  ],
}

export const pythonDecoupleLibrary: CatalogueLibrary = {
  name: "python-decouple",
  specifiers: ["decouple"],
  documentedVersion: "3.8",
  category: "config",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "config", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "Config",
      methods: [],
      called: {
        slots: [],
        makes: "config",
      },
    },
  ],
}
