import type { CallPattern, CatalogueLibrary, FactoryPattern } from "@/catalogue/types"

const WEBHOOK = "webhook"

const VERIFYING_WEBHOOK: FactoryPattern = {
  kind: "factory",
  name: "Webhook",
  methods: [
    { kind: "call", name: "verify", slots: [], classifies: WEBHOOK },
  ],
}

const SVIX_MESSAGE_CREATE: CallPattern = { kind: "call", name: "message.create", slots: [], makes: "publish", classifies: "third-party-integration" }

export const discordInteractionsForPythonLibrary: CatalogueLibrary = {
  name: "discord-interactions for Python",
  specifiers: ["discord_interactions"],
  documentedVersion: "0.4",
  category: "webhooks",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "verify_key", slots: [], classifies: WEBHOOK },
    { kind: "decorator", name: "verify_key_decorator", classifies: WEBHOOK },
  ],
}

export const gidgethubLibrary: CatalogueLibrary = {
  name: "gidgethub",
  specifiers: ["gidgethub", "gidgethub.sansio", "gidgethub.routing"],
  documentedVersion: "6.0",
  category: "webhooks",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "Event.from_http", slots: [], classifies: WEBHOOK },
    { kind: "call", name: "validate_event", slots: [], classifies: WEBHOOK },
    {
      kind: "factory",
      name: "Router",
      methods: [
        { kind: "decorator", name: "register", runs: "event", eventAt: 0 },
        { kind: "call", name: "add", slots: [{ at: 0, runs: "event" }], eventAt: 1 },
      ],
    },
  ],
}

export const slackeventsapiLibrary: CatalogueLibrary = {
  name: "slackeventsapi",
  specifiers: ["slackeventsapi"],
  documentedVersion: "3.0",
  category: "webhooks",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "SlackEventAdapter",
      classifies: WEBHOOK,
      methods: [
        { kind: "decorator", name: "on", runs: "event", eventAt: 0 },
      ],
    },
  ],
}

export const standardWebhooksForPythonLibrary: CatalogueLibrary = {
  name: "Standard Webhooks for Python",
  specifiers: ["standardwebhooks", "standardwebhooks.webhooks"],
  documentedVersion: "1.1",
  category: "webhooks",
  type: "backend",
  language: "python",
  patterns: [VERIFYING_WEBHOOK],
}

export const svixForPythonLibrary: CatalogueLibrary = {
  name: "Svix for Python",
  specifiers: ["svix", "svix.webhooks", "svix.api"],
  documentedVersion: "2.8",
  category: "webhooks",
  type: "backend",
  language: "python",
  patterns: [
    VERIFYING_WEBHOOK,
    { kind: "factory", name: "Svix", methods: [SVIX_MESSAGE_CREATE] },
    { kind: "factory", name: "SvixAsync", methods: [SVIX_MESSAGE_CREATE] },
  ],
}
