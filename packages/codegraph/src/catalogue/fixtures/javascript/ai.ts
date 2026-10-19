import type { PatternFixture } from "@/catalogue/types"

const HUGGINGFACE_JS = "HuggingFace.js"

export const huggingfaceJsFixtures: readonly PatternFixture[] = [
  {
    library: HUGGINGFACE_JS,
    patternKey: "call:createRepo:*",
    matches: [
      "import { createRepo } from \"@huggingface/hub\"\nawait createRepo({ repo, accessToken })",
    ],
    rejects: [
      "const createRepo = (...parts) => parts\nawait createRepo({ repo, accessToken })",
    ],
  },
  {
    library: HUGGINGFACE_JS,
    patternKey: "call:uploadFiles:*",
    matches: [
      "import { uploadFiles } from \"@huggingface/hub\"\nawait uploadFiles({ repo, accessToken })",
    ],
    rejects: [
      "const uploadFiles = (...parts) => parts\nawait uploadFiles({ repo, accessToken })",
    ],
  },
  {
    library: HUGGINGFACE_JS,
    patternKey: "call:deleteRepo:*",
    matches: [
      "import { deleteRepo } from \"@huggingface/hub\"\nawait deleteRepo({ repo, accessToken })",
    ],
    rejects: [
      "const deleteRepo = (...parts) => parts\nawait deleteRepo({ repo, accessToken })",
    ],
  },
  {
    library: HUGGINGFACE_JS,
    patternKey: "call:listModels:*",
    matches: [
      "import { listModels } from \"@huggingface/hub\"\nfor await (const model of listModels({ search: { owner: \"username\" } })) { report(model) }",
    ],
    rejects: [
      "const listModels = (...parts) => parts\nfor await (const model of listModels({ search: { owner: \"username\" } })) { report(model) }",
    ],
  },
  {
    library: HUGGINGFACE_JS,
    patternKey: "factory:InferenceClient:*",
    matches: [
      "import { InferenceClient } from \"@huggingface/inference\"\nconst client = new InferenceClient(process.env.HF_TOKEN)",
    ],
    rejects: [
      "const InferenceClient = (...parts) => parts\nconst client = new InferenceClient(process.env.HF_TOKEN)",
    ],
  },
  {
    library: HUGGINGFACE_JS,
    patternKey: "factory:InferenceClient:*>call:chatCompletion:*",
    matches: [
      "import { InferenceClient } from \"@huggingface/inference\"\nconst client = new InferenceClient(process.env.HF_TOKEN)\nconst out = await client.chatCompletion({ model, messages })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst out = await client.chatCompletion({ model, messages })",
    ],
  },
]

const VERCEL_AI_SDK = "Vercel AI SDK"

export const vercelAiSdkFixtures: readonly PatternFixture[] = [
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:generateText:*",
    matches: [
      "import { generateText } from \"ai\"\nconst { text } = await generateText({ model: \"openai/gpt-5.5\", prompt: \"Write a haiku.\" })",
    ],
    rejects: [
      "const generateText = (...parts) => parts\nconst { text } = await generateText({ model: \"openai/gpt-5.5\", prompt: \"Write a haiku.\" })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:streamText:*",
    matches: [
      "import { streamText } from \"ai\"\nconst result = streamText({ model: \"openai/gpt-5.5\", prompt: \"Write a haiku.\" })",
    ],
    rejects: [
      "const streamText = (...parts) => parts\nconst result = streamText({ model: \"openai/gpt-5.5\", prompt: \"Write a haiku.\" })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:generateObject:*",
    matches: [
      "import { generateObject } from \"ai\"\nconst { object } = await generateObject({ model: \"anthropic/claude-sonnet-5.5\", schema, prompt: \"Generate a lasagna recipe.\" })",
    ],
    rejects: [
      "const generateObject = (...parts) => parts\nconst { object } = await generateObject({ model: \"anthropic/claude-sonnet-5.5\", schema, prompt: \"Generate a lasagna recipe.\" })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:embed:*",
    matches: [
      "import { embed } from \"ai\"\nconst { embedding } = await embed({ model: \"openai/text-embedding-3-small\", value: \"sunny day at the beach\" })",
    ],
    rejects: [
      "const embed = (...parts) => parts\nconst { embedding } = await embed({ model: \"openai/text-embedding-3-small\", value: \"sunny day at the beach\" })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:embedMany:*",
    matches: [
      "import { embedMany } from \"ai\"\nconst { embeddings } = await embedMany({ model: \"openai/text-embedding-3-small\", values: [\"sunny day\", \"rainy day\"] })",
    ],
    rejects: [
      "const embedMany = (...parts) => parts\nconst { embeddings } = await embedMany({ model: \"openai/text-embedding-3-small\", values: [\"sunny day\", \"rainy day\"] })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:generateImage:*",
    matches: [
      "import { generateImage } from \"ai\"\nconst { image } = await generateImage({ model: \"openai/dall-e-3\", prompt: \"Santa Claus driving a Cadillac\" })",
    ],
    rejects: [
      "const generateImage = (...parts) => parts\nconst { image } = await generateImage({ model: \"openai/dall-e-3\", prompt: \"Santa Claus driving a Cadillac\" })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:transcribe:*",
    matches: [
      "import { transcribe } from \"ai\"\nconst transcript = await transcribe({ model: \"openai/whisper-1\", audio })",
    ],
    rejects: [
      "const transcribe = (...parts) => parts\nconst transcript = await transcribe({ model: \"openai/whisper-1\", audio })",
    ],
  },
  {
    library: VERCEL_AI_SDK,
    patternKey: "call:generateSpeech:*",
    matches: [
      "import { generateSpeech } from \"ai\"\nconst audio = await generateSpeech({ model: \"openai/tts-1\", text: \"Hello, world!\" })",
    ],
    rejects: [
      "const generateSpeech = (...parts) => parts\nconst audio = await generateSpeech({ model: \"openai/tts-1\", text: \"Hello, world!\" })",
    ],
  },
]

const LANGCHAIN_JS = "LangChain.js"

export const langchainJsFixtures: readonly PatternFixture[] = [
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:initChatModel:*",
    matches: [
      "import { initChatModel } from \"langchain\"\nconst model = await initChatModel(\"gpt-5.5\")",
    ],
    rejects: [
      "const initChatModel = (...parts) => parts\nconst model = await initChatModel(\"gpt-5.5\")",
    ],
  },
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:initChatModel:*>call:invoke:*",
    matches: [
      "import { initChatModel } from \"langchain\"\nconst model = await initChatModel(\"gpt-5.5\")\nconst response = await model.invoke(\"Why do parrots have colorful feathers?\")",
    ],
    rejects: [
      "const model = makeLocalRegistry()\nconst response = await model.invoke(\"Why do parrots have colorful feathers?\")",
    ],
  },
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:initChatModel:*>call:stream:*",
    matches: [
      "import { initChatModel } from \"langchain\"\nconst model = await initChatModel(\"gpt-5.5\")\nconst stream = await model.stream(\"Why do parrots have colorful feathers?\")",
    ],
    rejects: [
      "const model = makeLocalRegistry()\nconst stream = await model.stream(\"Why do parrots have colorful feathers?\")",
    ],
  },
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:initChatModel:*>call:batch:*",
    matches: [
      "import { initChatModel } from \"langchain\"\nconst model = await initChatModel(\"gpt-5.5\")\nconst responses = await model.batch([\"Why do parrots talk?\", \"How do airplanes fly?\"])",
    ],
    rejects: [
      "const model = makeLocalRegistry()\nconst responses = await model.batch([\"Why do parrots talk?\", \"How do airplanes fly?\"])",
    ],
  },
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:createAgent:*",
    matches: [
      "import { createAgent } from \"langchain\"\nconst agent = createAgent({ model: \"gpt-5.5\", tools: [search] })",
    ],
    rejects: [
      "const createAgent = (...parts) => parts\nconst agent = createAgent({ model: \"gpt-5.5\", tools: [search] })",
    ],
  },
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:createAgent:*>call:invoke:*",
    matches: [
      "import { createAgent } from \"langchain\"\nconst agent = createAgent({ model: \"gpt-5.5\", tools: [search] })\nconst result = await agent.invoke({ messages: [{ role: \"user\", content: \"What is the weather?\" }] }, config)",
    ],
    rejects: [
      "const agent = makeLocalRegistry()\nconst result = await agent.invoke({ messages: [{ role: \"user\", content: \"What is the weather?\" }] }, config)",
    ],
  },
  {
    library: LANGCHAIN_JS,
    patternKey: "factory:createAgent:*>call:streamEvents:*",
    matches: [
      "import { createAgent } from \"langchain\"\nconst agent = createAgent({ model: \"gpt-5.5\", tools: [search] })\nconst stream = await agent.streamEvents({ messages: [{ role: \"user\", content: \"Search for AI news\" }] }, { version: \"v3\" })",
    ],
    rejects: [
      "const agent = makeLocalRegistry()\nconst stream = await agent.streamEvents({ messages: [{ role: \"user\", content: \"Search for AI news\" }] }, { version: \"v3\" })",
    ],
  },
]

const ANTHROPIC = "Anthropic"

export const anthropicFixtures: readonly PatternFixture[] = [
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })",
    ],
    rejects: [
      "const Anthropic = (...parts) => parts\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })",
    ],
  },
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*>call:messages.create:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })\nconst message = await client.messages.create({ max_tokens: 1024, messages: [{ role: \"user\", content: \"Hello, Claude\" }], model: \"claude-opus-5-5\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst message = await client.messages.create({ max_tokens: 1024, messages: [{ role: \"user\", content: \"Hello, Claude\" }], model: \"claude-opus-5-5\" })",
    ],
  },
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*>call:messages.stream:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })\nconst stream = client.messages.stream({ max_tokens: 1024, messages, model: \"claude-opus-5-5\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst stream = client.messages.stream({ max_tokens: 1024, messages, model: \"claude-opus-5-5\" })",
    ],
  },
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*>call:messages.countTokens:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })\nconst count = await client.messages.countTokens({ messages, model: \"claude-opus-5-5\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst count = await client.messages.countTokens({ messages, model: \"claude-opus-5-5\" })",
    ],
  },
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*>call:messages.batches.create:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })\nconst batch = await client.messages.batches.create({ requests })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst batch = await client.messages.batches.create({ requests })",
    ],
  },
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*>call:models.list:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })\nconst models = await client.models.list()",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst models = await client.models.list()",
    ],
  },
  {
    library: ANTHROPIC,
    patternKey: "factory:default:*>call:models.retrieve:*",
    matches: [
      "import Anthropic from \"@anthropic-ai/sdk\"\nconst client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })\nconst model = await client.models.retrieve(\"claude-opus-5-5\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst model = await client.models.retrieve(\"claude-opus-5-5\")",
    ],
  },
]

const OPENAI = "OpenAI"

export const openaiFixtures: readonly PatternFixture[] = [
  {
    library: OPENAI,
    patternKey: "factory:default:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })",
    ],
    rejects: [
      "const OpenAI = (...parts) => parts\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:responses.create:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst response = await client.responses.create({ model: \"gpt-5.5\", input: \"Say this is a test\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst response = await client.responses.create({ model: \"gpt-5.5\", input: \"Say this is a test\" })",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:chat.completions.create:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst completion = await client.chat.completions.create({ model: \"gpt-5.5\", messages: [{ role: \"user\", content: \"Hello\" }] })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst completion = await client.chat.completions.create({ model: \"gpt-5.5\", messages: [{ role: \"user\", content: \"Hello\" }] })",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:embeddings.create:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst embedding = await client.embeddings.create({ model: \"text-embedding-3-small\", input: \"Hello\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst embedding = await client.embeddings.create({ model: \"text-embedding-3-small\", input: \"Hello\" })",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:images.generate:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst image = await client.images.generate({ model: \"gpt-image-1\", prompt: \"A cute baby sea otter\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst image = await client.images.generate({ model: \"gpt-image-1\", prompt: \"A cute baby sea otter\" })",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:audio.transcriptions.create:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst transcription = await client.audio.transcriptions.create({ file, model: \"whisper-1\" })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst transcription = await client.audio.transcriptions.create({ file, model: \"whisper-1\" })",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:models.list:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst models = await client.models.list()",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst models = await client.models.list()",
    ],
  },
  {
    library: OPENAI,
    patternKey: "factory:default:*>call:webhooks.unwrap:*",
    matches: [
      "import OpenAI from \"openai\"\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })\nconst event = await client.webhooks.unwrap(body, headersList)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst event = await client.webhooks.unwrap(body, headersList)",
    ],
  },
]
