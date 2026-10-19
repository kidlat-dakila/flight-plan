import type { CatalogueLibrary } from "@/catalogue/types"

export const logbookLibrary: CatalogueLibrary = {
  name: "Logbook",
  specifiers: ["logbook"],
  documentedVersion: "1.10",
  category: "logging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Logger",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "error", slots: [], makes: "telemetry" },
      ],
    },
    {
      kind: "factory",
      name: "StderrHandler",
      methods: [
        { kind: "call", name: "push_application", slots: [], makes: "config" },
      ],
    },
  ],
}

export const loguruLibrary: CatalogueLibrary = {
  name: "Loguru",
  specifiers: ["loguru"],
  documentedVersion: "0.7",
  category: "logging",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "logger.info", slots: [], makes: "telemetry" },
    { kind: "call", name: "logger.debug", slots: [], makes: "telemetry" },
    { kind: "call", name: "logger.exception", slots: [], makes: "telemetry" },
    { kind: "call", name: "logger.add", slots: [], makes: "config" },
    { kind: "call", name: "logger.bind", slots: [], makes: "telemetry" },
    { kind: "decorator", name: "logger.catch", makes: "telemetry" },
  ],
}

export const sentryPythonLibrary: CatalogueLibrary = {
  name: "sentry-python",
  specifiers: ["sentry_sdk"],
  documentedVersion: "2.71",
  category: "logging",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "init", slots: [], makes: "config" },
    { kind: "call", name: "capture_exception", slots: [], makes: "telemetry" },
    { kind: "call", name: "capture_message", slots: [], makes: "telemetry" },
    { kind: "call", name: "set_tag", slots: [], makes: "telemetry" },
    { kind: "call", name: "add_breadcrumb", slots: [], makes: "telemetry" },
  ],
}

export const structlogLibrary: CatalogueLibrary = {
  name: "structlog",
  specifiers: ["structlog"],
  documentedVersion: "26.1",
  category: "logging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "get_logger",
      methods: [
        { kind: "call", name: "info", slots: [], makes: "telemetry" },
        { kind: "call", name: "bind", slots: [], makes: "telemetry" },
      ],
    },
    { kind: "call", name: "configure", slots: [], makes: "config" },
  ],
}

export const opentelemetryPythonLibrary: CatalogueLibrary = {
  name: "opentelemetry-python",
  specifiers: ["opentelemetry.trace"],
  documentedVersion: "1.45",
  category: "logging",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "get_tracer",
      methods: [
        { kind: "call", name: "start_as_current_span", slots: [], makes: "telemetry" },
        { kind: "decorator", name: "start_as_current_span", makes: "telemetry" },
      ],
    },
    { kind: "call", name: "set_tracer_provider", slots: [], makes: "config" },
  ],
}
