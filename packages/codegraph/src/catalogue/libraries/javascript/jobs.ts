import type { CatalogueLibrary } from "@/catalogue/types"

const THIRD_ARGUMENT = 2

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

export const commanderJsLibrary: CatalogueLibrary = {
  name: "Commander.js",
  specifiers: ["commander"],
  documentedVersion: "15.0",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Command",
      methods: [
        { kind: "call", name: "command", slots: [], eventAt: 0 },
        { kind: "call", name: "action", slots: [{ at: 0, runs: "command" }] },
        { kind: "call", name: "parse", slots: [], makes: "config" },
      ],
    },
    { kind: "call", name: "program.action", slots: [{ at: 0, runs: "command" }] },
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

export const oclifLibrary: CatalogueLibrary = {
  name: "oclif",
  specifiers: ["@oclif/core"],
  documentedVersion: "5.1",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "class",
      name: "Command",
      members: [{ name: "run", runs: "command" }, { name: "init", runs: "in-place" }, { name: "catch", runs: "event" }],
      methods: [],
    },
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

export const yargsLibrary: CatalogueLibrary = {
  name: "yargs",
  specifiers: ["yargs", "yargs/helpers"],
  documentedVersion: "18.2",
  category: "jobs",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "command", slots: [{ at: "last", runs: "command" }, { at: THIRD_ARGUMENT, runs: "in-place" }], eventAt: 0 },
        { kind: "call", name: "middleware", slots: [{ at: 0, runs: "middleware" }] },
        { kind: "call", name: "parse", slots: [], makes: "config" },
      ],
    },
  ],
}
