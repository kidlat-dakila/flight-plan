import type { CatalogueLibrary } from "@/catalogue/types"

export const celeryLibrary: CatalogueLibrary = {
  name: "Celery",
  specifiers: ["celery"],
  documentedVersion: "5.6",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Celery",
      methods: [
        { kind: "decorator", name: "task", runs: "job" },
        { kind: "call", name: "add_periodic_task", slots: [], makes: "publish" },
      ],
    },
    { kind: "decorator", name: "shared_task", runs: "job" },
  ],
}

export const hueyLibrary: CatalogueLibrary = {
  name: "huey",
  specifiers: ["huey"],
  documentedVersion: "3.4",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "RedisHuey",
      methods: [
        { kind: "decorator", name: "task", runs: "job" },
        { kind: "decorator", name: "periodic_task", runs: "job" },
      ],
    },
  ],
}

export const kafkaPythonLibrary: CatalogueLibrary = {
  name: "kafka-python",
  specifiers: ["kafka"],
  documentedVersion: "3.0",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "KafkaProducer",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "flush", slots: [], makes: "publish" },
      ],
    },
    {
      kind: "factory",
      name: "KafkaConsumer",
      makes: "publish",
      methods: [
        { kind: "call", name: "subscribe", slots: [], eventAt: "0[]" },
      ],
    },
  ],
}

export const mrqLibrary: CatalogueLibrary = {
  name: "MRQ",
  specifiers: ["mrq", "mrq.task"],
  documentedVersion: "0.9",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Task",
      members: [{ name: "run", runs: "job" }],
      methods: [],
    },
  ],
}

export const rqLibrary: CatalogueLibrary = {
  name: "RQ",
  specifiers: ["rq"],
  documentedVersion: "2.12",
  category: "queues",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Queue",
      methods: [
        { kind: "call", name: "enqueue", slots: [{ at: 0, runs: "job" }], makes: "publish" },
      ],
    },
    { kind: "decorator", name: "job", runs: "job" },
  ],
}
