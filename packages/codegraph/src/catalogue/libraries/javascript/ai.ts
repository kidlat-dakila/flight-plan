import type { CatalogueLibrary } from "@/catalogue/types"

export const huggingfaceJsLibrary: CatalogueLibrary = {
  name: "HuggingFace.js",
  specifiers: ["@huggingface/hub", "@huggingface/inference"],
  documentedVersion: "2.17",
  category: "ai",
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

export const vercelAiSdkLibrary: CatalogueLibrary = {
  name: "Vercel AI SDK",
  specifiers: ["ai"],
  documentedVersion: "7.0",
  category: "ai",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "generateText", slots: [], makes: "request" },
    { kind: "call", name: "streamText", slots: [], makes: "request" },
    { kind: "call", name: "generateObject", slots: [], makes: "request" },
    { kind: "call", name: "embed", slots: [], makes: "request" },
    { kind: "call", name: "embedMany", slots: [], makes: "request" },
    { kind: "call", name: "generateImage", slots: [], makes: "request" },
    { kind: "call", name: "transcribe", slots: [], makes: "request" },
    { kind: "call", name: "generateSpeech", slots: [], makes: "request" },
  ],
}

export const langchainJsLibrary: CatalogueLibrary = {
  name: "LangChain.js",
  specifiers: ["langchain"],
  documentedVersion: "1.5",
  category: "ai",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "initChatModel",
      methods: [
        { kind: "call", name: "invoke", slots: [], makes: "request" },
        { kind: "call", name: "stream", slots: [], makes: "request" },
        { kind: "call", name: "batch", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "createAgent",
      methods: [
        { kind: "call", name: "invoke", slots: [], makes: "request" },
        { kind: "call", name: "streamEvents", slots: [], makes: "request" },
      ],
    },
  ],
}

export const anthropicLibrary: CatalogueLibrary = {
  name: "Anthropic",
  specifiers: ["@anthropic-ai/sdk"],
  documentedVersion: "0.135",
  category: "ai",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "messages.create", slots: [], makes: "request" },
        { kind: "call", name: "messages.stream", slots: [], makes: "request" },
        { kind: "call", name: "messages.countTokens", slots: [], makes: "request" },
        { kind: "call", name: "messages.batches.create", slots: [], makes: "request" },
        { kind: "call", name: "models.list", slots: [], makes: "data-fetch" },
        { kind: "call", name: "models.retrieve", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

export const openaiLibrary: CatalogueLibrary = {
  name: "OpenAI",
  specifiers: ["openai"],
  documentedVersion: "7.39",
  category: "ai",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "responses.create", slots: [], makes: "request" },
        { kind: "call", name: "chat.completions.create", slots: [], makes: "request" },
        { kind: "call", name: "embeddings.create", slots: [], makes: "request" },
        { kind: "call", name: "images.generate", slots: [], makes: "request" },
        { kind: "call", name: "audio.transcriptions.create", slots: [], makes: "request" },
        { kind: "call", name: "models.list", slots: [], makes: "data-fetch" },
        { kind: "call", name: "webhooks.unwrap", slots: [], classifies: "webhook" },
      ],
    },
  ],
}
