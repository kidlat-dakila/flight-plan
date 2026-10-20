import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const APP_SETUP = "app-setup"

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
        { kind: "call", name: "bind", slots: [], classifies: APP_SETUP },
        { kind: "call", name: "get", slots: [], classifies: APP_SETUP },
        { kind: "call", name: "getAsync", slots: [], classifies: APP_SETUP },
        { kind: "call", name: "getAll", slots: [], classifies: APP_SETUP },
        { kind: "call", name: "load", slots: [], classifies: APP_SETUP },
      ],
    },
    { kind: "factory", name: "ContainerModule", methods: [], classifies: APP_SETUP },
    { kind: "decorator", name: "injectable", classifies: APP_SETUP },
    { kind: "decorator", name: "inject", classifies: APP_SETUP },
    { kind: "decorator", name: "multiInject", classifies: APP_SETUP },
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
    { kind: "call", name: "container.register", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "container.registerSingleton", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "container.registerInstance", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "container.resolve", slots: [], classifies: APP_SETUP },
    { kind: "decorator", name: "injectable", classifies: APP_SETUP },
    { kind: "decorator", name: "singleton", classifies: APP_SETUP },
    { kind: "decorator", name: "autoInjectable", classifies: APP_SETUP },
    { kind: "decorator", name: "inject", classifies: APP_SETUP },
  ],
}

const AWILIX_CONTAINER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "register", slots: [], classifies: APP_SETUP },
  { kind: "call", name: "resolve", slots: [], classifies: APP_SETUP },
  { kind: "call", name: "loadModules", slots: [], classifies: APP_SETUP },
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
    { kind: "call", name: "asClass", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "asFunction", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "asValue", slots: [], classifies: APP_SETUP },
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
        { kind: "call", name: "get", slots: [], classifies: APP_SETUP },
      ],
    },
    { kind: "call", name: "inject", slots: [], classifies: APP_SETUP },
    { kind: "decorator", name: "Injectable", classifies: APP_SETUP },
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
    { kind: "call", name: "Container.set", slots: [], classifies: APP_SETUP },
    { kind: "call", name: "Container.get", slots: [], classifies: APP_SETUP },
    { kind: "decorator", name: "Service", classifies: APP_SETUP },
    { kind: "decorator", name: "Inject", classifies: APP_SETUP },
  ],
}
