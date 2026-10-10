import type { CatalogueLibrary } from "@/catalogue/types"

export const dexieJsLibrary: CatalogueLibrary = {
  name: "Dexie.js",
  specifiers: ["dexie"],
  documentedVersion: "4.4",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      makes: "storage",
      methods: [
        { kind: "call", name: "version", slots: [], makes: "storage" },
        { kind: "call", name: "transaction", slots: [{ at: "last", runs: "in-place" }], makes: "transaction" },
      ],
    },
    { kind: "call", name: "liveQuery", slots: [{ at: 0, runs: "effect" }], makes: "storage" },
  ],
}

export const idbKeyvalLibrary: CatalogueLibrary = {
  name: "idb-keyval",
  specifiers: ["idb-keyval"],
  documentedVersion: "6.3",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "get", slots: [], makes: "storage" },
    { kind: "call", name: "set", slots: [], makes: "storage" },
    { kind: "call", name: "del", slots: [], makes: "storage" },
    { kind: "call", name: "clear", slots: [], makes: "storage" },
    { kind: "call", name: "getMany", slots: [], makes: "storage" },
    { kind: "call", name: "setMany", slots: [], makes: "storage" },
    { kind: "call", name: "update", slots: [{ at: 1, runs: "in-place" }], makes: "storage" },
  ],
}

export const immortaldbLibrary: CatalogueLibrary = {
  name: "ImmortalDB",
  specifiers: ["immortal-db"],
  documentedVersion: "1.1",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "ImmortalDB.set", slots: [], makes: "storage" },
    { kind: "call", name: "ImmortalDB.get", slots: [], makes: "storage" },
    { kind: "call", name: "ImmortalDB.remove", slots: [], makes: "storage" },
  ],
}

export const localforageLibrary: CatalogueLibrary = {
  name: "LocalForage",
  specifiers: ["localforage"],
  documentedVersion: "1.10",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.getItem", slots: [], makes: "storage" },
    { kind: "call", name: "default.setItem", slots: [], makes: "storage" },
    { kind: "call", name: "default.removeItem", slots: [], makes: "storage" },
    { kind: "call", name: "default.keys", slots: [], makes: "storage" },
    { kind: "call", name: "default.iterate", slots: [{ at: 0, runs: "in-place" }], makes: "storage" },
  ],
}

export const lokijsLibrary: CatalogueLibrary = {
  name: "LokiJS",
  specifiers: ["lokijs"],
  documentedVersion: "1.5",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      makes: "storage",
      methods: [
        {
          kind: "factory",
          name: "addCollection",
          makes: "storage",
          methods: [
            { kind: "call", name: "insert", slots: [], makes: "storage" },
            { kind: "call", name: "find", slots: [], makes: "storage" },
          ],
        },
      ],
    },
  ],
}

export const reduxPersistLibrary: CatalogueLibrary = {
  name: "Redux Persist",
  specifiers: ["redux-persist"],
  documentedVersion: "6.0",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "persistReducer", slots: [{ at: 1, runs: "kept" }], makes: "storage" },
    { kind: "call", name: "persistStore", slots: [], makes: "storage" },
  ],
}

export const remotestorageJsLibrary: CatalogueLibrary = {
  name: "remoteStorage.js",
  specifiers: ["remotestoragejs"],
  documentedVersion: "2.0",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      makes: "storage",
      methods: [
        { kind: "call", name: "claim", slots: [], makes: "auth" },
        {
          kind: "factory",
          name: "scope",
          makes: "storage",
          methods: [
            { kind: "call", name: "getListing", slots: [], makes: "storage" },
            { kind: "call", name: "storeFile", slots: [], makes: "storage" },
            { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
          ],
        },
      ],
    },
  ],
}

export const rxdbLibrary: CatalogueLibrary = {
  name: "RxDB",
  specifiers: ["rxdb"],
  documentedVersion: "17.6",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createRxDatabase",
      makes: "storage",
      methods: [
        { kind: "call", name: "addCollections", slots: [], makes: "storage" },
        { kind: "call", name: "find", slots: [], makes: "storage" },
        { kind: "call", name: "findOne", slots: [], makes: "storage" },
        { kind: "call", name: "insert", slots: [], makes: "storage" },
        { kind: "call", name: "subscribe", slots: [{ at: 0, runs: "event" }] },
      ],
    },
  ],
}

export const storeJsLibrary: CatalogueLibrary = {
  name: "store.js",
  specifiers: ["store"],
  documentedVersion: "2.0",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.set", slots: [], makes: "storage" },
    { kind: "call", name: "default.get", slots: [], makes: "storage" },
    { kind: "call", name: "default.remove", slots: [], makes: "storage" },
    { kind: "call", name: "default.clearAll", slots: [], makes: "storage" },
    { kind: "call", name: "default.each", slots: [{ at: 0, runs: "in-place" }], makes: "storage" },
  ],
}

export const watermelondbLibrary: CatalogueLibrary = {
  name: "WatermelonDB",
  specifiers: ["@nozbe/watermelondb"],
  documentedVersion: "0.28",
  category: "browser-storage",
  type: "frontend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "Database", methods: [{ kind: "call", name: "get", slots: [], makes: "storage" }] },
  ],
}
