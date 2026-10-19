import type { CatalogueLibrary } from "@/catalogue/types"

export const octokitLibrary: CatalogueLibrary = {
  name: "Octokit",
  specifiers: ["octokit", "@octokit/rest", "@octokit/core"],
  documentedVersion: "5.0",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Octokit",
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: 0 },
        { kind: "call", name: "paginate", slots: [], makes: "data-fetch", pathAt: 0 },
        { kind: "call", name: "graphql", slots: [], makes: "request" },
        { kind: "call", name: "create", slots: [], makes: "request" },
      ],
    },
  ],
}

export const youtubeJsLibrary: CatalogueLibrary = {
  name: "YouTube.js",
  specifiers: ["youtubei.js"],
  documentedVersion: "18.1",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Innertube.create",
      makes: "request",
      methods: [],
    },
  ],
}
