import type { CatalogueLibrary, FactoryPattern } from "@/catalogue/types"

const WEBHOOK = "webhook"

const VERIFYING_WEBHOOK: FactoryPattern = {
  kind: "factory",
  name: "Webhook",
  methods: [
    { kind: "call", name: "verify", slots: [], classifies: WEBHOOK },
  ],
}

export const discordInteractionsLibrary: CatalogueLibrary = {
  name: "discord-interactions",
  specifiers: ["discord-interactions"],
  documentedVersion: "4.4",
  category: "webhooks",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "verifyKey", slots: [], classifies: WEBHOOK },
    { kind: "call", name: "verifyKeyMiddleware", slots: [], classifies: WEBHOOK },
    { kind: "call", name: "verifyWebhookEventMiddleware", slots: [], classifies: WEBHOOK },
  ],
}

export const octokitWebhooksLibrary: CatalogueLibrary = {
  name: "Octokit Webhooks",
  specifiers: ["@octokit/webhooks"],
  documentedVersion: "14.2",
  category: "webhooks",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Webhooks",
      methods: [
        { kind: "call", name: "verify", slots: [], classifies: WEBHOOK },
        { kind: "call", name: "verifyAndReceive", slots: [], classifies: WEBHOOK },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "call", name: "onAny", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "onError", slots: [{ at: 0, runs: "event" }] },
      ],
    },
    { kind: "call", name: "createNodeMiddleware", slots: [], classifies: WEBHOOK },
    { kind: "call", name: "createWebMiddleware", slots: [], classifies: WEBHOOK },
  ],
}

export const octokitWebhooksMethodsLibrary: CatalogueLibrary = {
  name: "Octokit Webhooks Methods",
  specifiers: ["@octokit/webhooks-methods"],
  documentedVersion: "6.0",
  category: "webhooks",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "verify", slots: [], classifies: WEBHOOK },
    { kind: "call", name: "verifyWithFallback", slots: [], classifies: WEBHOOK },
  ],
}

export const standardWebhooksLibrary: CatalogueLibrary = {
  name: "Standard Webhooks",
  specifiers: ["standardwebhooks"],
  documentedVersion: "1.1",
  category: "webhooks",
  type: "backend",
  language: "javascript",
  patterns: [VERIFYING_WEBHOOK],
}

export const svixLibrary: CatalogueLibrary = {
  name: "Svix",
  specifiers: ["svix"],
  documentedVersion: "2.8",
  category: "webhooks",
  type: "backend",
  language: "javascript",
  patterns: [
    VERIFYING_WEBHOOK,
    {
      kind: "factory",
      name: "Svix",
      methods: [
        { kind: "call", name: "message.create", slots: [], makes: "publish", classifies: "third-party-integration", eventAt: "1.eventType" },
      ],
    },
  ],
}
