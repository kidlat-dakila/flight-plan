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
  "realtime": {
    label: "Realtime",
    description: "A socket or a stream that stays connected and answers messages as they come",
  },
  "queue-consumer": { label: "Queue consumer", description: "The code that takes messages off a queue" },
  "job": { label: "Scheduled job", description: "Code that runs on a schedule" },
  "command": { label: "Command", description: "Code that runs when someone calls it from a command line" },
  "database-operation": { label: "Database operation", description: "A read or a write of a database or a cache" },
  "data-model": { label: "Data model", description: "The definition of what is stored" },
  "third-party-integration": {
    label: "Third-party integration",
    description: "A call into an outside service's SDK: payments, email, messages, cloud storage, an LLM",
  },
  "request": { label: "Network request", description: "A call to a server over the network" },
  "form": { label: "Form", description: "The state, validation and submission of a form" },
  "validation": { label: "Validation", description: "A schema, or a check of a value against one" },
  "store": { label: "Store", description: "A state container shared across components" },
  "state": { label: "State", description: "State, or a value derived from it" },
  "auth": { label: "Auth", description: "A check of who the caller is, or what they may do" },
  "security": { label: "Security", description: "Hashing, signing, encryption and rate limiting" },
  "file-io": { label: "File I/O", description: "A read or a write of files or object storage on the server" },
  "process-execution": {
    label: "Process execution",
    description: "Code that starts another program or a worker thread",
  },
  "publish": { label: "Publish", description: "Code that emits an event or puts a job on a queue" },
  "navigation": { label: "Navigation", description: "Code that sends the user to a page" },
  "error-handling": {
    label: "Error handling",
    description: "Code whose job is to turn a failure into a response or a fallback",
  },
  "effect": { label: "Effect", description: "Code that runs after something else has run" },
  "event": { label: "Event", description: "Code that runs when something happens later" },
  "context-and-wiring": {
    label: "Context and wiring",
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
  "type": { label: "Type", description: "A type declaration" },
  "file": { label: "File", description: "A file no language reads and no location names" },
  "logic": { label: "Logic", description: "What a block is when nothing else applies" },
}
