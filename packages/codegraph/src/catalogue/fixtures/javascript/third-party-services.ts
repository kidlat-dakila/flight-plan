import type { PatternFixture } from "@/catalogue/types"

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

const NHOST = "Nhost"

export const nhostFixtures: readonly PatternFixture[] = [
  {
    library: NHOST,
    patternKey: "factory:createClient:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })",
    ],
    rejects: [
      "const createClient = (...parts) => parts\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })",
    ],
  },
  {
    library: NHOST,
    patternKey: "factory:createClient:*>call:signInEmailPassword:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })\nawait nhost.auth.signInEmailPassword({ email, password })",
    ],
    rejects: [
      "const nhost = makeLocalRegistry()\nawait nhost.auth.signInEmailPassword({ email, password })",
    ],
  },
  {
    library: NHOST,
    patternKey: "factory:createClient:*>call:request:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })\nconst users = await nhost.graphql.request({ query: \"query { users { id } }\" })",
    ],
    rejects: [
      "const nhost = makeLocalRegistry()\nconst users = await nhost.graphql.request({ query: \"query { users { id } }\" })",
    ],
  },
  {
    library: NHOST,
    patternKey: "factory:createClient:*>call:uploadFiles:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })\nawait nhost.storage.uploadFiles({ \"file[]\": [new File([\"hi\"], \"hi.txt\")] })",
    ],
    rejects: [
      "const nhost = makeLocalRegistry()\nawait nhost.storage.uploadFiles({ \"file[]\": [new File([\"hi\"], \"hi.txt\")] })",
    ],
  },
]

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

const OCTOKIT = "Octokit"

export const octokitFixtures: readonly PatternFixture[] = [
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })",
    ],
    rejects: [
      "const Octokit = (...parts) => parts\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:request:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nawait octokit.request(\"POST /repos/{owner}/{repo}/issues\", { owner, repo, title })",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nawait octokit.request(\"POST /repos/{owner}/{repo}/issues\", { owner, repo, title })",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:paginate:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nconst issues = await octokit.paginate(\"GET /repos/{owner}/{repo}/issues\", { owner, repo })",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nconst issues = await octokit.paginate(\"GET /repos/{owner}/{repo}/issues\", { owner, repo })",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:graphql:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nconst { viewer } = await octokit.graphql(\"query { viewer { login } }\")",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nconst { viewer } = await octokit.graphql(\"query { viewer { login } }\")",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:create:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nawait octokit.rest.issues.create({ owner, repo, title })",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nawait octokit.rest.issues.create({ owner, repo, title })",
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

const SUPABASE = "Supabase"

export const supabaseFixtures: readonly PatternFixture[] = [
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)",
    ],
    rejects: [
      "const createClient = (...parts) => parts\nconst supabase = createClient(supabaseUrl, supabaseKey)",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:from:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nconst { data, error } = await supabase.from(\"countries\").select()",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nconst { data, error } = await supabase.from(\"countries\").select()",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:rpc:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nconst { data, error } = await supabase.rpc(\"hello_world\")",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nconst { data, error } = await supabase.rpc(\"hello_world\")",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:signInWithPassword:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nawait supabase.auth.signInWithPassword({ email, password })",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nawait supabase.auth.signInWithPassword({ email, password })",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:getUser:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nconst { data: { user } } = await supabase.auth.getUser()",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nconst { data: { user } } = await supabase.auth.getUser()",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:signOut:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nawait supabase.auth.signOut()",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nawait supabase.auth.signOut()",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:onAuthStateChange:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nsupabase.auth.onAuthStateChange((event, session) => { report(event) })",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nsupabase.auth.onAuthStateChange((event, session) => { report(event) })",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:invoke:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nawait supabase.functions.invoke(\"hello\", { body: { name: \"Ada\" } })",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nawait supabase.functions.invoke(\"hello\", { body: { name: \"Ada\" } })",
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

const YOUTUBE_JS = "YouTube.js"

export const youtubeJsFixtures: readonly PatternFixture[] = [
  {
    library: YOUTUBE_JS,
    patternKey: "factory:Innertube.create:*",
    matches: [
      "import { Innertube } from \"youtubei.js\"\nconst youtube = await Innertube.create()",
    ],
    rejects: [
      "const Innertube = makeLocalRegistry()\nconst youtube = await Innertube.create()",
    ],
  },
]
