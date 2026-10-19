import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const CONTEXT_AND_WIRING = "context-and-wiring"

export const inversifyLibrary: CatalogueLibrary = {
  name: "InversifyJS",
  specifiers: ["inversify"],
  documentedVersion: "8.2",
  category: "dependency-injection",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Container",
      methods: [
        { kind: "call", name: "bind", slots: [], classifies: CONTEXT_AND_WIRING },
        { kind: "call", name: "get", slots: [], classifies: CONTEXT_AND_WIRING },
        { kind: "call", name: "getAsync", slots: [], classifies: CONTEXT_AND_WIRING },
        { kind: "call", name: "getAll", slots: [], classifies: CONTEXT_AND_WIRING },
        { kind: "call", name: "load", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    { kind: "factory", name: "ContainerModule", methods: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "injectable", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "inject", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "multiInject", classifies: CONTEXT_AND_WIRING },
  ],
}

export const tsyringeLibrary: CatalogueLibrary = {
  name: "TSyringe",
  specifiers: ["tsyringe"],
  documentedVersion: "4.10",
  category: "dependency-injection",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "container.register", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "container.registerSingleton", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "container.registerInstance", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "container.resolve", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "injectable", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "singleton", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "autoInjectable", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "inject", classifies: CONTEXT_AND_WIRING },
  ],
}

const AWILIX_CONTAINER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "register", slots: [], classifies: CONTEXT_AND_WIRING },
  { kind: "call", name: "resolve", slots: [], classifies: CONTEXT_AND_WIRING },
  { kind: "call", name: "loadModules", slots: [], classifies: CONTEXT_AND_WIRING },
]

export const awilixLibrary: CatalogueLibrary = {
  name: "Awilix",
  specifiers: ["awilix"],
  documentedVersion: "13.0",
  category: "dependency-injection",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createContainer",
      methods: [
        ...AWILIX_CONTAINER_METHODS,
        { kind: "factory", name: "createScope", methods: AWILIX_CONTAINER_METHODS },
      ],
    },
    { kind: "call", name: "asClass", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "asFunction", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "asValue", slots: [], classifies: CONTEXT_AND_WIRING },
  ],
}

export const injectionJsLibrary: CatalogueLibrary = {
  name: "injection-js",
  specifiers: ["injection-js"],
  documentedVersion: "2.6",
  category: "dependency-injection",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "ReflectiveInjector.resolveAndCreate",
      methods: [
        { kind: "call", name: "get", slots: [], classifies: CONTEXT_AND_WIRING },
      ],
    },
    { kind: "call", name: "inject", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "Injectable", classifies: CONTEXT_AND_WIRING },
  ],
}

export const typediLibrary: CatalogueLibrary = {
  name: "TypeDI",
  specifiers: ["typedi"],
  documentedVersion: "0.10",
  category: "dependency-injection",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "Container.set", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "call", name: "Container.get", slots: [], classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "Service", classifies: CONTEXT_AND_WIRING },
    { kind: "decorator", name: "Inject", classifies: CONTEXT_AND_WIRING },
  ],
}
