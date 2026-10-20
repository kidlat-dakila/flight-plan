import type { CodeBlockClassification } from "./code-blocks"

export interface ClassificationLabel {
  readonly label: string
  readonly description: string
}

export const CODE_BLOCK_CLASSIFICATION_LABELS: Readonly<Record<CodeBlockClassification, ClassificationLabel>> = {
  "test": { label: "Test", description: "A test or a story" },
  "build-and-infrastructure": {
    label: "Build and infrastructure",
    description: "Code that builds, deploys or runs the app rather than being the app",
  },
  "migration": { label: "Migration", description: "A change to the shape of the database" },
  "page": { label: "Page", description: "Code that renders on a visit to a path" },
  "component": { label: "Component", description: "Markup, or a function that returns it" },
  "webhook": { label: "Webhook", description: "A route a third party calls, which checks the sender's signature" },
  "server-action": {
    label: "Server action",
    description: "A function the client calls as if it were local, which runs on the server",
  },
  "api-route": { label: "API route", description: "A route, a resolver or a middleware" },
  "websocket": {
    label: "WebSocket",
    description: "A socket or a stream that stays connected and answers messages as they come",
  },
  "messaging": { label: "Messaging", description: "Code that puts a message on a queue or a bus, or takes one off it" },
  "job": { label: "Scheduled job", description: "Code that runs on a schedule" },
  "cli-command": { label: "CLI command", description: "Code that runs when someone calls it from a command line" },
  "database-read-write": { label: "Database read/write", description: "A read or a write of a database or a cache" },
  "data-model": {
    label: "Schema / data model",
    description: "The shape of what is stored or passed around, such as a schema, a model or a type",
  },
  "third-party-integration": {
    label: "Third-party integration",
    description: "A call into an outside service's SDK: payments, email, messages, cloud storage, an LLM",
  },
  "api-request": { label: "API request", description: "A call to a server over the network" },
  "validation": { label: "Validation", description: "A schema, or a check of a value against one" },
  "ui-state": { label: "UI state", description: "State, a value derived from it, or a store shared across components" },
  "hook": { label: "Hook", description: "A custom hook or composable, a function whose name starts with use" },
  "security": {
    label: "Security",
    description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting",
  },
  "file-io": { label: "File I/O", description: "A read or a write of files or object storage on the server" },
  "process-execution": {
    label: "Process execution",
    description: "Code that starts another program or a worker thread",
  },
  "navigation": { label: "Navigation", description: "Code that sends the user to a page" },
  "error-handling": {
    label: "Error handling",
    description: "Code whose job is to turn a failure into a response or a fallback",
  },
  "effect": { label: "Effect", description: "Code that runs after something else has run" },
  "event": { label: "Event", description: "Code that runs when something happens later" },
  "app-setup": {
    label: "App setup",
    description: "Code that makes something available to the code below it, or starts the app",
  },
  "feature-flag": { label: "Feature flag", description: "A read of a value switched from outside the code" },
  "config": {
    label: "Config",
    description: "A read of an environment variable or a configuration value, or a configuration file",
  },
  "storage": { label: "Browser storage", description: "A read or a write of what the browser keeps for the user" },
  "telemetry": { label: "Telemetry", description: "Logging, analytics or error reporting" },
  "i18n": { label: "Translations", description: "Text looked up by key for the user's language, or a translation file" },
  "styling": { label: "Styling", description: "How something looks: a stylesheet, CSS-in-JS, a theme" },
  "file": { label: "File", description: "A file no language reads and no location names" },
  "logic": { label: "Logic", description: "What a block is when nothing else applies" },
}
