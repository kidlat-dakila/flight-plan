import type { PatternFixture } from "@/catalogue/types"

const ABSURD = "Absurd"

export const absurdFixtures: readonly PatternFixture[] = [
  {
    library: ABSURD,
    patternKey: "factory:Absurd:*",
    matches: [
      "import { Absurd } from \"absurd-sdk\"\nconst app = new Absurd()",
    ],
    rejects: [
      "const Absurd = (...parts) => parts\nconst app = new Absurd()",
    ],
  },
  {
    library: ABSURD,
    patternKey: "factory:Absurd:*>call:registerTask:*",
    matches: [
      "import { Absurd } from \"absurd-sdk\"\nconst app = new Absurd()\napp.registerTask({ name: \"order-fulfillment\" }, async (params, ctx) => { await ctx.step(\"charge\", () => charge(params)) })",
    ],
    rejects: [
      "const app = makeLocalRegistry()\napp.registerTask({ name: \"order-fulfillment\" }, async (params, ctx) => { await ctx.step(\"charge\", () => charge(params)) })",
    ],
  },
  {
    library: ABSURD,
    patternKey: "factory:Absurd:*>call:spawn:*",
    matches: [
      "import { Absurd } from \"absurd-sdk\"\nconst app = new Absurd()\nawait app.spawn(\"order-fulfillment\", { orderId: \"42\" })",
    ],
    rejects: [
      "const app = makeLocalRegistry()\nawait app.spawn(\"order-fulfillment\", { orderId: \"42\" })",
    ],
  },
]

const BEE_QUEUE = "Bee-Queue"

export const beeQueueFixtures: readonly PatternFixture[] = [
  {
    library: BEE_QUEUE,
    patternKey: "factory:default:*",
    matches: [
      "import Queue from \"bee-queue\"\nconst addQueue = new Queue(\"addition\")",
    ],
    rejects: [
      "const Queue = (...parts) => parts\nconst addQueue = new Queue(\"addition\")",
    ],
  },
  {
    library: BEE_QUEUE,
    patternKey: "factory:default:*>call:createJob:*",
    matches: [
      "import Queue from \"bee-queue\"\nconst addQueue = new Queue(\"addition\")\nconst job = await addQueue.createJob({ x: 2, y: 3 }).save()",
    ],
    rejects: [
      "const addQueue = makeLocalRegistry()\nconst job = await addQueue.createJob({ x: 2, y: 3 }).save()",
    ],
  },
  {
    library: BEE_QUEUE,
    patternKey: "factory:default:*>call:process:*",
    matches: [
      "import Queue from \"bee-queue\"\nconst addQueue = new Queue(\"addition\")\naddQueue.process(async (job) => job.data.x + job.data.y)",
    ],
    rejects: [
      "const addQueue = makeLocalRegistry()\naddQueue.process(async (job) => job.data.x + job.data.y)",
    ],
  },
  {
    library: BEE_QUEUE,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import Queue from \"bee-queue\"\nconst addQueue = new Queue(\"addition\")\naddQueue.on(\"succeeded\", (job, result) => { report(result) })",
    ],
    rejects: [
      "const addQueue = makeLocalRegistry()\naddQueue.on(\"succeeded\", (job, result) => { report(result) })",
    ],
  },
]

const BULL = "Bull"

export const bullFixtures: readonly PatternFixture[] = [
  {
    library: BULL,
    patternKey: "factory:default:*",
    matches: [
      "import Queue from \"bull\"\nconst videoQueue = new Queue(\"video transcoding\", \"redis://127.0.0.1:6379\")",
    ],
    rejects: [
      "const Queue = (...parts) => parts\nconst videoQueue = new Queue(\"video transcoding\", \"redis://127.0.0.1:6379\")",
    ],
  },
  {
    library: BULL,
    patternKey: "factory:default:*>call:add:*",
    matches: [
      "import Queue from \"bull\"\nconst videoQueue = new Queue(\"video transcoding\", \"redis://127.0.0.1:6379\")\nvideoQueue.add({ video: \"http://example.com/video1.mov\" })",
    ],
    rejects: [
      "const videoQueue = makeLocalRegistry()\nvideoQueue.add({ video: \"http://example.com/video1.mov\" })",
    ],
  },
  {
    library: BULL,
    patternKey: "factory:default:*>call:process:*",
    matches: [
      "import Queue from \"bull\"\nconst videoQueue = new Queue(\"video transcoding\", \"redis://127.0.0.1:6379\")\nvideoQueue.process(async (job) => transcode(job.data))",
    ],
    rejects: [
      "const videoQueue = makeLocalRegistry()\nvideoQueue.process(async (job) => transcode(job.data))",
    ],
  },
  {
    library: BULL,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import Queue from \"bull\"\nconst videoQueue = new Queue(\"video transcoding\", \"redis://127.0.0.1:6379\")\nvideoQueue.on(\"completed\", (job, result) => { report(job.id) })",
    ],
    rejects: [
      "const videoQueue = makeLocalRegistry()\nvideoQueue.on(\"completed\", (job, result) => { report(job.id) })",
    ],
  },
]

const BULLMQ = "BullMQ"

export const bullmqFixtures: readonly PatternFixture[] = [
  {
    library: BULLMQ,
    patternKey: "factory:Queue:*",
    matches: [
      "import { Queue } from \"bullmq\"\nconst queue = new Queue(\"Paint\")",
    ],
    rejects: [
      "const Queue = (...parts) => parts\nconst queue = new Queue(\"Paint\")",
    ],
  },
  {
    library: BULLMQ,
    patternKey: "factory:Queue:*>call:add:*",
    matches: [
      "import { Queue } from \"bullmq\"\nconst queue = new Queue(\"Paint\")\nawait queue.add(\"cars\", { color: \"blue\" })",
    ],
    rejects: [
      "const queue = makeLocalRegistry()\nawait queue.add(\"cars\", { color: \"blue\" })",
    ],
  },
  {
    library: BULLMQ,
    patternKey: "factory:Worker:*",
    matches: [
      "import { Worker } from \"bullmq\"\nconst worker = new Worker(\"Paint\", async (job) => paintCar(job.data.color))",
    ],
    rejects: [
      "const Worker = (...parts) => parts\nconst worker = new Worker(\"Paint\", async (job) => paintCar(job.data.color))",
    ],
  },
  {
    library: BULLMQ,
    patternKey: "factory:QueueEvents:*",
    matches: [
      "import { QueueEvents } from \"bullmq\"\nconst queueEvents = new QueueEvents(\"Paint\")",
    ],
    rejects: [
      "const QueueEvents = (...parts) => parts\nconst queueEvents = new QueueEvents(\"Paint\")",
    ],
  },
  {
    library: BULLMQ,
    patternKey: "factory:QueueEvents:*>call:on:*",
    matches: [
      "import { QueueEvents } from \"bullmq\"\nconst queueEvents = new QueueEvents(\"Paint\")\nqueueEvents.on(\"completed\", ({ jobId }) => { report(jobId) })",
    ],
    rejects: [
      "const queueEvents = makeLocalRegistry()\nqueueEvents.on(\"completed\", ({ jobId }) => { report(jobId) })",
    ],
  },
  {
    library: BULLMQ,
    patternKey: "factory:FlowProducer:*",
    matches: [
      "import { FlowProducer } from \"bullmq\"\nconst flow = new FlowProducer()",
    ],
    rejects: [
      "const FlowProducer = (...parts) => parts\nconst flow = new FlowProducer()",
    ],
  },
  {
    library: BULLMQ,
    patternKey: "factory:FlowProducer:*>call:add:*",
    matches: [
      "import { FlowProducer } from \"bullmq\"\nconst flow = new FlowProducer()\nawait flow.add({ name: \"renovate\", queueName: \"renovate\", children })",
    ],
    rejects: [
      "const flow = makeLocalRegistry()\nawait flow.add({ name: \"renovate\", queueName: \"renovate\", children })",
    ],
  },
]

const GROUPMQ = "GroupMQ"

export const groupmqFixtures: readonly PatternFixture[] = [
  {
    library: GROUPMQ,
    patternKey: "factory:Queue:*",
    matches: [
      "import { Queue } from \"groupmq\"\nconst queue = new Queue({ redis, namespace: \"orders\" })",
    ],
    rejects: [
      "const Queue = (...parts) => parts\nconst queue = new Queue({ redis, namespace: \"orders\" })",
    ],
  },
  {
    library: GROUPMQ,
    patternKey: "factory:Queue:*>call:add:*",
    matches: [
      "import { Queue } from \"groupmq\"\nconst queue = new Queue({ redis, namespace: \"orders\" })\nawait queue.add({ groupId: \"user:42\", data: { type: \"charge\" } })",
    ],
    rejects: [
      "const queue = makeLocalRegistry()\nawait queue.add({ groupId: \"user:42\", data: { type: \"charge\" } })",
    ],
  },
  {
    library: GROUPMQ,
    patternKey: "factory:Worker:*",
    matches: [
      "import { Worker } from \"groupmq\"\nconst worker = new Worker({ queue, handler: async (job) => { await charge(job.data) } })",
    ],
    rejects: [
      "const Worker = (...parts) => parts\nconst worker = new Worker({ queue, handler: async (job) => { await charge(job.data) } })",
    ],
  },
]

const INNGEST = "Inngest"

export const inngestFixtures: readonly PatternFixture[] = [
  {
    library: INNGEST,
    patternKey: "factory:Inngest:*",
    matches: [
      "import { Inngest } from \"inngest\"\nconst inngest = new Inngest({ id: \"my-app\" })",
    ],
    rejects: [
      "const Inngest = (...parts) => parts\nconst inngest = new Inngest({ id: \"my-app\" })",
    ],
  },
  {
    library: INNGEST,
    patternKey: "factory:Inngest:*>call:createFunction:*",
    matches: [
      "import { Inngest } from \"inngest\"\nconst inngest = new Inngest({ id: \"my-app\" })\nexport const sendWelcome = inngest.createFunction({ id: \"send-welcome\" }, { event: \"user.signup\" }, async ({ event, step }) => { await step.run(\"send\", () => sendEmail(event.data)) })",
    ],
    rejects: [
      "const inngest = makeLocalRegistry()\nexport const sendWelcome = inngest.createFunction({ id: \"send-welcome\" }, { event: \"user.signup\" }, async ({ event, step }) => { await step.run(\"send\", () => sendEmail(event.data)) })",
    ],
  },
]

const MQTT_JS = "MQTT.js"

export const mqttJsFixtures: readonly PatternFixture[] = [
  {
    library: MQTT_JS,
    patternKey: "factory:default.connect:*",
    matches: [
      "import mqtt from \"mqtt\"\nconst client = mqtt.connect(\"mqtt://test.mosquitto.org\")",
    ],
    rejects: [
      "const mqtt = makeLocalRegistry()\nconst client = mqtt.connect(\"mqtt://test.mosquitto.org\")",
    ],
  },
  {
    library: MQTT_JS,
    patternKey: "factory:default.connect:*>call:publish:*",
    matches: [
      "import mqtt from \"mqtt\"\nconst client = mqtt.connect(\"mqtt://test.mosquitto.org\")\nclient.publish(\"presence\", \"Hello mqtt\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.publish(\"presence\", \"Hello mqtt\")",
    ],
  },
  {
    library: MQTT_JS,
    patternKey: "factory:default.connect:*>call:subscribe:*",
    matches: [
      "import mqtt from \"mqtt\"\nconst client = mqtt.connect(\"mqtt://test.mosquitto.org\")\nclient.subscribe(\"presence\", (err) => { report(err) })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.subscribe(\"presence\", (err) => { report(err) })",
    ],
  },
  {
    library: MQTT_JS,
    patternKey: "factory:default.connect:*>call:on:*",
    matches: [
      "import mqtt from \"mqtt\"\nconst client = mqtt.connect(\"mqtt://test.mosquitto.org\")\nclient.on(\"message\", (topic, message) => { report(message.toString()) })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.on(\"message\", (topic, message) => { report(message.toString()) })",
    ],
  },
]

const PG_BOSS = "pg-boss"

export const pgBossFixtures: readonly PatternFixture[] = [
  {
    library: PG_BOSS,
    patternKey: "factory:PgBoss:*",
    matches: [
      "import { PgBoss } from \"pg-boss\"\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")",
    ],
    rejects: [
      "const PgBoss = (...parts) => parts\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")",
    ],
  },
  {
    library: PG_BOSS,
    patternKey: "factory:PgBoss:*>call:send:*",
    matches: [
      "import { PgBoss } from \"pg-boss\"\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")\nconst id = await boss.send(\"email-welcome\", { to: \"ada@example.com\" })",
    ],
    rejects: [
      "const boss = makeLocalRegistry()\nconst id = await boss.send(\"email-welcome\", { to: \"ada@example.com\" })",
    ],
  },
  {
    library: PG_BOSS,
    patternKey: "factory:PgBoss:*>call:work:*",
    matches: [
      "import { PgBoss } from \"pg-boss\"\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")\nawait boss.work(\"email-welcome\", async ([job]) => { await sendWelcome(job.data) })",
    ],
    rejects: [
      "const boss = makeLocalRegistry()\nawait boss.work(\"email-welcome\", async ([job]) => { await sendWelcome(job.data) })",
    ],
  },
  {
    library: PG_BOSS,
    patternKey: "factory:PgBoss:*>call:schedule:*",
    matches: [
      "import { PgBoss } from \"pg-boss\"\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")\nawait boss.schedule(\"nightly-report\", \"0 3 * * *\")",
    ],
    rejects: [
      "const boss = makeLocalRegistry()\nawait boss.schedule(\"nightly-report\", \"0 3 * * *\")",
    ],
  },
  {
    library: PG_BOSS,
    patternKey: "factory:PgBoss:*>call:publish:*",
    matches: [
      "import { PgBoss } from \"pg-boss\"\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")\nawait boss.publish(\"user.signed-up\", { id: 1 })",
    ],
    rejects: [
      "const boss = makeLocalRegistry()\nawait boss.publish(\"user.signed-up\", { id: 1 })",
    ],
  },
  {
    library: PG_BOSS,
    patternKey: "factory:PgBoss:*>call:on:*",
    matches: [
      "import { PgBoss } from \"pg-boss\"\nconst boss = new PgBoss(\"postgres://user:pass@host/database\")\nboss.on(\"error\", (error) => { report(error) })",
    ],
    rejects: [
      "const boss = makeLocalRegistry()\nboss.on(\"error\", (error) => { report(error) })",
    ],
  },
]

const SIDEQUEST = "Sidequest"

export const sidequestFixtures: readonly PatternFixture[] = [
  {
    library: SIDEQUEST,
    patternKey: "class:Job:*",
    matches: [
      "import { Job } from \"sidequest\"\nexport class EmailJob extends Job {\n  async run(to, subject) { await sendMail(to, subject) }\n}",
    ],
    rejects: [
      "class Job {}\nexport class EmailJob extends Job {\n  async run(to, subject) { await sendMail(to, subject) }\n}",
    ],
  },
  {
    library: SIDEQUEST,
    patternKey: "call:Sidequest.build:*",
    matches: [
      "import { Sidequest } from \"sidequest\"\nawait Sidequest.build(EmailJob).enqueue(\"user@example.com\", \"Welcome\")",
    ],
    rejects: [
      "const Sidequest = makeLocalRegistry()\nawait Sidequest.build(EmailJob).enqueue(\"user@example.com\", \"Welcome\")",
    ],
  },
  {
    library: SIDEQUEST,
    patternKey: "call:Sidequest.start:*",
    matches: [
      "import { Sidequest } from \"sidequest\"\nawait Sidequest.start()",
    ],
    rejects: [
      "const Sidequest = makeLocalRegistry()\nawait Sidequest.start()",
    ],
  },
]
