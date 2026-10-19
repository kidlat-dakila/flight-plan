import type { CatalogueLibrary } from "@/catalogue/types"

const CONTEXT_AND_WIRING = "context-and-wiring"

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
      classifies: CONTEXT_AND_WIRING,
      members: [],
      methods: [
        { kind: "call", name: "wire", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    { kind: "call", name: "Singleton", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "Factory", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "Configuration", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "inject", classifies: CONTEXT_AND_WIRING },
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
        { kind: "call", name: "register_factory", slots: [], classifies: CONTEXT_AND_WIRING },
        { kind: "call", name: "register_value", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    {
      kind: "factory",
      name: "Container",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: CONTEXT_AND_WIRING },
        { kind: "call", name: "register_local_value", slots: [], classifies: CONTEXT_AND_WIRING },
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
        { kind: "call", name: "get", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    { kind: "class", name: "Module", classifies: CONTEXT_AND_WIRING, members: [], methods: [] },
    { kind: "decorator", name: "inject", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "provider", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "singleton", classifies: CONTEXT_AND_WIRING },
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
    { kind: "call", name: "configure", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "instance", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "attr", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "params", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "autoparams", classifies: CONTEXT_AND_WIRING },
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
        { kind: "call", name: "get", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    {
      kind: "factory",
      name: "make_async_container",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    { kind: "class", name: "Provider", classifies: CONTEXT_AND_WIRING, members: [], methods: [] },
    { kind: "factory", name: "Provider", methods: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "provide", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "inject", classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "setup_dishka", slots: [], classifies: CONTEXT_AND_WIRING },
  ],
}
