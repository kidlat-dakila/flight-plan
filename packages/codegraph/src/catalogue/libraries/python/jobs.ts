import type { CatalogueLibrary } from "@/catalogue/types"

export const airflowLibrary: CatalogueLibrary = {
  name: "Airflow",
  specifiers: ["airflow", "airflow.sdk"],
  documentedVersion: "3.3",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "DAG",
      makes: "publish",
      methods: [],
    },
    { kind: "decorator", name: "task", runs: "job" },
  ],
}

export const apschedulerLibrary: CatalogueLibrary = {
  name: "APScheduler",
  specifiers: ["apscheduler"],
  documentedVersion: "3.11",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Scheduler",
      methods: [
        { kind: "call", name: "add_schedule", slots: [{ at: 0, runs: "job" }] },
        { kind: "call", name: "add_job", slots: [{ at: 0, runs: "job" }] },
        { kind: "call", name: "start_in_background", slots: [], makes: "config" },
      ],
    },
    {
      kind: "factory",
      name: "AsyncScheduler",
      methods: [
        { kind: "call", name: "add_schedule", slots: [{ at: 0, runs: "job" }] },
      ],
    },
  ],
}

export const cementLibrary: CatalogueLibrary = {
  name: "Cement",
  specifiers: ["cement"],
  documentedVersion: "3.0",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "ex", runs: "command" },
    {
      kind: "class",
      name: "App",
      makes: "config",
      members: [],
      methods: [],
    },
  ],
}

export const clickLibrary: CatalogueLibrary = {
  name: "Click",
  specifiers: ["click"],
  documentedVersion: "8.5",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "command", runs: "command" },
    { kind: "decorator", name: "option", makes: "config" },
    { kind: "decorator", name: "argument", makes: "config" },
    { kind: "call", name: "echo", slots: [], makes: "telemetry" },
  ],
}

export const cliffLibrary: CatalogueLibrary = {
  name: "cliff",
  specifiers: ["cliff", "cliff.command", "cliff.app"],
  documentedVersion: "4.16",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Command",
      members: [{ name: "take_action", runs: "command" }, { name: "get_parser", runs: "in-place" }],
      methods: [],
    },
  ],
}

export const joblibLibrary: CatalogueLibrary = {
  name: "Joblib",
  specifiers: ["joblib"],
  documentedVersion: "1.6",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "delayed", slots: [{ at: 0, runs: "kept" }] },
    {
      kind: "factory",
      name: "Memory",
      methods: [
        { kind: "decorator", name: "cache", makes: "cache" },
      ],
    },
    { kind: "call", name: "dump", slots: [], makes: "data" },
    { kind: "call", name: "load", slots: [], makes: "data" },
  ],
}

export const planLibrary: CatalogueLibrary = {
  name: "Plan",
  specifiers: ["plan"],
  documentedVersion: "0.5",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Plan",
      methods: [
        { kind: "call", name: "command", slots: [], makes: "publish" },
        { kind: "call", name: "run", slots: [], makes: "config" },
      ],
    },
  ],
}

export const scheduleLibrary: CatalogueLibrary = {
  name: "schedule",
  specifiers: ["schedule"],
  documentedVersion: "1.2",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "every", slots: [], makes: "publish" },
    { kind: "call", name: "run_pending", slots: [], makes: "publish" },
    { kind: "decorator", name: "repeat", runs: "job" },
  ],
}

export const spiffworkflowLibrary: CatalogueLibrary = {
  name: "SpiffWorkflow",
  specifiers: ["SpiffWorkflow", "SpiffWorkflow.bpmn.parser"],
  documentedVersion: "3.2",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "BpmnParser",
      methods: [
        { kind: "call", name: "get_collaboration", slots: [], makes: "config" },
      ],
    },
  ],
}

export const taskflowLibrary: CatalogueLibrary = {
  name: "TaskFlow",
  specifiers: ["taskflow", "taskflow.task", "taskflow.engines"],
  documentedVersion: "6.5",
  category: "jobs",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Task",
      members: [{ name: "execute", runs: "job" }, { name: "revert", runs: "event" }],
      methods: [],
    },
    { kind: "call", name: "run", slots: [], makes: "publish" },
  ],
}
