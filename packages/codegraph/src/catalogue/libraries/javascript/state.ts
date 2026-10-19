import type { CatalogueLibrary } from "@/catalogue/types"

export const jotaiLibrary: CatalogueLibrary = {
  name: "Jotai",
  specifiers: ["jotai", "jotai/utils"],
  documentedVersion: "3.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "atom", slots: [{ at: 0, runs: "in-place" }, { at: 1, runs: "kept" }], makes: "state" },
    { kind: "call", name: "useAtom", slots: [], makes: "state" },
    { kind: "call", name: "atomWithStorage", slots: [], makes: "storage" },
  ],
}

export const tinybaseLibrary: CatalogueLibrary = {
  name: "TinyBase",
  specifiers: ["tinybase", "tinybase/ui-react"],
  documentedVersion: "10.0",
  category: "state",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createStore",
      makes: "state",
      methods: [
        { kind: "call", name: "setCell", slots: [], makes: "state" },
        { kind: "call", name: "getCell", slots: [], makes: "state" },
        { kind: "call", name: "setRow", slots: [], makes: "state" },
        { kind: "call", name: "getRow", slots: [], makes: "state" },
        { kind: "call", name: "setTable", slots: [], makes: "state" },
        { kind: "call", name: "addTableListener", slots: [{ at: 1, runs: "event" }] },
      ],
    },
    { kind: "call", name: "useCell", slots: [], makes: "state" },
  ],
}
