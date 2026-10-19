import type { PatternFixture } from "@/catalogue/types"

const COMMANDER_JS = "Commander.js"

export const commanderJsFixtures: readonly PatternFixture[] = [
  {
    library: COMMANDER_JS,
    patternKey: "factory:Command:*",
    matches: [
      "import { Command } from \"commander\"\nconst program = new Command()",
    ],
    rejects: [
      "const Command = (...parts) => parts\nconst program = new Command()",
    ],
  },
  {
    library: COMMANDER_JS,
    patternKey: "factory:Command:*>call:command:*",
    matches: [
      "import { Command } from \"commander\"\nconst program = new Command()\nprogram.command(\"clone <source> [destination]\")",
    ],
    rejects: [
      "const program = makeLocalRegistry()\nprogram.command(\"clone <source> [destination]\")",
    ],
  },
  {
    library: COMMANDER_JS,
    patternKey: "factory:Command:*>call:action:*",
    matches: [
      "import { Command } from \"commander\"\nconst program = new Command()\nprogram.command(\"clone <source>\").action((source) => { clone(source) })",
    ],
    rejects: [
      "const program = makeLocalRegistry()\nprogram.command(\"clone <source>\").action((source) => { clone(source) })",
    ],
  },
  {
    library: COMMANDER_JS,
    patternKey: "factory:Command:*>call:parse:*",
    matches: [
      "import { Command } from \"commander\"\nconst program = new Command()\nprogram.parse()",
    ],
    rejects: [
      "const program = makeLocalRegistry()\nprogram.parse()",
    ],
  },
  {
    library: COMMANDER_JS,
    patternKey: "call:program.action:*",
    matches: [
      "import { program } from \"commander\"\nprogram.argument(\"<name>\").action((name) => { greet(name) })",
    ],
    rejects: [
      "const program = makeLocalRegistry()\nprogram.argument(\"<name>\").action((name) => { greet(name) })",
    ],
  },
]

const YARGS = "yargs"

export const yargsFixtures: readonly PatternFixture[] = [
  {
    library: YARGS,
    patternKey: "factory:default:*",
    matches: [
      "import yargs from \"yargs\"\nconst cli = yargs(hideBin(process.argv))",
    ],
    rejects: [
      "const yargs = (...parts) => parts\nconst cli = yargs(hideBin(process.argv))",
    ],
  },
  {
    library: YARGS,
    patternKey: "factory:default:*>call:command:*",
    matches: [
      "import yargs from \"yargs\"\nconst cli = yargs(hideBin(process.argv))\ncli.command(\"serve [port]\", \"start the server\", (builder) => builder, (argv) => { serve(argv.port) })",
    ],
    rejects: [
      "const cli = makeLocalRegistry()\ncli.command(\"serve [port]\", \"start the server\", (builder) => builder, (argv) => { serve(argv.port) })",
    ],
  },
  {
    library: YARGS,
    patternKey: "factory:default:*>call:middleware:*",
    matches: [
      "import yargs from \"yargs\"\nconst cli = yargs(hideBin(process.argv))\ncli.middleware((argv) => { authenticateUser(argv) })",
    ],
    rejects: [
      "const cli = makeLocalRegistry()\ncli.middleware((argv) => { authenticateUser(argv) })",
    ],
  },
  {
    library: YARGS,
    patternKey: "factory:default:*>call:parse:*",
    matches: [
      "import yargs from \"yargs\"\nconst cli = yargs(hideBin(process.argv))\ncli.parse()",
    ],
    rejects: [
      "const cli = makeLocalRegistry()\ncli.parse()",
    ],
  },
]

const OCLIF = "oclif"

export const oclifFixtures: readonly PatternFixture[] = [
  {
    library: OCLIF,
    patternKey: "class:Command:*",
    matches: [
      "import { Command } from \"@oclif/core\"\nexport default class Hello extends Command {\n  static args = { person: Args.string() }\n  async run() { this.log(\"hello\") }\n}",
    ],
    rejects: [
      "class Command {}\nexport default class Hello extends Command {\n  static args = { person: Args.string() }\n  async run() { this.log(\"hello\") }\n}",
    ],
  },
]

const MEOW = "Meow"

export const meowFixtures: readonly PatternFixture[] = [
  {
    library: MEOW,
    patternKey: "call:default:*",
    matches: [
      "import meow from \"meow\"\nconst cli = meow(\"Usage\\n  $ foo <input>\", { importMeta: import.meta, flags: { rainbow: { type: \"boolean\", shortFlag: \"r\" } } })",
    ],
    rejects: [
      "const meow = (...parts) => parts\nconst cli = meow(\"Usage\\n  $ foo <input>\", { importMeta: import.meta, flags: { rainbow: { type: \"boolean\", shortFlag: \"r\" } } })",
    ],
  },
]

const GLUEGUN = "Gluegun"

export const gluegunFixtures: readonly PatternFixture[] = [
  {
    library: GLUEGUN,
    patternKey: "factory:build:*",
    matches: [
      "const { build } = require(\"gluegun\")\nconst cli = build(\"movie\").src(__dirname).create()",
    ],
    rejects: [
      "const build = (...parts) => parts\nconst cli = build(\"movie\").src(__dirname).create()",
    ],
  },
  {
    library: GLUEGUN,
    patternKey: "factory:build:*>call:command:*",
    matches: [
      "import { build } from \"gluegun\"\nconst cli = build(\"movie\").src(__dirname).command({ name: \"hi\", run: (toolbox) => toolbox.print.info(\"hi!\") }).create()",
    ],
    rejects: [
      "const builder = makeLocalBuilder()\nbuilder.command({ name: \"hi\", run: (toolbox) => toolbox.print.info(\"hi!\") })",
    ],
  },
  {
    library: GLUEGUN,
    patternKey: "factory:build:*>call:defaultCommand:*",
    matches: [
      "import { build } from \"gluegun\"\nconst builder = build(\"movie\")\nbuilder.defaultCommand((toolbox) => toolbox.print.info(\"Welcome\"))",
      "import { build } from \"gluegun\"\nconst builder = build(\"movie\")\nbuilder.defaultCommand({ run: (toolbox) => toolbox.print.info(\"Welcome\") })",
    ],
    rejects: [
      "const builder = makeLocalBuilder()\nbuilder.defaultCommand((toolbox) => toolbox.print.info(\"Welcome\"))",
    ],
  },
  {
    library: GLUEGUN,
    patternKey: "factory:build:*>call:help:*",
    matches: [
      "import { build } from \"gluegun\"\nconst builder = build(\"movie\")\nbuilder.help((toolbox) => toolbox.print.info(\"No help for you!\"))",
      "import { build } from \"gluegun\"\nconst builder = build(\"movie\")\nbuilder.help({ name: \"help\", alias: \"helpmeplease\", run: (toolbox) => toolbox.print.info(\"No help for you!\") })",
    ],
    rejects: [
      "const builder = makeLocalBuilder()\nbuilder.help((toolbox) => toolbox.print.info(\"No help for you!\"))",
    ],
  },
  {
    library: GLUEGUN,
    patternKey: "factory:build:*>call:version:*",
    matches: [
      "import { build } from \"gluegun\"\nconst builder = build(\"movie\")\nbuilder.version((toolbox) => toolbox.print.info(toolbox.meta.version()))",
      "import { build } from \"gluegun\"\nconst builder = build(\"movie\")\nbuilder.version({ run: (toolbox) => toolbox.print.info(toolbox.meta.version()) })",
    ],
    rejects: [
      "const builder = makeLocalBuilder()\nbuilder.version((toolbox) => toolbox.print.info(toolbox.meta.version()))",
    ],
  },
]
