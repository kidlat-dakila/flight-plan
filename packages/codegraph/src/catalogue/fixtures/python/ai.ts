import type { PatternFixture } from "@/catalogue/types"

const OPENAI_PYTHON = "OpenAI for Python"

export const openaiPythonFixtures: readonly PatternFixture[] = [
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()",
    ],
    rejects: [
      "def OpenAI(*parts, **options):\n    return parts\n\nclient = OpenAI()",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:responses.create:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\nresponse = client.responses.create(model=\"gpt-5.5\", input=\"How do I check if a Python object is an instance of a class?\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresponse = client.responses.create(model=\"gpt-5.5\", input=\"How do I check if a Python object is an instance of a class?\")",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:chat.completions.create:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\ncompletion = client.chat.completions.create(model=\"gpt-5.5\", messages=[{\"role\": \"user\", \"content\": \"Hello\"}])",
    ],
    rejects: [
      "client = LocalRegistry()\n\ncompletion = client.chat.completions.create(model=\"gpt-5.5\", messages=[{\"role\": \"user\", \"content\": \"Hello\"}])",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:embeddings.create:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\nembedding = client.embeddings.create(model=\"text-embedding-3-small\", input=\"Hello\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nembedding = client.embeddings.create(model=\"text-embedding-3-small\", input=\"Hello\")",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:images.generate:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\nimage = client.images.generate(model=\"gpt-image-1\", prompt=\"A cute baby sea otter\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nimage = client.images.generate(model=\"gpt-image-1\", prompt=\"A cute baby sea otter\")",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:audio.transcriptions.create:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\ntranscription = client.audio.transcriptions.create(model=\"whisper-1\", file=audio_file)",
    ],
    rejects: [
      "client = LocalRegistry()\n\ntranscription = client.audio.transcriptions.create(model=\"whisper-1\", file=audio_file)",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:models.list:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\nmodels = client.models.list()",
    ],
    rejects: [
      "client = LocalRegistry()\n\nmodels = client.models.list()",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:webhooks.unwrap:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\nevent = client.webhooks.unwrap(request_body, request.headers)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nevent = client.webhooks.unwrap(request_body, request.headers)",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:OpenAI:*>call:webhooks.verify_signature:*",
    matches: [
      "from openai import OpenAI\n\nclient = OpenAI()\n\nclient.webhooks.verify_signature(request_body, request.headers)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nclient.webhooks.verify_signature(request_body, request.headers)",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()",
    ],
    rejects: [
      "def AsyncOpenAI(*parts, **options):\n    return parts\n\nclient = AsyncOpenAI()",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:responses.create:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\nresponse = client.responses.create(model=\"gpt-5.5\", input=\"How do I check if a Python object is an instance of a class?\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresponse = client.responses.create(model=\"gpt-5.5\", input=\"How do I check if a Python object is an instance of a class?\")",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:chat.completions.create:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\ncompletion = client.chat.completions.create(model=\"gpt-5.5\", messages=[{\"role\": \"user\", \"content\": \"Hello\"}])",
    ],
    rejects: [
      "client = LocalRegistry()\n\ncompletion = client.chat.completions.create(model=\"gpt-5.5\", messages=[{\"role\": \"user\", \"content\": \"Hello\"}])",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:embeddings.create:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\nembedding = client.embeddings.create(model=\"text-embedding-3-small\", input=\"Hello\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nembedding = client.embeddings.create(model=\"text-embedding-3-small\", input=\"Hello\")",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:images.generate:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\nimage = client.images.generate(model=\"gpt-image-1\", prompt=\"A cute baby sea otter\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nimage = client.images.generate(model=\"gpt-image-1\", prompt=\"A cute baby sea otter\")",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:audio.transcriptions.create:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\ntranscription = client.audio.transcriptions.create(model=\"whisper-1\", file=audio_file)",
    ],
    rejects: [
      "client = LocalRegistry()\n\ntranscription = client.audio.transcriptions.create(model=\"whisper-1\", file=audio_file)",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:models.list:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\nmodels = client.models.list()",
    ],
    rejects: [
      "client = LocalRegistry()\n\nmodels = client.models.list()",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:webhooks.unwrap:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\nevent = client.webhooks.unwrap(request_body, request.headers)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nevent = client.webhooks.unwrap(request_body, request.headers)",
    ],
  },
  {
    library: OPENAI_PYTHON,
    patternKey: "factory:AsyncOpenAI:*>call:webhooks.verify_signature:*",
    matches: [
      "from openai import AsyncOpenAI\n\nclient = AsyncOpenAI()\n\nclient.webhooks.verify_signature(request_body, request.headers)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nclient.webhooks.verify_signature(request_body, request.headers)",
    ],
  },
]

const LANGCHAIN = "LangChain"

export const langchainFixtures: readonly PatternFixture[] = [
  {
    library: LANGCHAIN,
    patternKey: "factory:init_chat_model:*",
    matches: [
      "from langchain.chat_models import init_chat_model\n\nmodel = init_chat_model(\"gpt-5.5\")",
    ],
    rejects: [
      "def init_chat_model(*parts, **options):\n    return parts\n\nmodel = init_chat_model(\"gpt-5.5\")",
    ],
  },
  {
    library: LANGCHAIN,
    patternKey: "factory:init_chat_model:*>call:invoke:*",
    matches: [
      "from langchain.chat_models import init_chat_model\n\nmodel = init_chat_model(\"gpt-5.5\")\n\nresponse = model.invoke(\"Why do parrots talk?\")",
    ],
    rejects: [
      "model = LocalRegistry()\n\nresponse = model.invoke(\"Why do parrots talk?\")",
    ],
  },
  {
    library: LANGCHAIN,
    patternKey: "factory:init_chat_model:*>call:stream:*",
    matches: [
      "from langchain.chat_models import init_chat_model\n\nmodel = init_chat_model(\"gpt-5.5\")\n\nfor chunk in model.stream(\"Why do parrots have colorful feathers?\"):\n    print(chunk.text)",
    ],
    rejects: [
      "model = LocalRegistry()\n\nfor chunk in model.stream(\"Why do parrots have colorful feathers?\"):\n    print(chunk.text)",
    ],
  },
  {
    library: LANGCHAIN,
    patternKey: "factory:init_chat_model:*>call:batch:*",
    matches: [
      "from langchain.chat_models import init_chat_model\n\nmodel = init_chat_model(\"gpt-5.5\")\n\nresponses = model.batch([\"Why do parrots talk?\", \"How do airplanes fly?\"])",
    ],
    rejects: [
      "model = LocalRegistry()\n\nresponses = model.batch([\"Why do parrots talk?\", \"How do airplanes fly?\"])",
    ],
  },
  {
    library: LANGCHAIN,
    patternKey: "factory:create_agent:*",
    matches: [
      "from langchain.agents import create_agent\n\nagent = create_agent(model=\"openai:gpt-5.5\", tools=[search])",
    ],
    rejects: [
      "def create_agent(*parts, **options):\n    return parts\n\nagent = create_agent(model=\"openai:gpt-5.5\", tools=[search])",
    ],
  },
  {
    library: LANGCHAIN,
    patternKey: "factory:create_agent:*>call:invoke:*",
    matches: [
      "from langchain.agents import create_agent\n\nagent = create_agent(model=\"openai:gpt-5.5\", tools=[search])\n\nresult = agent.invoke({\"messages\": [{\"role\": \"user\", \"content\": \"What's the weather?\"}]}, config=config)",
    ],
    rejects: [
      "agent = LocalRegistry()\n\nresult = agent.invoke({\"messages\": [{\"role\": \"user\", \"content\": \"What's the weather?\"}]}, config=config)",
    ],
  },
  {
    library: LANGCHAIN,
    patternKey: "factory:create_agent:*>call:stream_events:*",
    matches: [
      "from langchain.agents import create_agent\n\nagent = create_agent(model=\"openai:gpt-5.5\", tools=[search])\n\nstream = agent.stream_events({\"messages\": [{\"role\": \"user\", \"content\": \"Search for AI news\"}]}, version=\"v3\")",
    ],
    rejects: [
      "agent = LocalRegistry()\n\nstream = agent.stream_events({\"messages\": [{\"role\": \"user\", \"content\": \"Search for AI news\"}]}, version=\"v3\")",
    ],
  },
]

const ANTHROPIC_PYTHON = "Anthropic for Python"

export const anthropicPythonFixtures: readonly PatternFixture[] = [
  {
    library: ANTHROPIC_PYTHON,
    patternKey: "factory:Anthropic:*",
    matches: [
      "from anthropic import Anthropic\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))",
    ],
    rejects: [
      "def Anthropic(*parts, **options):\n    return parts\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))",
    ],
  },
  {
    library: ANTHROPIC_PYTHON,
    patternKey: "factory:Anthropic:*>call:messages.create:*",
    matches: [
      "from anthropic import Anthropic\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))\n\nmessage = client.messages.create(max_tokens=1024, messages=[{\"role\": \"user\", \"content\": \"Hello, Claude\"}], model=\"claude-opus-5-5\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nmessage = client.messages.create(max_tokens=1024, messages=[{\"role\": \"user\", \"content\": \"Hello, Claude\"}], model=\"claude-opus-5-5\")",
    ],
  },
  {
    library: ANTHROPIC_PYTHON,
    patternKey: "factory:Anthropic:*>call:messages.stream:*",
    matches: [
      "from anthropic import Anthropic\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))\n\nwith client.messages.stream(max_tokens=1024, messages=messages, model=\"claude-opus-5-5\") as stream:\n    print(stream.get_final_text())",
    ],
    rejects: [
      "client = LocalRegistry()\n\nwith client.messages.stream(max_tokens=1024, messages=messages, model=\"claude-opus-5-5\") as stream:\n    print(stream.get_final_text())",
    ],
  },
  {
    library: ANTHROPIC_PYTHON,
    patternKey: "factory:Anthropic:*>call:messages.count_tokens:*",
    matches: [
      "from anthropic import Anthropic\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))\n\ncount = client.messages.count_tokens(messages=messages, model=\"claude-opus-5-5\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\ncount = client.messages.count_tokens(messages=messages, model=\"claude-opus-5-5\")",
    ],
  },
  {
    library: ANTHROPIC_PYTHON,
    patternKey: "factory:Anthropic:*>call:models.list:*",
    matches: [
      "from anthropic import Anthropic\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))\n\nmodels = client.models.list()",
    ],
    rejects: [
      "client = LocalRegistry()\n\nmodels = client.models.list()",
    ],
  },
  {
    library: ANTHROPIC_PYTHON,
    patternKey: "factory:Anthropic:*>call:models.retrieve:*",
    matches: [
      "from anthropic import Anthropic\n\nclient = Anthropic(api_key=os.environ.get(\"ANTHROPIC_API_KEY\"))\n\nmodel = client.models.retrieve(\"claude-opus-5-5\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nmodel = client.models.retrieve(\"claude-opus-5-5\")",
    ],
  },
]

const GOOGLE_GEN_AI = "Google Gen AI"

export const googleGenAiFixtures: readonly PatternFixture[] = [
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")",
    ],
    rejects: [
      "genai = LocalRegistry()\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>call:models.generate_content:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nresponse = client.models.generate_content(model=\"gemini-flash-latest\", contents=\"Why is the sky blue?\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresponse = client.models.generate_content(model=\"gemini-flash-latest\", contents=\"Why is the sky blue?\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>call:models.generate_content_stream:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nfor chunk in client.models.generate_content_stream(model=\"gemini-flash-latest\", contents=\"Tell me a story\"):\n    print(chunk.text)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nfor chunk in client.models.generate_content_stream(model=\"gemini-flash-latest\", contents=\"Tell me a story\"):\n    print(chunk.text)",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>call:models.embed_content:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nresponse = client.models.embed_content(model=\"gemini-embedding-001\", contents=\"why is the sky blue?\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresponse = client.models.embed_content(model=\"gemini-embedding-001\", contents=\"why is the sky blue?\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>call:models.generate_images:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nresponse = client.models.generate_images(model=\"imagen-4.0-generate-001\", prompt=\"An umbrella in the foreground\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nresponse = client.models.generate_images(model=\"imagen-4.0-generate-001\", prompt=\"An umbrella in the foreground\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>call:models.generate_videos:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\noperation = client.models.generate_videos(model=\"veo-3.0-generate-001\", prompt=\"A neon hologram of a cat\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\noperation = client.models.generate_videos(model=\"veo-3.0-generate-001\", prompt=\"A neon hologram of a cat\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>call:models.list:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nfor model in client.models.list():\n    print(model)",
    ],
    rejects: [
      "client = LocalRegistry()\n\nfor model in client.models.list():\n    print(model)",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>factory:chats.create:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nchat = client.chats.create(model=\"gemini-flash-latest\")",
    ],
    rejects: [
      "client = LocalRegistry()\n\nchat = client.chats.create(model=\"gemini-flash-latest\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>factory:chats.create:*>call:send_message:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nchat = client.chats.create(model=\"gemini-flash-latest\")\n\nresponse = chat.send_message(\"tell me a story\")",
    ],
    rejects: [
      "chat = LocalRegistry()\n\nresponse = chat.send_message(\"tell me a story\")",
    ],
  },
  {
    library: GOOGLE_GEN_AI,
    patternKey: "factory:Client:*>factory:chats.create:*>call:send_message_stream:*",
    matches: [
      "from google import genai\n\nclient = genai.Client(api_key=\"GEMINI_API_KEY\")\n\nchat = client.chats.create(model=\"gemini-flash-latest\")\n\nfor chunk in chat.send_message_stream(\"tell me a story\"):\n    print(chunk.text)",
    ],
    rejects: [
      "chat = LocalRegistry()\n\nfor chunk in chat.send_message_stream(\"tell me a story\"):\n    print(chunk.text)",
    ],
  },
]

const TRANSFORMERS = "Transformers"

export const transformersFixtures: readonly PatternFixture[] = [
  {
    library: TRANSFORMERS,
    patternKey: "factory:pipeline:*",
    matches: [
      "from transformers import pipeline\n\ngenerator = pipeline(task=\"text-generation\", model=\"Qwen/Qwen2.5-1.5B\")",
    ],
    rejects: [
      "def pipeline(*parts, **options):\n    return parts\n\ngenerator = pipeline(task=\"text-generation\", model=\"Qwen/Qwen2.5-1.5B\")",
    ],
  },
  {
    library: TRANSFORMERS,
    patternKey: "factory:pipeline:*>called",
    matches: [
      "from transformers import pipeline\n\ngenerator = pipeline(task=\"text-generation\", model=\"Qwen/Qwen2.5-1.5B\")\n\ngenerator(\"the secret to baking a really good cake is \")",
    ],
    rejects: [
      "generator = LocalRegistry()\n\ngenerator(\"the secret to baking a really good cake is \")",
    ],
  },
  {
    library: TRANSFORMERS,
    patternKey: "factory:AutoModelForCausalLM.from_pretrained:*",
    matches: [
      "from transformers import AutoModelForCausalLM\n\nmodel = AutoModelForCausalLM.from_pretrained(\"mistralai/Mistral-7B-v0.1\", device_map=\"auto\")",
    ],
    rejects: [
      "AutoModelForCausalLM = LocalRegistry()\n\nmodel = AutoModelForCausalLM.from_pretrained(\"mistralai/Mistral-7B-v0.1\", device_map=\"auto\")",
    ],
  },
  {
    library: TRANSFORMERS,
    patternKey: "factory:AutoModelForCausalLM.from_pretrained:*>call:generate:*",
    matches: [
      "from transformers import AutoModelForCausalLM\n\nmodel = AutoModelForCausalLM.from_pretrained(\"mistralai/Mistral-7B-v0.1\", device_map=\"auto\")\n\ngenerated_ids = model.generate(**model_inputs)",
    ],
    rejects: [
      "model = LocalRegistry()\n\ngenerated_ids = model.generate(**model_inputs)",
    ],
  },
]
