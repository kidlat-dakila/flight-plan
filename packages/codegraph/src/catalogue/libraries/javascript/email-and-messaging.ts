import type { CatalogueLibrary } from "@/catalogue/types"

export const nodemailerLibrary: CatalogueLibrary = {
  name: "Nodemailer",
  specifiers: ["nodemailer"],
  documentedVersion: "10.0",
  category: "email-and-messaging",
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

export const plunkLibrary: CatalogueLibrary = {
  name: "plunk",
  specifiers: ["@plunk/node"],
  documentedVersion: "3.0",
  category: "email-and-messaging",
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

export const upyoLibrary: CatalogueLibrary = {
  name: "Upyo",
  specifiers: ["@upyo/core", "@upyo/smtp"],
  documentedVersion: "0.6",
  category: "email-and-messaging",
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

export const emailSdkLibrary: CatalogueLibrary = {
  name: "Email SDK",
  specifiers: ["@opencoredev/email-sdk"],
  documentedVersion: "2.0",
  category: "email-and-messaging",
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

export const discordJsLibrary: CatalogueLibrary = {
  name: "discord.js",
  specifiers: ["discord.js"],
  documentedVersion: "14.27",
  category: "email-and-messaging",
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
