import type { PatternFixture } from "@/catalogue/types"

const AGENDA = "Agenda"

export const agendaFixtures: readonly PatternFixture[] = [
  {
    library: AGENDA,
    patternKey: "factory:Agenda:*",
    matches: [
      "import { Agenda } from \"agenda\"\nconst agenda = new Agenda({ backend })",
    ],
    rejects: [
      "const Agenda = (...parts) => parts\nconst agenda = new Agenda({ backend })",
    ],
  },
  {
    library: AGENDA,
    patternKey: "factory:Agenda:*>call:define:*",
    matches: [
      "import { Agenda } from \"agenda\"\nconst agenda = new Agenda({ backend })\nagenda.define(\"send email\", async (job) => { await sendEmail(job.attrs.data) })",
    ],
    rejects: [
      "const agenda = makeLocalRegistry()\nagenda.define(\"send email\", async (job) => { await sendEmail(job.attrs.data) })",
    ],
  },
  {
    library: AGENDA,
    patternKey: "factory:Agenda:*>call:every:*",
    matches: [
      "import { Agenda } from \"agenda\"\nconst agenda = new Agenda({ backend })\nawait agenda.every(\"3 minutes\", \"send email\")",
    ],
    rejects: [
      "const agenda = makeLocalRegistry()\nawait agenda.every(\"3 minutes\", \"send email\")",
    ],
  },
  {
    library: AGENDA,
    patternKey: "factory:Agenda:*>call:schedule:*",
    matches: [
      "import { Agenda } from \"agenda\"\nconst agenda = new Agenda({ backend })\nawait agenda.schedule(\"in 20 minutes\", \"send email\", { to: \"ada@example.com\" })",
    ],
    rejects: [
      "const agenda = makeLocalRegistry()\nawait agenda.schedule(\"in 20 minutes\", \"send email\", { to: \"ada@example.com\" })",
    ],
  },
  {
    library: AGENDA,
    patternKey: "factory:Agenda:*>call:now:*",
    matches: [
      "import { Agenda } from \"agenda\"\nconst agenda = new Agenda({ backend })\nawait agenda.now(\"send email\", { to: \"ada@example.com\" })",
    ],
    rejects: [
      "const agenda = makeLocalRegistry()\nawait agenda.now(\"send email\", { to: \"ada@example.com\" })",
    ],
  },
  {
    library: AGENDA,
    patternKey: "factory:Agenda:*>call:on:*",
    matches: [
      "import { Agenda } from \"agenda\"\nconst agenda = new Agenda({ backend })\nagenda.on(\"fail\", (err, job) => { report(err) })",
    ],
    rejects: [
      "const agenda = makeLocalRegistry()\nagenda.on(\"fail\", (err, job) => { report(err) })",
    ],
  },
]

const BREE = "Bree"

export const breeFixtures: readonly PatternFixture[] = [
  {
    library: BREE,
    patternKey: "factory:default:*",
    matches: [
      "import Bree from \"bree\"\nconst bree = new Bree({ jobs: [{ name: \"email\", interval: \"5m\" }] })",
    ],
    rejects: [
      "const Bree = (...parts) => parts\nconst bree = new Bree({ jobs: [{ name: \"email\", interval: \"5m\" }] })",
    ],
  },
  {
    library: BREE,
    patternKey: "factory:default:*>call:start:*",
    matches: [
      "import Bree from \"bree\"\nconst bree = new Bree({ jobs: [{ name: \"email\", interval: \"5m\" }] })\nbree.start(\"email\")",
    ],
    rejects: [
      "const bree = makeLocalRegistry()\nbree.start(\"email\")",
    ],
  },
  {
    library: BREE,
    patternKey: "factory:default:*>call:run:*",
    matches: [
      "import Bree from \"bree\"\nconst bree = new Bree({ jobs: [{ name: \"email\", interval: \"5m\" }] })\nbree.run(\"email\")",
    ],
    rejects: [
      "const bree = makeLocalRegistry()\nbree.run(\"email\")",
    ],
  },
  {
    library: BREE,
    patternKey: "factory:default:*>call:add:*",
    matches: [
      "import Bree from \"bree\"\nconst bree = new Bree({ jobs: [{ name: \"email\", interval: \"5m\" }] })\nbree.add(\"email\")",
    ],
    rejects: [
      "const bree = makeLocalRegistry()\nbree.add(\"email\")",
    ],
  },
  {
    library: BREE,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import Bree from \"bree\"\nconst bree = new Bree({ jobs: [{ name: \"email\", interval: \"5m\" }] })\nbree.on(\"worker created\", (name) => { report(name) })",
    ],
    rejects: [
      "const bree = makeLocalRegistry()\nbree.on(\"worker created\", (name) => { report(name) })",
    ],
  },
]

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

const CRON_SCHEDULE = "cron-schedule"

export const cronScheduleFixtures: readonly PatternFixture[] = [
  {
    library: CRON_SCHEDULE,
    patternKey: "factory:parseCronExpression:*",
    matches: [
      "import { parseCronExpression } from \"cron-schedule\"\nconst cron = parseCronExpression(\"*/5 * * * *\")",
    ],
    rejects: [
      "const parseCronExpression = (...parts) => parts\nconst cron = parseCronExpression(\"*/5 * * * *\")",
    ],
  },
  {
    library: CRON_SCHEDULE,
    patternKey: "factory:parseCronExpression:*>call:getNextDate:*",
    matches: [
      "import { parseCronExpression } from \"cron-schedule\"\nconst cron = parseCronExpression(\"*/5 * * * *\")\nconst next = cron.getNextDate(new Date())",
    ],
    rejects: [
      "const cron = makeLocalRegistry()\nconst next = cron.getNextDate(new Date())",
    ],
  },
]

const CRONER = "Croner"

export const cronerFixtures: readonly PatternFixture[] = [
  {
    library: CRONER,
    patternKey: "factory:Cron:*",
    matches: [
      "import { Cron } from \"croner\"\nconst job = new Cron(\"*/5 * * * * *\", () => { report(\"tick\") })",
    ],
    rejects: [
      "const Cron = (...parts) => parts\nconst job = new Cron(\"*/5 * * * * *\", () => { report(\"tick\") })",
    ],
  },
]

const MOTIA = "Motia"

export const motiaFixtures: readonly PatternFixture[] = [
  {
    library: MOTIA,
    patternKey: "file:**/*.step.{js,ts}:*",
    matches: [
      "steps/create-todo.step.ts",
      "src/steps/cleanup.step.js",
    ],
    rejects: [
      "steps/create-todo.ts",
      "steps/step.test.ts",
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

const TRIGGER_DEV = "Trigger.dev"

export const triggerDevFixtures: readonly PatternFixture[] = [
  {
    library: TRIGGER_DEV,
    patternKey: "factory:task:*",
    matches: [
      "import { task } from \"@trigger.dev/sdk\"\nexport const yourTask = task({ id: \"your-task\", run: async (payload) => handle(payload) })",
    ],
    rejects: [
      "const task = (...parts) => parts\nexport const yourTask = task({ id: \"your-task\", run: async (payload) => handle(payload) })",
    ],
  },
  {
    library: TRIGGER_DEV,
    patternKey: "factory:task:*>call:trigger:*",
    matches: [
      "import { task } from \"@trigger.dev/sdk\"\nexport const yourTask = task({ id: \"your-task\", run: async (payload) => handle(payload) })\nconst handle = await yourTask.trigger({ foo: \"bar\" })",
    ],
    rejects: [
      "const yourTask = makeLocalRegistry()\nconst handle = await yourTask.trigger({ foo: \"bar\" })",
    ],
  },
  {
    library: TRIGGER_DEV,
    patternKey: "factory:task:*>call:batchTrigger:*",
    matches: [
      "import { task } from \"@trigger.dev/sdk\"\nexport const yourTask = task({ id: \"your-task\", run: async (payload) => handle(payload) })\nconst handle = await yourTask.batchTrigger([{ payload: { foo: \"bar\" } }])",
    ],
    rejects: [
      "const yourTask = makeLocalRegistry()\nconst handle = await yourTask.batchTrigger([{ payload: { foo: \"bar\" } }])",
    ],
  },
  {
    library: TRIGGER_DEV,
    patternKey: "call:schedules.task:*",
    matches: [
      "import { schedules } from \"@trigger.dev/sdk\"\nexport const firstScheduledTask = schedules.task({ id: \"first-scheduled-task\", cron: \"0 * * * *\", run: async (payload) => handle(payload) })",
    ],
    rejects: [
      "const schedules = makeLocalRegistry()\nexport const firstScheduledTask = schedules.task({ id: \"first-scheduled-task\", cron: \"0 * * * *\", run: async (payload) => handle(payload) })",
    ],
  },
]

const WORKFLOW = "Workflow"

export const workflowFixtures: readonly PatternFixture[] = [
  {
    library: WORKFLOW,
    patternKey: "directive:use workflow:*",
    matches: [
      "export async function approvalWorkflow(orderId) {\n  \"use workflow\"\n  await chargeOrder(orderId)\n}",
    ],
    rejects: [
      "export async function approvalWorkflow(orderId) {\n  report(\"use workflow\")\n}",
    ],
  },
  {
    library: WORKFLOW,
    patternKey: "directive:use step:*",
    matches: [
      "async function chargeOrder(orderId) {\n  \"use step\"\n  return charge(orderId)\n}",
    ],
    rejects: [
      "async function chargeOrder(orderId) {\n  return charge(orderId, \"use step\")\n}",
    ],
  },
  {
    library: WORKFLOW,
    patternKey: "call:start:*",
    matches: [
      "import { start } from \"workflow/api\"\nconst run = await start(approvalWorkflow, [\"order-1\"])",
    ],
    rejects: [
      "const start = (...parts) => parts\nconst run = await start(approvalWorkflow, [\"order-1\"])",
    ],
  },
  {
    library: WORKFLOW,
    patternKey: "call:sleep:*",
    matches: [
      "import { sleep } from \"workflow\"\nawait sleep(\"1 day\")",
    ],
    rejects: [
      "const sleep = (...parts) => parts\nawait sleep(\"1 day\")",
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
