import type { PatternFixture } from "@/catalogue/types"

const ARKENV = "ArkEnv"

export const arkenvFixtures: readonly PatternFixture[] = [
  {
    library: ARKENV,
    patternKey: "call:default:*",
    matches: [
      "import arkenv from \"arkenv\"\nconst env = arkenv({ HOST: \"string.host\", PORT: \"number.port\" })",
    ],
    rejects: [
      "const arkenv = (...parts) => parts\nconst env = arkenv({ HOST: \"string.host\", PORT: \"number.port\" })",
    ],
  },
]

const C12 = "c12"

export const c12Fixtures: readonly PatternFixture[] = [
  {
    library: C12,
    patternKey: "call:loadConfig:*",
    matches: [
      "import { loadConfig } from \"c12\"\nconst { config } = await loadConfig({ name: \"myapp\" })",
    ],
    rejects: [
      "const loadConfig = (...parts) => parts\nconst { config } = await loadConfig({ name: \"myapp\" })",
    ],
  },
  {
    library: C12,
    patternKey: "call:watchConfig:*",
    matches: [
      "import { watchConfig } from \"c12\"\nconst config = await watchConfig({ name: \"myapp\", onUpdate({ getDiff }) { report(getDiff()) } })",
    ],
    rejects: [
      "const watchConfig = (...parts) => parts\nconst config = await watchConfig({ name: \"myapp\", onUpdate({ getDiff }) { report(getDiff()) } })",
    ],
  },
]

const CONVICT = "Convict"

export const convictFixtures: readonly PatternFixture[] = [
  {
    library: CONVICT,
    patternKey: "factory:default:*",
    matches: [
      "import convict from \"convict\"\nconst config = convict({ env: { format: [\"production\", \"development\"], default: \"development\", env: \"NODE_ENV\" } })",
    ],
    rejects: [
      "const convict = (...parts) => parts\nconst config = convict({ env: { format: [\"production\", \"development\"], default: \"development\", env: \"NODE_ENV\" } })",
    ],
  },
  {
    library: CONVICT,
    patternKey: "factory:default:*>call:get:*",
    matches: [
      "import convict from \"convict\"\nconst config = convict({ env: { format: [\"production\", \"development\"], default: \"development\", env: \"NODE_ENV\" } })\nconfig.get(\"env\")",
    ],
    rejects: [
      "const config = makeLocalRegistry()\nconfig.get(\"env\")",
    ],
  },
  {
    library: CONVICT,
    patternKey: "factory:default:*>call:loadFile:*",
    matches: [
      "import convict from \"convict\"\nconst config = convict({ env: { format: [\"production\", \"development\"], default: \"development\", env: \"NODE_ENV\" } })\nconfig.loadFile(\"env\")",
    ],
    rejects: [
      "const config = makeLocalRegistry()\nconfig.loadFile(\"env\")",
    ],
  },
  {
    library: CONVICT,
    patternKey: "factory:default:*>call:validate:*",
    matches: [
      "import convict from \"convict\"\nconst config = convict({ env: { format: [\"production\", \"development\"], default: \"development\", env: \"NODE_ENV\" } })\nconfig.validate(\"env\")",
    ],
    rejects: [
      "const config = makeLocalRegistry()\nconfig.validate(\"env\")",
    ],
  },
]

const DOTENV = "Dotenv"

export const dotenvFixtures: readonly PatternFixture[] = [
  {
    library: DOTENV,
    patternKey: "call:default.config:*",
    matches: [
      "import dotenv from \"dotenv\"\ndotenv.config({ path: \"/custom/path/to/.env\" })",
    ],
    rejects: [
      "const dotenv = makeLocalRegistry()\ndotenv.config({ path: \"/custom/path/to/.env\" })",
    ],
  },
  {
    library: DOTENV,
    patternKey: "call:default.parse:*",
    matches: [
      "import dotenv from \"dotenv\"\nconst config = dotenv.parse(Buffer.from(\"BASIC=basic\"))",
    ],
    rejects: [
      "const dotenv = makeLocalRegistry()\nconst config = dotenv.parse(Buffer.from(\"BASIC=basic\"))",
    ],
  },
  {
    library: DOTENV,
    patternKey: "call:default.populate:*",
    matches: [
      "import dotenv from \"dotenv\"\ndotenv.populate(process.env, parsed)",
    ],
    rejects: [
      "const dotenv = makeLocalRegistry()\ndotenv.populate(process.env, parsed)",
    ],
  },
]

const DOTENV_FLOW = "dotenv-flow"

export const dotenvFlowFixtures: readonly PatternFixture[] = [
  {
    library: DOTENV_FLOW,
    patternKey: "call:default.config:*",
    matches: [
      "import dotenvFlow from \"dotenv-flow\"\ndotenvFlow.config({ node_env: \"production\" })",
    ],
    rejects: [
      "const dotenvFlow = makeLocalRegistry()\ndotenvFlow.config({ node_env: \"production\" })",
    ],
  },
  {
    library: DOTENV_FLOW,
    patternKey: "call:default.load:*",
    matches: [
      "import dotenvFlow from \"dotenv-flow\"\ndotenvFlow.load([\".env\", \".env.local\"])",
    ],
    rejects: [
      "const dotenvFlow = makeLocalRegistry()\ndotenvFlow.load([\".env\", \".env.local\"])",
    ],
  },
]

const DOTENVX = "dotenvx"

export const dotenvxFixtures: readonly PatternFixture[] = [
  {
    library: DOTENVX,
    patternKey: "call:default.config:*",
    matches: [
      "import dotenvx from \"@dotenvx/dotenvx\"\ndotenvx.config()",
    ],
    rejects: [
      "const dotenvx = makeLocalRegistry()\ndotenvx.config()",
    ],
  },
  {
    library: DOTENVX,
    patternKey: "call:default.set:*",
    matches: [
      "import dotenvx from \"@dotenvx/dotenvx\"\ndotenvx.set(\"HELLO\", \"World\", { path: \".env\" })",
    ],
    rejects: [
      "const dotenvx = makeLocalRegistry()\ndotenvx.set(\"HELLO\", \"World\", { path: \".env\" })",
    ],
  },
]

const ENVALID = "Envalid"

export const envalidFixtures: readonly PatternFixture[] = [
  {
    library: ENVALID,
    patternKey: "call:cleanEnv:*",
    matches: [
      "import { cleanEnv } from \"envalid\"\nconst env = cleanEnv(process.env, { API_KEY: str(), ADMIN_EMAIL: email() })",
    ],
    rejects: [
      "const cleanEnv = (...parts) => parts\nconst env = cleanEnv(process.env, { API_KEY: str(), ADMIN_EMAIL: email() })",
    ],
  },
  {
    library: ENVALID,
    patternKey: "call:customCleanEnv:*",
    matches: [
      "import { customCleanEnv } from \"envalid\"\nconst env = customCleanEnv(process.env, { API_KEY: str() }, (cleaned) => cleaned)",
    ],
    rejects: [
      "const customCleanEnv = (...parts) => parts\nconst env = customCleanEnv(process.env, { API_KEY: str() }, (cleaned) => cleaned)",
    ],
  },
]

const NCONF = "nconf"

export const nconfFixtures: readonly PatternFixture[] = [
  {
    library: NCONF,
    patternKey: "call:default.get:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.get(\"database:host\")",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.get(\"database:host\")",
    ],
  },
  {
    library: NCONF,
    patternKey: "call:default.set:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.set(\"database:host\", \"127.0.0.1\")",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.set(\"database:host\", \"127.0.0.1\")",
    ],
  },
  {
    library: NCONF,
    patternKey: "call:default.file:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.file({ file: \"config.json\" })",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.file({ file: \"config.json\" })",
    ],
  },
  {
    library: NCONF,
    patternKey: "call:default.env:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.env()",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.env()",
    ],
  },
  {
    library: NCONF,
    patternKey: "call:default.argv:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.argv()",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.argv()",
    ],
  },
  {
    library: NCONF,
    patternKey: "call:default.defaults:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.defaults({ http: { port: 1337 } })",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.defaults({ http: { port: 1337 } })",
    ],
  },
  {
    library: NCONF,
    patternKey: "call:default.required:*",
    matches: [
      "import nconf from \"nconf\"\nnconf.required([\"keya\", \"keyb\"])",
    ],
    rejects: [
      "const nconf = makeLocalRegistry()\nnconf.required([\"keya\", \"keyb\"])",
    ],
  },
]

const NODE_CONFIG = "node-config"

export const nodeConfigFixtures: readonly PatternFixture[] = [
  {
    library: NODE_CONFIG,
    patternKey: "call:default.get:*",
    matches: [
      "import config from \"config\"\nconst dbConfig = config.get(\"Customer.dbConfig\")",
    ],
    rejects: [
      "const config = makeLocalRegistry()\nconst dbConfig = config.get(\"Customer.dbConfig\")",
    ],
  },
  {
    library: NODE_CONFIG,
    patternKey: "call:default.has:*",
    matches: [
      "import config from \"config\"\nconst hasDetail = config.has(\"optionalFeature.detail\")",
    ],
    rejects: [
      "const config = makeLocalRegistry()\nconst hasDetail = config.has(\"optionalFeature.detail\")",
    ],
  },
]

const T3_ENV = "T3 Env"

export const t3EnvFixtures: readonly PatternFixture[] = [
  {
    library: T3_ENV,
    patternKey: "call:createEnv:*",
    matches: [
      "import { createEnv } from \"@t3-oss/env-core\"\nexport const env = createEnv({ server: { DATABASE_URL: z.url() }, runtimeEnv: process.env })",
    ],
    rejects: [
      "const createEnv = (...parts) => parts\nexport const env = createEnv({ server: { DATABASE_URL: z.url() }, runtimeEnv: process.env })",
    ],
  },
]
