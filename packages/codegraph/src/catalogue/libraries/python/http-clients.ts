import type { CatalogueLibrary } from "@/catalogue/types"

export const grequestsLibrary: CatalogueLibrary = {
  name: "grequests",
  specifiers: ["grequests"],
  documentedVersion: "0.7",
  category: "http-clients",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    { kind: "call", name: "map", slots: [{ at: "exception_handler", runs: "event" }], makes: "request" },
    { kind: "call", name: "imap", slots: [], makes: "request" },
  ],
}

export const httplib2Library: CatalogueLibrary = {
  name: "httplib2",
  specifiers: ["httplib2"],
  documentedVersion: "0.32",
  category: "http-clients",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Http",
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: 0, methodAt: 1 },
        { kind: "call", name: "add_credentials", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const httpxLibrary: CatalogueLibrary = {
  name: "HTTPX",
  specifiers: ["httpx"],
  documentedVersion: "0.28",
  category: "http-clients",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    {
      kind: "factory",
      name: "Client",
      prefixAt: "base_url",
      methods: [
        { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
      ],
    },
  ],
}

export const requestsLibrary: CatalogueLibrary = {
  name: "Requests",
  specifiers: ["requests"],
  documentedVersion: "2.34",
  category: "http-clients",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: [0, "url"], method: "GET" },
    { kind: "call", name: "request", slots: [], makes: "request", pathAt: [1, "url"], methodAt: [0, "method"] },
  ],
}

export const treqLibrary: CatalogueLibrary = {
  name: "treq",
  specifiers: ["treq"],
  documentedVersion: "26.7",
  category: "http-clients",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "get", slots: [], makes: "data-fetch", pathAt: 0, method: "GET" },
    { kind: "call", name: "request", slots: [], makes: "request", pathAt: 1, methodAt: 0 },
  ],
}

export const urllib3Library: CatalogueLibrary = {
  name: "urllib3",
  specifiers: ["urllib3"],
  documentedVersion: "2.8",
  category: "http-clients",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "request", slots: [], makes: "request", pathAt: 1, methodAt: 0 },
    {
      kind: "factory",
      name: "PoolManager",
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: 1, methodAt: 0 },
      ],
    },
    {
      kind: "factory",
      name: "HTTPConnectionPool",
      prefixAt: 0,
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: 1, methodAt: 0 },
      ],
    },
  ],
}
