import type { CatalogueLibrary } from "@/catalogue/types"

const APP_SETUP = "app-setup"

export const dependencyInjectorLibrary: CatalogueLibrary = {
  name: "Dependency Injector",
  specifiers: ["dependency_injector", "dependency_injector.containers", "dependency_injector.providers", "dependency_injector.wiring"],
  documentedVersion: "4.49",
  category: "dependency-injection",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "DeclarativeContainer",
      classifies: APP_SETUP,
      members: [],
      methods: [
        { kind: "call", name: "wire", slots: [], classifies: APP_SETUP },
      ],
    },
    { kind: "call", name: "Singleton", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "Factory", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "Configuration", slots: [], classifies: APP_SETUP },
    { kind: "decorator", name: "inject", classifies: APP_SETUP },
  ],
}

export const svcsLibrary: CatalogueLibrary = {
  name: "svcs",
  specifiers: ["svcs"],
  documentedVersion: "26.2",
  category: "dependency-injection",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Registry",
      methods: [
        { kind: "call", name: "register_factory", slots: [], classifies: APP_SETUP },
        { kind: "call", name: "register_value", slots: [], classifies: APP_SETUP },
      ],
    },
    {
      kind: "factory",
      name: "Container",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: APP_SETUP },
        { kind: "call", name: "register_local_value", slots: [], classifies: APP_SETUP },
      ],
    },
  ],
}

export const injectorLibrary: CatalogueLibrary = {
  name: "Injector",
  specifiers: ["injector"],
  documentedVersion: "0.24",
  category: "dependency-injection",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Injector",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: APP_SETUP },
      ],
    },
    { kind: "class", name: "Module", classifies: APP_SETUP, members: [], methods: [] },
    { kind: "decorator", name: "inject", classifies: APP_SETUP },
    { kind: "decorator", name: "provider", classifies: APP_SETUP },
    { kind: "decorator", name: "singleton", classifies: APP_SETUP },
  ],
}

export const pythonInjectLibrary: CatalogueLibrary = {
  name: "python-inject",
  specifiers: ["inject"],
  documentedVersion: "5.5",
  category: "dependency-injection",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "configure", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "instance", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "attr", slots: [], classifies: APP_SETUP },
    { kind: "decorator", name: "params", classifies: APP_SETUP },
    { kind: "decorator", name: "autoparams", classifies: APP_SETUP },
  ],
}

export const dishkaLibrary: CatalogueLibrary = {
  name: "Dishka",
  specifiers: ["dishka", "dishka.integrations.fastapi"],
  documentedVersion: "1.10",
  category: "dependency-injection",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "make_container",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: APP_SETUP },
      ],
    },
    {
      kind: "factory",
      name: "make_async_container",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: APP_SETUP },
      ],
    },
    { kind: "class", name: "Provider", classifies: APP_SETUP, members: [], methods: [] },
    { kind: "factory", name: "Provider", methods: [], classifies: APP_SETUP },
    { kind: "decorator", name: "provide", classifies: APP_SETUP },
    { kind: "decorator", name: "inject", classifies: APP_SETUP },
    { kind: "call", name: "setup_dishka", slots: [], classifies: APP_SETUP },
  ],
}
