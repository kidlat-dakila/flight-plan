import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

export const imboxLibrary: CatalogueLibrary = {
  name: "Imbox",
  specifiers: ["imbox"],
  documentedVersion: "0.10",
  category: "email-and-messaging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Imbox",
      methods: [
        { kind: "call", name: "messages", slots: [], makes: "request" },
      ],
    },
  ],
}

export const yagmailLibrary: CatalogueLibrary = {
  name: "yagmail",
  specifiers: ["yagmail"],
  documentedVersion: "0.16",
  category: "email-and-messaging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "SMTP",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "request" },
      ],
    },
  ],
}

export const flankerLibrary: CatalogueLibrary = {
  name: "Flanker",
  specifiers: ["flanker", "flanker.addresslib", "flanker.mime"],
  documentedVersion: "0.9",
  category: "email-and-messaging",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "address.parse", slots: [], makes: "validation" },
    { kind: "call", name: "mime.from_string", slots: [], makes: "validation" },
  ],
}

const SLACK_SDK_CLIENT_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "chat_postMessage", slots: [], makes: "request" },
  { kind: "call", name: "files_upload_v2", slots: [], makes: "request" },
]

export const slackSdkLibrary: CatalogueLibrary = {
  name: "Python Slack SDK",
  specifiers: ["slack_sdk", "slack_sdk.web.async_client"],
  documentedVersion: "3.45",
  category: "email-and-messaging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "WebClient",
      methods: SLACK_SDK_CLIENT_METHODS,
    },
    {
      kind: "factory",
      name: "AsyncWebClient",
      methods: SLACK_SDK_CLIENT_METHODS,
    },
  ],
}

export const twilioLibrary: CatalogueLibrary = {
  name: "twilio-python",
  specifiers: ["twilio.rest"],
  documentedVersion: "9.12",
  category: "email-and-messaging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "create", slots: [], makes: "request" },
        { kind: "call", name: "create_async", slots: [], makes: "request" },
      ],
    },
  ],
}
