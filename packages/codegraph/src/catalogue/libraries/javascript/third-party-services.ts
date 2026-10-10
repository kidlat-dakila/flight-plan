import type { CatalogueLibrary } from "@/catalogue/types"

export const discordJsLibrary: CatalogueLibrary = {
  name: "discord.js",
  specifiers: ["discord.js"],
  documentedVersion: "14.27",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "call", name: "once", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "call", name: "login", slots: [], makes: "request" },
      ],
    },
  ],
}

export const emailSdkLibrary: CatalogueLibrary = {
  name: "Email SDK",
  specifiers: ["@opencoredev/email-sdk"],
  documentedVersion: "2.0",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createEmailClient",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "request" },
      ],
    },
  ],
}

export const huggingfaceJsLibrary: CatalogueLibrary = {
  name: "HuggingFace.js",
  specifiers: ["@huggingface/hub", "@huggingface/inference"],
  documentedVersion: "2.17",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createRepo", slots: [], makes: "request" },
    { kind: "call", name: "uploadFiles", slots: [], makes: "request" },
    { kind: "call", name: "deleteRepo", slots: [], makes: "request" },
    { kind: "call", name: "listModels", slots: [], makes: "data-fetch" },
    {
      kind: "factory",
      name: "InferenceClient",
      methods: [
        { kind: "call", name: "chatCompletion", slots: [], makes: "request" },
      ],
    },
  ],
}

export const nhostLibrary: CatalogueLibrary = {
  name: "Nhost",
  specifiers: ["@nhost/nhost-js"],
  documentedVersion: "4.9",
  category: "third-party-services",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createClient",
      methods: [
        { kind: "call", name: "signInEmailPassword", slots: [], makes: "auth" },
        { kind: "call", name: "request", slots: [], makes: "request" },
        { kind: "call", name: "uploadFiles", slots: [], makes: "request" },
      ],
    },
  ],
}

export const nodemailerLibrary: CatalogueLibrary = {
  name: "Nodemailer",
  specifiers: ["nodemailer"],
  documentedVersion: "10.0",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default.createTransport",
      methods: [
        { kind: "call", name: "sendMail", slots: [{ at: 1, runs: "event" }], makes: "request" },
        { kind: "call", name: "verify", slots: [], makes: "request" },
      ],
    },
  ],
}

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

export const plunkLibrary: CatalogueLibrary = {
  name: "plunk",
  specifiers: ["@plunk/node"],
  documentedVersion: "3.0",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      makes: "request",
      methods: [],
    },
  ],
}

export const supabaseLibrary: CatalogueLibrary = {
  name: "Supabase",
  specifiers: ["@supabase/supabase-js"],
  documentedVersion: "2.117",
  category: "third-party-services",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createClient",
      methods: [
        { kind: "call", name: "from", slots: [], makes: "data" },
        { kind: "call", name: "rpc", slots: [], makes: "data" },
        { kind: "call", name: "signInWithPassword", slots: [], makes: "auth" },
        { kind: "call", name: "getUser", slots: [], makes: "auth" },
        { kind: "call", name: "signOut", slots: [], makes: "auth" },
        { kind: "call", name: "onAuthStateChange", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "invoke", slots: [], makes: "request", pathAt: 0 },
      ],
    },
  ],
}

export const upyoLibrary: CatalogueLibrary = {
  name: "Upyo",
  specifiers: ["@upyo/core", "@upyo/smtp"],
  documentedVersion: "0.6",
  category: "third-party-services",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createMessage", slots: [], makes: "request" },
    {
      kind: "factory",
      name: "SmtpTransport",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "request" },
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
