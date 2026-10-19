import type { CatalogueLibrary } from "@/catalogue/types"

export const agendaLibrary: CatalogueLibrary = {
  name: "Agenda",
  specifiers: ["agenda"],
  documentedVersion: "6.2",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Agenda",
      methods: [
        { kind: "call", name: "define", slots: [{ at: "last", runs: "job" }], eventAt: 0 },
        { kind: "call", name: "every", slots: [], makes: "publish", eventAt: 1 },
        { kind: "call", name: "schedule", slots: [], makes: "publish", eventAt: 1 },
        { kind: "call", name: "now", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const breeLibrary: CatalogueLibrary = {
  name: "Bree",
  specifiers: ["bree"],
  documentedVersion: "9.2",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "start", slots: [], makes: "publish" },
        { kind: "call", name: "run", slots: [], makes: "publish" },
        { kind: "call", name: "add", slots: [], makes: "publish" },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const cronScheduleLibrary: CatalogueLibrary = {
  name: "cron-schedule",
  specifiers: ["cron-schedule"],
  documentedVersion: "6.0",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "parseCronExpression",
      methods: [
        { kind: "call", name: "getNextDate", slots: [], makes: "config" },
      ],
    },
  ],
}

export const cronerLibrary: CatalogueLibrary = {
  name: "Croner",
  specifiers: ["croner"],
  documentedVersion: "10.0",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Cron",
      slots: [{ at: "last", runs: "job" }],
      methods: [],
    },
  ],
}

export const motiaLibrary: CatalogueLibrary = {
  name: "Motia",
  specifiers: ["motia"],
  documentedVersion: "1.0",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "file", glob: "**/*.step.{js,ts}", exports: [{ name: "handler", runs: "event" }] },
  ],
}

export const triggerDevLibrary: CatalogueLibrary = {
  name: "Trigger.dev",
  specifiers: ["@trigger.dev/sdk", "@trigger.dev/sdk/v3"],
  documentedVersion: "4.7",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "task",
      slots: [{ at: "run", runs: "job" }],
      methods: [
        { kind: "call", name: "trigger", slots: [], makes: "publish" },
        { kind: "call", name: "batchTrigger", slots: [], makes: "publish" },
      ],
    },
    { kind: "call", name: "schedules.task", slots: [{ at: "run", runs: "job" }] },
  ],
}

export const workflowLibrary: CatalogueLibrary = {
  name: "Workflow",
  specifiers: ["workflow", "workflow/api"],
  documentedVersion: "5.2",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "directive", text: "use workflow", runs: "job" },
    { kind: "directive", text: "use step", runs: "in-place" },
    { kind: "call", name: "start", slots: [], makes: "publish" },
    { kind: "call", name: "sleep", slots: [], makes: "publish" },
  ],
}
