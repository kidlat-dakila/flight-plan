import type { CatalogueLibrary } from "@/catalogue/types"

export const alovaLibrary: CatalogueLibrary = {
  name: "Alova",
  specifiers: ["alova", "alova/client"],
  documentedVersion: "3.5",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createAlova",
      prefixAt: "baseURL",
      methods: [
        { kind: "call", name: "Get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
        { kind: "call", name: "Post", slots: [], makes: "request", pathAt: 0, method: "POST" },
      ],
    },
    { kind: "call", name: "useRequest", slots: [], makes: "data-fetch" },
  ],
}

export const axiosLibrary: CatalogueLibrary = {
  name: "Axios",
  specifiers: ["axios"],
  documentedVersion: "1.20",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "request", pathAt: "url", methodAt: "method" },
    { kind: "call", name: "default.get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    { kind: "call", name: "default.post", slots: [], makes: "request", pathAt: 0, method: "POST" },
    {
      kind: "factory",
      name: "default.create",
      prefixAt: "baseURL",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
        { kind: "call", name: "post", slots: [], makes: "request", pathAt: 0, method: "POST" },
        { kind: "call", name: "use", slots: [{ at: 0, runs: "middleware" }] },
      ],
    },
  ],
}

export const betterfetchLibrary: CatalogueLibrary = {
  name: "BetterFetch",
  specifiers: ["@better-fetch/fetch"],
  documentedVersion: "1.3",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "betterFetch", slots: [], makes: "request", pathAt: 0 },
    {
      kind: "factory",
      name: "createFetch",
      prefixAt: "baseURL",
      methods: [],
      called: {
        slots: [],
        makes: "request",
      },
    },
  ],
}

export const gotLibrary: CatalogueLibrary = {
  name: "Got",
  specifiers: ["got"],
  documentedVersion: "16.0",
  category: "http-clients",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "request", pathAt: 0 },
    { kind: "call", name: "default.stream", slots: [], makes: "request", pathAt: 0 },
    {
      kind: "factory",
      name: "default.extend",
      prefixAt: "prefixUrl",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
      ],
    },
  ],
}

export const kyLibrary: CatalogueLibrary = {
  name: "Ky",
  specifiers: ["ky"],
  documentedVersion: "2.2",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    { kind: "call", name: "default.post", slots: [], makes: "request", pathAt: 0, method: "POST" },
    {
      kind: "factory",
      name: "default.create",
      prefixAt: "prefixUrl",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
      ],
    },
    {
      kind: "factory",
      name: "default.extend",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
      ],
    },
  ],
}

export const ofetchLibrary: CatalogueLibrary = {
  name: "ofetch",
  specifiers: ["ofetch"],
  documentedVersion: "1.5",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "ofetch", slots: [], makes: "request", pathAt: 0, methodAt: "1.method" },
    {
      kind: "factory",
      name: "ofetch.create",
      slots: [{ at: "onRequest", runs: "middleware" }, { at: "onResponse", runs: "middleware" }],
      prefixAt: "baseURL",
      methods: [],
      called: {
        slots: [],
        makes: "request",
      },
    },
  ],
}

export const undiciLibrary: CatalogueLibrary = {
  name: "Undici",
  specifiers: ["undici"],
  documentedVersion: "8.11",
  category: "http-clients",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "fetch", slots: [], makes: "request", pathAt: 0, methodAt: "1.method" },
    {
      kind: "factory",
      name: "Agent",
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: "path", methodAt: "method" },
      ],
    },
    {
      kind: "factory",
      name: "Pool",
      prefixAt: 0,
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: "path", methodAt: "method" },
      ],
    },
  ],
}

export const upfetchLibrary: CatalogueLibrary = {
  name: "upfetch",
  specifiers: ["up-fetch"],
  documentedVersion: "2.6",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "up",
      slots: [{ at: 1, runs: "in-place" }],
      methods: [],
      called: {
        slots: [],
        makes: "request",
      },
    },
  ],
}

export const wretchLibrary: CatalogueLibrary = {
  name: "Wretch",
  specifiers: ["wretch"],
  documentedVersion: "3.0",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      prefixAt: 0,
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", method: "GET" },
        { kind: "call", name: "post", slots: [], makes: "request", method: "POST" },
        { kind: "call", name: "url", slots: [], prefixAt: 0 },
        { kind: "call", name: "middlewares", slots: [{ at: 0, runs: "middleware" }] },
      ],
    },
  ],
}

export const xiorLibrary: CatalogueLibrary = {
  name: "xior",
  specifiers: ["xior"],
  documentedVersion: "0.8",
  category: "http-clients",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    {
      kind: "factory",
      name: "default.create",
      prefixAt: "baseURL",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
        { kind: "call", name: "post", slots: [], makes: "request", pathAt: 0, method: "POST" },
        { kind: "call", name: "use", slots: [{ at: 0, runs: "middleware" }] },
      ],
    },
  ],
}
