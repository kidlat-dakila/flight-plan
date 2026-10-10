import type { CatalogueLibrary } from "@/catalogue/types"

export const apicacheLibrary: CatalogueLibrary = {
  name: "apicache",
  specifiers: ["apicache"],
  documentedVersion: "1.6",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.middleware", slots: [], makes: "cache" },
    { kind: "call", name: "default.clear", slots: [], makes: "cache" },
  ],
}

export const bentocacheLibrary: CatalogueLibrary = {
  name: "Bentocache",
  specifiers: ["bentocache"],
  documentedVersion: "1.6",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "BentoCache",
      methods: [
        { kind: "call", name: "getOrSet", slots: [{ at: "factory", runs: "in-place" }], makes: "cache" },
        { kind: "call", name: "get", slots: [], makes: "cache" },
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "deleteByTag", slots: [], makes: "cache" },
        { kind: "call", name: "namespace", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const cacheableLibrary: CatalogueLibrary = {
  name: "Cacheable",
  specifiers: ["cacheable", "cache-manager"],
  documentedVersion: "2.5",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Cacheable",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "cache" },
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "getOrSet", slots: [{ at: 1, runs: "in-place" }], makes: "cache" },
        { kind: "call", name: "wrap", slots: [{ at: 0, runs: "kept" }], makes: "cache" },
      ],
    },
  ],
}

export const cachifiedLibrary: CatalogueLibrary = {
  name: "cachified",
  specifiers: ["@epic-web/cachified", "cachified"],
  documentedVersion: "4.0",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "cachified", slots: [{ at: "getFreshValue", runs: "in-place" }], makes: "cache" },
    { kind: "call", name: "softPurge", slots: [], makes: "cache" },
  ],
}

export const keyvLibrary: CatalogueLibrary = {
  name: "Keyv",
  specifiers: ["keyv"],
  documentedVersion: "6.1",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "cache" },
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "delete", slots: [], makes: "cache" },
        { kind: "call", name: "clear", slots: [], makes: "cache" },
        { kind: "call", name: "has", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const kvJsLibrary: CatalogueLibrary = {
  name: "KV.js",
  specifiers: ["@heyputer/kv.js"],
  documentedVersion: "0.2",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "get", slots: [], makes: "cache" },
        { kind: "call", name: "del", slots: [], makes: "cache" },
        { kind: "call", name: "expire", slots: [], makes: "cache" },
        { kind: "call", name: "incr", slots: [], makes: "cache" },
        { kind: "call", name: "exists", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const lruCacheLibrary: CatalogueLibrary = {
  name: "lru-cache",
  specifiers: ["lru-cache"],
  documentedVersion: "11.5",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "LRUCache",
      slots: [{ at: "fetchMethod", runs: "kept" }],
      methods: [
        { kind: "call", name: "set", slots: [], makes: "cache" },
        { kind: "call", name: "get", slots: [], makes: "cache" },
        { kind: "call", name: "fetch", slots: [], makes: "cache" },
      ],
    },
  ],
}

export const unstorageLibrary: CatalogueLibrary = {
  name: "Unstorage",
  specifiers: ["unstorage"],
  documentedVersion: "1.17",
  category: "caching",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createStorage",
      methods: [
        { kind: "call", name: "getItem", slots: [], makes: "cache" },
        { kind: "call", name: "setItem", slots: [], makes: "cache" },
        { kind: "call", name: "hasItem", slots: [], makes: "cache" },
        { kind: "call", name: "getKeys", slots: [], makes: "cache" },
        { kind: "call", name: "clear", slots: [], makes: "cache" },
      ],
    },
  ],
}
