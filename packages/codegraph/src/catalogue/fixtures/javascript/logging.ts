import type { PatternFixture } from "@/catalogue/types"

const ANALYTICS = "Analytics"

export const analyticsFixtures: readonly PatternFixture[] = [
  {
    library: ANALYTICS,
    patternKey: "factory:default:*",
    matches: [
      "import Analytics from \"analytics\"\nconst analytics = Analytics({ app: \"my-app\", plugins: [] })",
    ],
    rejects: [
      "const Analytics = (...parts) => parts\nconst analytics = Analytics({ app: \"my-app\", plugins: [] })",
    ],
  },
  {
    library: ANALYTICS,
    patternKey: "factory:default:*>call:track:*",
    matches: [
      "import Analytics from \"analytics\"\nconst analytics = Analytics({ app: \"my-app\", plugins: [] })\nanalytics.track(\"itemPurchased\", { price: 11 })",
    ],
    rejects: [
      "const analytics = makeLocalRegistry()\nanalytics.track(\"itemPurchased\", { price: 11 })",
    ],
  },
  {
    library: ANALYTICS,
    patternKey: "factory:default:*>call:page:*",
    matches: [
      "import Analytics from \"analytics\"\nconst analytics = Analytics({ app: \"my-app\", plugins: [] })\nanalytics.page()",
    ],
    rejects: [
      "const analytics = makeLocalRegistry()\nanalytics.page()",
    ],
  },
  {
    library: ANALYTICS,
    patternKey: "factory:default:*>call:identify:*",
    matches: [
      "import Analytics from \"analytics\"\nconst analytics = Analytics({ app: \"my-app\", plugins: [] })\nanalytics.identify(\"user-id-xyz\", { firstName: \"Ada\" })",
    ],
    rejects: [
      "const analytics = makeLocalRegistry()\nanalytics.identify(\"user-id-xyz\", { firstName: \"Ada\" })",
    ],
  },
  {
    library: ANALYTICS,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import Analytics from \"analytics\"\nconst analytics = Analytics({ app: \"my-app\", plugins: [] })\nanalytics.on(\"track\", ({ payload }) => { report(payload) })",
    ],
    rejects: [
      "const analytics = makeLocalRegistry()\nanalytics.on(\"track\", ({ payload }) => { report(payload) })",
    ],
  },
]

const CONSOLA = "Consola"

export const consolaFixtures: readonly PatternFixture[] = [
  {
    library: CONSOLA,
    patternKey: "call:consola.info:*",
    matches: [
      "import { consola } from \"consola\"\nconsola.info(\"Using consola 3.0.0\")",
    ],
    rejects: [
      "const consola = makeLocalRegistry()\nconsola.info(\"Using consola 3.0.0\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "call:consola.start:*",
    matches: [
      "import { consola } from \"consola\"\nconsola.start(\"Using consola 3.0.0\")",
    ],
    rejects: [
      "const consola = makeLocalRegistry()\nconsola.start(\"Using consola 3.0.0\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "call:consola.warn:*",
    matches: [
      "import { consola } from \"consola\"\nconsola.warn(\"Using consola 3.0.0\")",
    ],
    rejects: [
      "const consola = makeLocalRegistry()\nconsola.warn(\"Using consola 3.0.0\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "call:consola.success:*",
    matches: [
      "import { consola } from \"consola\"\nconsola.success(\"Using consola 3.0.0\")",
    ],
    rejects: [
      "const consola = makeLocalRegistry()\nconsola.success(\"Using consola 3.0.0\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "call:consola.error:*",
    matches: [
      "import { consola } from \"consola\"\nconsola.error(\"Using consola 3.0.0\")",
    ],
    rejects: [
      "const consola = makeLocalRegistry()\nconsola.error(\"Using consola 3.0.0\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "factory:createConsola:*",
    matches: [
      "import { createConsola } from \"consola\"\nconst logger = createConsola({ level: 4 })",
    ],
    rejects: [
      "const createConsola = (...parts) => parts\nconst logger = createConsola({ level: 4 })",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "factory:createConsola:*>call:info:*",
    matches: [
      "import { createConsola } from \"consola\"\nconst logger = createConsola({ level: 4 })\nlogger.info(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.info(\"user signed in\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "factory:createConsola:*>call:error:*",
    matches: [
      "import { createConsola } from \"consola\"\nconst logger = createConsola({ level: 4 })\nlogger.error(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.error(\"user signed in\")",
    ],
  },
  {
    library: CONSOLA,
    patternKey: "factory:createConsola:*>call:warn:*",
    matches: [
      "import { createConsola } from \"consola\"\nconst logger = createConsola({ level: 4 })\nlogger.warn(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.warn(\"user signed in\")",
    ],
  },
]

const DEBUG = "Debug"

export const debugFixtures: readonly PatternFixture[] = [
  {
    library: DEBUG,
    patternKey: "factory:default:*",
    matches: [
      "import createDebug from \"debug\"\nconst log = createDebug(\"http\")",
    ],
    rejects: [
      "const createDebug = (...parts) => parts\nconst log = createDebug(\"http\")",
    ],
  },
  {
    library: DEBUG,
    patternKey: "factory:default:*>call:extend:*",
    matches: [
      "import createDebug from \"debug\"\nconst log = createDebug(\"http\")\nconst logAuth = log.extend(\"auth\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nconst logAuth = log.extend(\"auth\")",
    ],
  },
  {
    library: DEBUG,
    patternKey: "factory:default:*>called",
    matches: [
      "import createDebug from \"debug\"\nconst log = createDebug(\"http\")\nlog(\"booting %o\", name)",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog(\"booting %o\", name)",
    ],
  },
]

const LOGLAYER = "LogLayer"

export const loglayerFixtures: readonly PatternFixture[] = [
  {
    library: LOGLAYER,
    patternKey: "factory:LogLayer:*",
    matches: [
      "import { LogLayer } from \"loglayer\"\nconst log = new LogLayer({ transport: new ConsoleTransport({ logger: console }) })",
    ],
    rejects: [
      "const LogLayer = (...parts) => parts\nconst log = new LogLayer({ transport: new ConsoleTransport({ logger: console }) })",
    ],
  },
  {
    library: LOGLAYER,
    patternKey: "factory:LogLayer:*>call:info:*",
    matches: [
      "import { LogLayer } from \"loglayer\"\nconst log = new LogLayer({ transport: new ConsoleTransport({ logger: console }) })\nlog.withMetadata({ userId: 1 }).info(\"user signed in\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.withMetadata({ userId: 1 }).info(\"user signed in\")",
    ],
  },
  {
    library: LOGLAYER,
    patternKey: "factory:LogLayer:*>call:withError:*",
    matches: [
      "import { LogLayer } from \"loglayer\"\nconst log = new LogLayer({ transport: new ConsoleTransport({ logger: console }) })\nlog.withError(new Error(\"failed\")).error(\"request failed\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.withError(new Error(\"failed\")).error(\"request failed\")",
    ],
  },
]

const LOGTAPE = "LogTape"

export const logtapeFixtures: readonly PatternFixture[] = [
  {
    library: LOGTAPE,
    patternKey: "call:configure:*",
    matches: [
      "import { configure } from \"@logtape/logtape\"\nawait configure({ sinks: { console: getConsoleSink() }, loggers: [{ category: \"my-app\", sinks: [\"console\"] }] })",
    ],
    rejects: [
      "const configure = (...parts) => parts\nawait configure({ sinks: { console: getConsoleSink() }, loggers: [{ category: \"my-app\", sinks: [\"console\"] }] })",
    ],
  },
  {
    library: LOGTAPE,
    patternKey: "factory:getLogger:*",
    matches: [
      "import { getLogger } from \"@logtape/logtape\"\nconst logger = getLogger([\"my-app\", \"module\"])",
    ],
    rejects: [
      "const getLogger = (...parts) => parts\nconst logger = getLogger([\"my-app\", \"module\"])",
    ],
  },
  {
    library: LOGTAPE,
    patternKey: "factory:getLogger:*>call:info:*",
    matches: [
      "import { getLogger } from \"@logtape/logtape\"\nconst logger = getLogger([\"my-app\", \"module\"])\nlogger.info(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.info(\"user signed in\")",
    ],
  },
  {
    library: LOGTAPE,
    patternKey: "factory:getLogger:*>call:error:*",
    matches: [
      "import { getLogger } from \"@logtape/logtape\"\nconst logger = getLogger([\"my-app\", \"module\"])\nlogger.error(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.error(\"user signed in\")",
    ],
  },
  {
    library: LOGTAPE,
    patternKey: "factory:getLogger:*>call:debug:*",
    matches: [
      "import { getLogger } from \"@logtape/logtape\"\nconst logger = getLogger([\"my-app\", \"module\"])\nlogger.debug(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.debug(\"user signed in\")",
    ],
  },
  {
    library: LOGTAPE,
    patternKey: "factory:getLogger:*>call:warn:*",
    matches: [
      "import { getLogger } from \"@logtape/logtape\"\nconst logger = getLogger([\"my-app\", \"module\"])\nlogger.warn(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.warn(\"user signed in\")",
    ],
  },
]

const MORGAN = "Morgan"

export const morganFixtures: readonly PatternFixture[] = [
  {
    library: MORGAN,
    patternKey: "call:default:*",
    matches: [
      "import morgan from \"morgan\"\napp.use(morgan(\"combined\"))",
    ],
    rejects: [
      "const morgan = (...parts) => parts\napp.use(morgan(\"combined\"))",
    ],
  },
  {
    library: MORGAN,
    patternKey: "call:default.token:*",
    matches: [
      "import morgan from \"morgan\"\nmorgan.token(\"id\", (req) => req.id)",
    ],
    rejects: [
      "const morgan = makeLocalRegistry()\nmorgan.token(\"id\", (req) => req.id)",
    ],
  },
]

const PINO = "pino"

export const pinoFixtures: readonly PatternFixture[] = [
  {
    library: PINO,
    patternKey: "factory:default:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()",
    ],
    rejects: [
      "const pino = (...parts) => parts\nconst logger = pino()",
    ],
  },
  {
    library: PINO,
    patternKey: "factory:default:*>call:info:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()\nlogger.info(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.info(\"user signed in\")",
    ],
  },
  {
    library: PINO,
    patternKey: "factory:default:*>call:error:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()\nlogger.error(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.error(\"user signed in\")",
    ],
  },
  {
    library: PINO,
    patternKey: "factory:default:*>call:warn:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()\nlogger.warn(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.warn(\"user signed in\")",
    ],
  },
  {
    library: PINO,
    patternKey: "factory:default:*>call:debug:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()\nlogger.debug(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.debug(\"user signed in\")",
    ],
  },
  {
    library: PINO,
    patternKey: "factory:default:*>call:fatal:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()\nlogger.fatal(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.fatal(\"user signed in\")",
    ],
  },
  {
    library: PINO,
    patternKey: "factory:default:*>call:trace:*",
    matches: [
      "import pino from \"pino\"\nconst logger = pino()\nlogger.trace(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.trace(\"user signed in\")",
    ],
  },
]

const SIGNALE = "Signale"

export const signaleFixtures: readonly PatternFixture[] = [
  {
    library: SIGNALE,
    patternKey: "call:default.success:*",
    matches: [
      "import signale from \"signale\"\nsignale.success(\"Operation finished\")",
    ],
    rejects: [
      "const signale = makeLocalRegistry()\nsignale.success(\"Operation finished\")",
    ],
  },
  {
    library: SIGNALE,
    patternKey: "call:default.error:*",
    matches: [
      "import signale from \"signale\"\nsignale.error(\"Operation finished\")",
    ],
    rejects: [
      "const signale = makeLocalRegistry()\nsignale.error(\"Operation finished\")",
    ],
  },
  {
    library: SIGNALE,
    patternKey: "call:default.log:*",
    matches: [
      "import signale from \"signale\"\nsignale.log(\"Operation finished\")",
    ],
    rejects: [
      "const signale = makeLocalRegistry()\nsignale.log(\"Operation finished\")",
    ],
  },
  {
    library: SIGNALE,
    patternKey: "call:default.complete:*",
    matches: [
      "import signale from \"signale\"\nsignale.complete(\"Operation finished\")",
    ],
    rejects: [
      "const signale = makeLocalRegistry()\nsignale.complete(\"Operation finished\")",
    ],
  },
]

const TSLOG = "tslog"

export const tslogFixtures: readonly PatternFixture[] = [
  {
    library: TSLOG,
    patternKey: "factory:Logger:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })",
    ],
    rejects: [
      "const Logger = (...parts) => parts\nconst log = new Logger({ name: \"myLogger\" })",
    ],
  },
  {
    library: TSLOG,
    patternKey: "factory:Logger:*>call:info:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })\nlog.info(\"user signed in\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.info(\"user signed in\")",
    ],
  },
  {
    library: TSLOG,
    patternKey: "factory:Logger:*>call:error:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })\nlog.error(\"user signed in\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.error(\"user signed in\")",
    ],
  },
  {
    library: TSLOG,
    patternKey: "factory:Logger:*>call:debug:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })\nlog.debug(\"user signed in\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.debug(\"user signed in\")",
    ],
  },
  {
    library: TSLOG,
    patternKey: "factory:Logger:*>call:warn:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })\nlog.warn(\"user signed in\")",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.warn(\"user signed in\")",
    ],
  },
  {
    library: TSLOG,
    patternKey: "factory:Logger:*>call:attachTransport:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })\nlog.attachTransport((logObj) => { fileTransport(logObj) })",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nlog.attachTransport((logObj) => { fileTransport(logObj) })",
    ],
  },
  {
    library: TSLOG,
    patternKey: "factory:Logger:*>call:getSubLogger:*",
    matches: [
      "import { Logger } from \"tslog\"\nconst log = new Logger({ name: \"myLogger\" })\nconst child = log.getSubLogger({ name: \"child\" })",
    ],
    rejects: [
      "const log = makeLocalRegistry()\nconst child = log.getSubLogger({ name: \"child\" })",
    ],
  },
]

const WINSTON = "Winston"

export const winstonFixtures: readonly PatternFixture[] = [
  {
    library: WINSTON,
    patternKey: "factory:createLogger:*",
    matches: [
      "import { createLogger } from \"winston\"\nconst logger = createLogger({ level: \"info\", transports: [new transports.Console()] })",
    ],
    rejects: [
      "const createLogger = (...parts) => parts\nconst logger = createLogger({ level: \"info\", transports: [new transports.Console()] })",
    ],
  },
  {
    library: WINSTON,
    patternKey: "factory:createLogger:*>call:info:*",
    matches: [
      "import { createLogger } from \"winston\"\nconst logger = createLogger({ level: \"info\", transports: [new transports.Console()] })\nlogger.info(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.info(\"user signed in\")",
    ],
  },
  {
    library: WINSTON,
    patternKey: "factory:createLogger:*>call:log:*",
    matches: [
      "import { createLogger } from \"winston\"\nconst logger = createLogger({ level: \"info\", transports: [new transports.Console()] })\nlogger.log(\"user signed in\")",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.log(\"user signed in\")",
    ],
  },
  {
    library: WINSTON,
    patternKey: "factory:createLogger:*>call:add:*",
    matches: [
      "import { createLogger } from \"winston\"\nconst logger = createLogger({ level: \"info\", transports: [new transports.Console()] })\nlogger.add(new transports.File({ filename: \"combined.log\" }))",
    ],
    rejects: [
      "const logger = makeLocalRegistry()\nlogger.add(new transports.File({ filename: \"combined.log\" }))",
    ],
  },
]
