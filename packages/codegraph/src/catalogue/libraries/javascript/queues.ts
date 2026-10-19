import type { CatalogueLibrary } from "@/catalogue/types"

export const absurdLibrary: CatalogueLibrary = {
  name: "Absurd",
  specifiers: ["absurd-sdk"],
  documentedVersion: "0.5",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Absurd",
      methods: [
        { kind: "call", name: "registerTask", slots: [{ at: "last", runs: "job" }], eventAt: "0.name" },
        { kind: "call", name: "spawn", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
  ],
}

export const beeQueueLibrary: CatalogueLibrary = {
  name: "Bee-Queue",
  specifiers: ["bee-queue"],
  documentedVersion: "2.0",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "createJob", slots: [], makes: "publish" },
        { kind: "call", name: "process", slots: [{ at: "last", runs: "job" }] },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const bullLibrary: CatalogueLibrary = {
  name: "Bull",
  specifiers: ["bull"],
  documentedVersion: "4.16",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "add", slots: [], makes: "publish" },
        { kind: "call", name: "process", slots: [{ at: "last", runs: "job" }] },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const bullmqLibrary: CatalogueLibrary = {
  name: "BullMQ",
  specifiers: ["bullmq"],
  documentedVersion: "6.3",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Queue",
      methods: [
        { kind: "call", name: "add", slots: [], makes: "publish", eventAt: 0 },
      ],
    },
    {
      kind: "factory",
      name: "Worker",
      slots: [{ at: 1, runs: "job" }],
      methods: [],
    },
    {
      kind: "factory",
      name: "QueueEvents",
      methods: [
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
    {
      kind: "factory",
      name: "FlowProducer",
      methods: [
        { kind: "call", name: "add", slots: [], makes: "publish" },
      ],
    },
  ],
}

export const groupmqLibrary: CatalogueLibrary = {
  name: "GroupMQ",
  specifiers: ["groupmq"],
  documentedVersion: "1.1",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Queue",
      methods: [
        { kind: "call", name: "add", slots: [], makes: "publish" },
      ],
    },
    {
      kind: "factory",
      name: "Worker",
      slots: [{ at: "handler", runs: "job" }],
      methods: [],
    },
  ],
}

export const inngestLibrary: CatalogueLibrary = {
  name: "Inngest",
  specifiers: ["inngest"],
  documentedVersion: "4.22",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Inngest",
      methods: [
        { kind: "call", name: "createFunction", slots: [{ at: "last", runs: "job" }], eventAt: "1.event" },
      ],
    },
  ],
}

export const mqttJsLibrary: CatalogueLibrary = {
  name: "MQTT.js",
  specifiers: ["mqtt"],
  documentedVersion: "5.16",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default.connect",
      methods: [
        { kind: "call", name: "publish", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "subscribe", slots: [{ at: "last", runs: "event" }], eventAt: 0 },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const pgBossLibrary: CatalogueLibrary = {
  name: "pg-boss",
  specifiers: ["pg-boss"],
  documentedVersion: "12.37",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "PgBoss",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "work", slots: [{ at: "last", runs: "job" }], eventAt: 0 },
        { kind: "call", name: "schedule", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "publish", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const sidequestLibrary: CatalogueLibrary = {
  name: "Sidequest",
  specifiers: ["sidequest"],
  documentedVersion: "1.16",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "class",
      name: "Job",
      members: [{ name: "run", runs: "job" }],
      methods: [],
    },
    { kind: "call", name: "Sidequest.build", slots: [], makes: "publish" },
    { kind: "call", name: "Sidequest.start", slots: [], makes: "config" },
  ],
}
