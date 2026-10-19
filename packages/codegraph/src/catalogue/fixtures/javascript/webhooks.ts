import type { PatternFixture } from "@/catalogue/types"

const DISCORD_INTERACTIONS = "discord-interactions"

export const discordInteractionsFixtures: readonly PatternFixture[] = [
  {
    library: DISCORD_INTERACTIONS,
    patternKey: "call:verifyKey:*",
    matches: [
      "import { verifyKey } from \"discord-interactions\"\nconst isValidRequest = await verifyKey(req.rawBody, signature, timestamp, \"MY_CLIENT_PUBLIC_KEY\")",
    ],
    rejects: [
      "const verifyKey = (...parts) => parts\nconst isValidRequest = await verifyKey(req.rawBody, signature, timestamp, \"MY_CLIENT_PUBLIC_KEY\")",
    ],
  },
  {
    library: DISCORD_INTERACTIONS,
    patternKey: "call:verifyKeyMiddleware:*",
    matches: [
      "import { verifyKeyMiddleware } from \"discord-interactions\"\napp.post(\"/interactions\", verifyKeyMiddleware(\"MY_CLIENT_PUBLIC_KEY\"), (req, res) => { res.send(reply(req.body)) })",
    ],
    rejects: [
      "const verifyKeyMiddleware = (...parts) => parts\napp.post(\"/interactions\", verifyKeyMiddleware(\"MY_CLIENT_PUBLIC_KEY\"), (req, res) => { res.send(reply(req.body)) })",
    ],
  },
  {
    library: DISCORD_INTERACTIONS,
    patternKey: "call:verifyWebhookEventMiddleware:*",
    matches: [
      "import { verifyWebhookEventMiddleware } from \"discord-interactions\"\napp.post(\"/events\", verifyWebhookEventMiddleware(process.env.CLIENT_PUBLIC_KEY), (req, res) => { record(req.body) })",
    ],
    rejects: [
      "const verifyWebhookEventMiddleware = (...parts) => parts\napp.post(\"/events\", verifyWebhookEventMiddleware(process.env.CLIENT_PUBLIC_KEY), (req, res) => { record(req.body) })",
    ],
  },
]

const OCTOKIT_WEBHOOKS = "Octokit Webhooks"

export const octokitWebhooksFixtures: readonly PatternFixture[] = [
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "factory:Webhooks:*",
    matches: [
      "import { Webhooks } from \"@octokit/webhooks\"\nconst webhooks = new Webhooks({ secret: \"mysecret\" })",
    ],
    rejects: [
      "const Webhooks = (...parts) => parts\nconst webhooks = new Webhooks({ secret: \"mysecret\" })",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "factory:Webhooks:*>call:verify:*",
    matches: [
      "import { Webhooks } from \"@octokit/webhooks\"\nconst webhooks = new Webhooks({ secret: \"mysecret\" })\nconst isValid = await webhooks.verify(eventPayload, signature)",
    ],
    rejects: [
      "const webhooks = makeLocalRegistry()\nconst isValid = await webhooks.verify(eventPayload, signature)",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "factory:Webhooks:*>call:verifyAndReceive:*",
    matches: [
      "import { Webhooks } from \"@octokit/webhooks\"\nconst webhooks = new Webhooks({ secret: \"mysecret\" })\nawait webhooks.verifyAndReceive({ id, name, payload, signature })",
    ],
    rejects: [
      "const webhooks = makeLocalRegistry()\nawait webhooks.verifyAndReceive({ id, name, payload, signature })",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "factory:Webhooks:*>call:on:*",
    matches: [
      "import { Webhooks } from \"@octokit/webhooks\"\nconst webhooks = new Webhooks({ secret: \"mysecret\" })\nwebhooks.on(\"push\", async ({ id, name, payload }) => { await deploy(payload.ref) })",
    ],
    rejects: [
      "const webhooks = makeLocalRegistry()\nwebhooks.on(\"push\", async ({ id, name, payload }) => { await deploy(payload.ref) })",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "factory:Webhooks:*>call:onAny:*",
    matches: [
      "import { Webhooks } from \"@octokit/webhooks\"\nconst webhooks = new Webhooks({ secret: \"mysecret\" })\nwebhooks.onAny(({ id, name, payload }) => { record(name) })",
    ],
    rejects: [
      "const webhooks = makeLocalRegistry()\nwebhooks.onAny(({ id, name, payload }) => { record(name) })",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "factory:Webhooks:*>call:onError:*",
    matches: [
      "import { Webhooks } from \"@octokit/webhooks\"\nconst webhooks = new Webhooks({ secret: \"mysecret\" })\nwebhooks.onError((error) => { report(error.event) })",
    ],
    rejects: [
      "const webhooks = makeLocalRegistry()\nwebhooks.onError((error) => { report(error.event) })",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "call:createNodeMiddleware:*",
    matches: [
      "import { createNodeMiddleware } from \"@octokit/webhooks\"\ncreateServer(createNodeMiddleware(webhooks, { path: \"/webhooks\" })).listen(3000)",
    ],
    rejects: [
      "const createNodeMiddleware = (...parts) => parts\ncreateServer(createNodeMiddleware(webhooks, { path: \"/webhooks\" })).listen(3000)",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS,
    patternKey: "call:createWebMiddleware:*",
    matches: [
      "import { createWebMiddleware } from \"@octokit/webhooks\"\nconst middleware = createWebMiddleware(webhooks, { path: \"/webhooks\" })",
    ],
    rejects: [
      "const createWebMiddleware = (...parts) => parts\nconst middleware = createWebMiddleware(webhooks, { path: \"/webhooks\" })",
    ],
  },
]

const OCTOKIT_WEBHOOKS_METHODS = "Octokit Webhooks Methods"

export const octokitWebhooksMethodsFixtures: readonly PatternFixture[] = [
  {
    library: OCTOKIT_WEBHOOKS_METHODS,
    patternKey: "call:verify:*",
    matches: [
      "import { verify } from \"@octokit/webhooks-methods\"\nconst isValid = await verify(\"mysecret\", eventPayloadString, signature)",
    ],
    rejects: [
      "const verify = (...parts) => parts\nconst isValid = await verify(\"mysecret\", eventPayloadString, signature)",
    ],
  },
  {
    library: OCTOKIT_WEBHOOKS_METHODS,
    patternKey: "call:verifyWithFallback:*",
    matches: [
      "import { verifyWithFallback } from \"@octokit/webhooks-methods\"\nconst isValid = await verifyWithFallback(\"mysecret\", eventPayloadString, signature, [\"oldsecret\"])",
    ],
    rejects: [
      "const verifyWithFallback = (...parts) => parts\nconst isValid = await verifyWithFallback(\"mysecret\", eventPayloadString, signature, [\"oldsecret\"])",
    ],
  },
]

const STANDARD_WEBHOOKS = "Standard Webhooks"

export const standardWebhooksFixtures: readonly PatternFixture[] = [
  {
    library: STANDARD_WEBHOOKS,
    patternKey: "factory:Webhook:*",
    matches: [
      "import { Webhook } from \"standardwebhooks\"\nconst wh = new Webhook(base64Secret)",
    ],
    rejects: [
      "const Webhook = (...parts) => parts\nconst wh = new Webhook(base64Secret)",
    ],
  },
  {
    library: STANDARD_WEBHOOKS,
    patternKey: "factory:Webhook:*>call:verify:*",
    matches: [
      "import { Webhook } from \"standardwebhooks\"\nconst wh = new Webhook(base64Secret)\nconst payload = wh.verify(rawBody, req.headers)",
    ],
    rejects: [
      "const wh = makeLocalRegistry()\nconst payload = wh.verify(rawBody, req.headers)",
    ],
  },
]

const SVIX = "Svix"

export const svixFixtures: readonly PatternFixture[] = [
  {
    library: SVIX,
    patternKey: "factory:Webhook:*",
    matches: [
      "import { Webhook } from \"svix\"\nconst wh = new Webhook(secret)",
    ],
    rejects: [
      "const Webhook = (...parts) => parts\nconst wh = new Webhook(secret)",
    ],
  },
  {
    library: SVIX,
    patternKey: "factory:Webhook:*>call:verify:*",
    matches: [
      "import { Webhook } from \"svix\"\nconst wh = new Webhook(secret)\nconst payload = wh.verify(rawBody, { \"svix-id\": svixId, \"svix-timestamp\": svixTimestamp, \"svix-signature\": svixSignature })",
    ],
    rejects: [
      "const wh = makeLocalRegistry()\nconst payload = wh.verify(rawBody, { \"svix-id\": svixId, \"svix-timestamp\": svixTimestamp, \"svix-signature\": svixSignature })",
    ],
  },
  {
    library: SVIX,
    patternKey: "factory:Svix:*",
    matches: [
      "import { Svix } from \"svix\"\nconst svix = new Svix(\"AUTH_TOKEN\")",
    ],
    rejects: [
      "const Svix = (...parts) => parts\nconst svix = new Svix(\"AUTH_TOKEN\")",
    ],
  },
  {
    library: SVIX,
    patternKey: "factory:Svix:*>call:message.create:*",
    matches: [
      "import { Svix } from \"svix\"\nconst svix = new Svix(\"AUTH_TOKEN\")\nawait svix.message.create(appId, { eventType: \"invoice.paid\", payload: { id: invoice.id } })",
    ],
    rejects: [
      "const svix = makeLocalRegistry()\nawait svix.message.create(appId, { eventType: \"invoice.paid\", payload: { id: invoice.id } })",
    ],
  },
]
