import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const OPENAI_PYTHON_CLIENT_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "responses.create", slots: [], makes: "request" },
  { kind: "call", name: "chat.completions.create", slots: [], makes: "request" },
  { kind: "call", name: "embeddings.create", slots: [], makes: "request" },
  { kind: "call", name: "images.generate", slots: [], makes: "request" },
  { kind: "call", name: "audio.transcriptions.create", slots: [], makes: "request" },
  { kind: "call", name: "models.list", slots: [], makes: "data-fetch" },
  { kind: "call", name: "webhooks.unwrap", slots: [], classifies: "webhook" },
  { kind: "call", name: "webhooks.verify_signature", slots: [], classifies: "webhook" },
]

export const openaiPythonLibrary: CatalogueLibrary = {
  name: "OpenAI for Python",
  specifiers: ["openai"],
  documentedVersion: "3.35",
  category: "ai",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "OpenAI", methods: OPENAI_PYTHON_CLIENT_METHODS },
    { kind: "factory", name: "AsyncOpenAI", methods: OPENAI_PYTHON_CLIENT_METHODS },
  ],
}

export const langchainLibrary: CatalogueLibrary = {
  name: "LangChain",
  specifiers: ["langchain.chat_models", "langchain.agents"],
  documentedVersion: "1.4",
  category: "ai",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "init_chat_model",
      methods: [
        { kind: "call", name: "invoke", slots: [], makes: "request" },
        { kind: "call", name: "stream", slots: [], makes: "request" },
        { kind: "call", name: "batch", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "create_agent",
      methods: [
        { kind: "call", name: "invoke", slots: [], makes: "request" },
        { kind: "call", name: "stream_events", slots: [], makes: "request" },
      ],
    },
  ],
}

export const anthropicPythonLibrary: CatalogueLibrary = {
  name: "Anthropic for Python",
  specifiers: ["anthropic"],
  documentedVersion: "1.15",
  category: "ai",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Anthropic",
      methods: [
        { kind: "call", name: "messages.create", slots: [], makes: "request" },
        { kind: "call", name: "messages.stream", slots: [], makes: "request" },
        { kind: "call", name: "messages.count_tokens", slots: [], makes: "request" },
        { kind: "call", name: "models.list", slots: [], makes: "data-fetch" },
        { kind: "call", name: "models.retrieve", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

export const googleGenAiLibrary: CatalogueLibrary = {
  name: "Google Gen AI",
  specifiers: ["google.genai"],
  documentedVersion: "2.31",
  category: "ai",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "models.generate_content", slots: [], makes: "request" },
        { kind: "call", name: "models.generate_content_stream", slots: [], makes: "request" },
        { kind: "call", name: "models.embed_content", slots: [], makes: "request" },
        { kind: "call", name: "models.generate_images", slots: [], makes: "request" },
        { kind: "call", name: "models.generate_videos", slots: [], makes: "request" },
        { kind: "call", name: "models.list", slots: [], makes: "data-fetch" },
        {
          kind: "factory",
          name: "chats.create",
          methods: [
            { kind: "call", name: "send_message", slots: [], makes: "request" },
            { kind: "call", name: "send_message_stream", slots: [], makes: "request" },
          ],
        },
      ],
    },
  ],
}

export const transformersLibrary: CatalogueLibrary = {
  name: "Transformers",
  specifiers: ["transformers"],
  documentedVersion: "5.20",
  category: "ai",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "pipeline",
      methods: [],
      called: { slots: [], classifies: "third-party-integration" },
    },
    {
      kind: "factory",
      name: "AutoModelForCausalLM.from_pretrained",
      methods: [
        { kind: "call", name: "generate", slots: [], classifies: "third-party-integration" },
      ],
    },
  ],
}
