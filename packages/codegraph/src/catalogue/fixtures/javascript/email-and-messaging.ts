import type { PatternFixture } from "@/catalogue/types"

const NODEMAILER = "Nodemailer"

export const nodemailerFixtures: readonly PatternFixture[] = [
  {
    library: NODEMAILER,
    patternKey: "factory:default.createTransport:*",
    matches: [
      "import nodemailer from \"nodemailer\"\nconst transporter = nodemailer.createTransport({ host: \"smtp.example.com\", port: 587 })",
    ],
    rejects: [
      "const nodemailer = makeLocalRegistry()\nconst transporter = nodemailer.createTransport({ host: \"smtp.example.com\", port: 587 })",
    ],
  },
  {
    library: NODEMAILER,
    patternKey: "factory:default.createTransport:*>call:sendMail:*",
    matches: [
      "import nodemailer from \"nodemailer\"\nconst transporter = nodemailer.createTransport({ host: \"smtp.example.com\", port: 587 })\nconst info = await transporter.sendMail({ from: \"ada@example.com\", to: \"bob@example.com\", subject: \"Hello\" })",
    ],
    rejects: [
      "const transporter = makeLocalRegistry()\nconst info = await transporter.sendMail({ from: \"ada@example.com\", to: \"bob@example.com\", subject: \"Hello\" })",
    ],
  },
  {
    library: NODEMAILER,
    patternKey: "factory:default.createTransport:*>call:verify:*",
    matches: [
      "import nodemailer from \"nodemailer\"\nconst transporter = nodemailer.createTransport({ host: \"smtp.example.com\", port: 587 })\nawait transporter.verify()",
    ],
    rejects: [
      "const transporter = makeLocalRegistry()\nawait transporter.verify()",
    ],
  },
]

const PLUNK = "plunk"

export const plunkFixtures: readonly PatternFixture[] = [
  {
    library: PLUNK,
    patternKey: "factory:default:*",
    matches: [
      "import Plunk from \"@plunk/node\"\nconst plunk = new Plunk(process.env.PLUNK_API_KEY)",
    ],
    rejects: [
      "const Plunk = (...parts) => parts\nconst plunk = new Plunk(process.env.PLUNK_API_KEY)",
    ],
  },
]

const UPYO = "Upyo"

export const upyoFixtures: readonly PatternFixture[] = [
  {
    library: UPYO,
    patternKey: "call:createMessage:*",
    matches: [
      "import { createMessage } from \"@upyo/core\"\nconst message = createMessage({ from: \"sender@example.com\", to: \"recipient@example.net\", subject: \"Hello\" })",
    ],
    rejects: [
      "const createMessage = (...parts) => parts\nconst message = createMessage({ from: \"sender@example.com\", to: \"recipient@example.net\", subject: \"Hello\" })",
    ],
  },
  {
    library: UPYO,
    patternKey: "factory:SmtpTransport:*",
    matches: [
      "import { SmtpTransport } from \"@upyo/smtp\"\nconst transport = new SmtpTransport({ host: \"smtp.example.com\" })",
    ],
    rejects: [
      "const SmtpTransport = (...parts) => parts\nconst transport = new SmtpTransport({ host: \"smtp.example.com\" })",
    ],
  },
  {
    library: UPYO,
    patternKey: "factory:SmtpTransport:*>call:send:*",
    matches: [
      "import { SmtpTransport } from \"@upyo/smtp\"\nconst transport = new SmtpTransport({ host: \"smtp.example.com\" })\nconst receipt = await transport.send(message)",
    ],
    rejects: [
      "const transport = makeLocalRegistry()\nconst receipt = await transport.send(message)",
    ],
  },
]

const EMAIL_SDK = "Email SDK"

export const emailSdkFixtures: readonly PatternFixture[] = [
  {
    library: EMAIL_SDK,
    patternKey: "factory:createEmailClient:*",
    matches: [
      "import { createEmailClient } from \"@opencoredev/email-sdk\"\nconst email = createEmailClient({ adapters: [resend({ apiKey })] })",
    ],
    rejects: [
      "const createEmailClient = (...parts) => parts\nconst email = createEmailClient({ adapters: [resend({ apiKey })] })",
    ],
  },
  {
    library: EMAIL_SDK,
    patternKey: "factory:createEmailClient:*>call:send:*",
    matches: [
      "import { createEmailClient } from \"@opencoredev/email-sdk\"\nconst email = createEmailClient({ adapters: [resend({ apiKey })] })\nawait email.send({ from: \"hi@acme.com\", to: \"ada@example.com\", subject: \"Welcome\" })",
    ],
    rejects: [
      "const email = makeLocalRegistry()\nawait email.send({ from: \"hi@acme.com\", to: \"ada@example.com\", subject: \"Welcome\" })",
    ],
  },
]

const DISCORD_JS = "discord.js"

export const discordJsFixtures: readonly PatternFixture[] = [
  {
    library: DISCORD_JS,
    patternKey: "factory:Client:*",
    matches: [
      "import { Client } from \"discord.js\"\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] })",
    ],
    rejects: [
      "const Client = (...parts) => parts\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] })",
    ],
  },
  {
    library: DISCORD_JS,
    patternKey: "factory:Client:*>call:on:*",
    matches: [
      "import { Client } from \"discord.js\"\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] })\nclient.on(Events.InteractionCreate, async (interaction) => { await interaction.reply(\"Pong!\") })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.on(Events.InteractionCreate, async (interaction) => { await interaction.reply(\"Pong!\") })",
    ],
  },
  {
    library: DISCORD_JS,
    patternKey: "factory:Client:*>call:once:*",
    matches: [
      "import { Client } from \"discord.js\"\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] })\nclient.once(Events.ClientReady, (readyClient) => { report(readyClient.user.tag) })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.once(Events.ClientReady, (readyClient) => { report(readyClient.user.tag) })",
    ],
  },
  {
    library: DISCORD_JS,
    patternKey: "factory:Client:*>call:login:*",
    matches: [
      "import { Client } from \"discord.js\"\nconst client = new Client({ intents: [GatewayIntentBits.Guilds] })\nclient.login(token)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.login(token)",
    ],
  },
]
