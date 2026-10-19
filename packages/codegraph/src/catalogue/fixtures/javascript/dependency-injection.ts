import type { PatternFixture } from "@/catalogue/types"

const INVERSIFY = "InversifyJS"

export const inversifyFixtures: readonly PatternFixture[] = [
  {
    library: INVERSIFY,
    patternKey: "factory:Container:*",
    matches: [
      "import { Container } from \"inversify\"\nconst container = new Container()",
    ],
    rejects: [
      "const Container = (...parts) => parts\nconst container = new Container()",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "factory:Container:*>call:bind:*",
    matches: [
      "import { Container } from \"inversify\"\nconst container = new Container()\ncontainer.bind(Katana).toSelf()",
    ],
    rejects: [
      "const container = makeLocalRegistry()\ncontainer.bind(Katana).toSelf()",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "factory:Container:*>call:get:*",
    matches: [
      "import { Container } from \"inversify\"\nconst container = new Container()\nconst ninja = container.get(Ninja)",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst ninja = container.get(Ninja)",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "factory:Container:*>call:getAsync:*",
    matches: [
      "import { Container } from \"inversify\"\nconst container = new Container()\nconst ninja = await container.getAsync(Ninja)",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst ninja = await container.getAsync(Ninja)",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "factory:Container:*>call:getAll:*",
    matches: [
      "import { Container } from \"inversify\"\nconst container = new Container()\nconst warriors = container.getAll(Warrior)",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst warriors = container.getAll(Warrior)",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "factory:Container:*>call:load:*",
    matches: [
      "import { Container } from \"inversify\"\nconst container = new Container()\nawait container.load(warriorsModule)",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nawait container.load(warriorsModule)",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "factory:ContainerModule:*",
    matches: [
      "import { ContainerModule } from \"inversify\"\nconst warriorsModule = new ContainerModule((options) => { options.bind(Ninja).toSelf() })",
    ],
    rejects: [
      "const ContainerModule = (...parts) => parts\nconst warriorsModule = new ContainerModule((options) => { options.bind(Ninja).toSelf() })",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "decorator:injectable:*",
    matches: [
      "import { injectable } from \"inversify\"\n@injectable()\nclass Katana {\n  hit() { return \"cut!\" }\n}",
    ],
    rejects: [
      "const injectable = (...parts) => parts\n@injectable()\nclass Katana {\n  hit() { return \"cut!\" }\n}",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "decorator:inject:*",
    matches: [
      "import { inject } from \"inversify\"\nclass Ninja {\n  @inject(Katana)\n  katana\n}",
    ],
    rejects: [
      "const inject = (...parts) => parts\nclass Ninja {\n  @inject(Katana)\n  katana\n}",
    ],
  },
  {
    library: INVERSIFY,
    patternKey: "decorator:multiInject:*",
    matches: [
      "import { multiInject } from \"inversify\"\nclass UserClient {\n  @multiInject(TYPES.User)\n  users\n}",
    ],
    rejects: [
      "const multiInject = (...parts) => parts\nclass UserClient {\n  @multiInject(TYPES.User)\n  users\n}",
    ],
  },
]

const TSYRINGE = "TSyringe"

export const tsyringeFixtures: readonly PatternFixture[] = [
  {
    library: TSYRINGE,
    patternKey: "call:container.register:*",
    matches: [
      "import { container } from \"tsyringe\"\ncontainer.register(\"SuperService\", { useClass: TestService })",
    ],
    rejects: [
      "const container = makeLocalRegistry()\ncontainer.register(\"SuperService\", { useClass: TestService })",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "call:container.registerSingleton:*",
    matches: [
      "import { container } from \"tsyringe\"\ncontainer.registerSingleton(\"foo\", Foo)",
    ],
    rejects: [
      "const container = makeLocalRegistry()\ncontainer.registerSingleton(\"foo\", Foo)",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "call:container.registerInstance:*",
    matches: [
      "import { container } from \"tsyringe\"\ncontainer.registerInstance(\"config\", { mode: \"production\" })",
    ],
    rejects: [
      "const container = makeLocalRegistry()\ncontainer.registerInstance(\"config\", { mode: \"production\" })",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "call:container.resolve:*",
    matches: [
      "import { container } from \"tsyringe\"\nconst client = container.resolve(Client)",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst client = container.resolve(Client)",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "decorator:injectable:*",
    matches: [
      "import { injectable } from \"tsyringe\"\n@injectable()\nclass Foo {\n  constructor(database) { this.database = database }\n}",
    ],
    rejects: [
      "const injectable = (...parts) => parts\n@injectable()\nclass Foo {\n  constructor(database) { this.database = database }\n}",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "decorator:singleton:*",
    matches: [
      "import { singleton } from \"tsyringe\"\n@singleton()\nclass Config {\n  mode = \"production\"\n}",
    ],
    rejects: [
      "const singleton = (...parts) => parts\n@singleton()\nclass Config {\n  mode = \"production\"\n}",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "decorator:autoInjectable:*",
    matches: [
      "import { autoInjectable } from \"tsyringe\"\n@autoInjectable()\nclass LoggerClient {\n  constructor(logger) { this.logger = logger }\n}",
    ],
    rejects: [
      "const autoInjectable = (...parts) => parts\n@autoInjectable()\nclass LoggerClient {\n  constructor(logger) { this.logger = logger }\n}",
    ],
  },
  {
    library: TSYRINGE,
    patternKey: "decorator:inject:*",
    matches: [
      "import { inject } from \"tsyringe\"\nclass Client {\n  constructor(@inject(\"SuperService\") private service: SuperService) {}\n}",
    ],
    rejects: [
      "const inject = (...parts) => parts\nclass Client {\n  constructor(@inject(\"SuperService\") private service: SuperService) {}\n}",
    ],
  },
]

const AWILIX = "Awilix"

export const awilixFixtures: readonly PatternFixture[] = [
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()",
    ],
    rejects: [
      "const createContainer = (...parts) => parts\nconst container = createContainer()",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>call:register:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\ncontainer.register({ userService: service })",
    ],
    rejects: [
      "const container = makeLocalRegistry()\ncontainer.register({ userService: service })",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>call:resolve:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\nconst userService = container.resolve(\"userService\")",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst userService = container.resolve(\"userService\")",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>call:loadModules:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\ncontainer.loadModules([\"services/*.js\"])",
    ],
    rejects: [
      "const container = makeLocalRegistry()\ncontainer.loadModules([\"services/*.js\"])",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>factory:createScope:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\nconst scope = container.createScope()",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst scope = container.createScope()",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>factory:createScope:*>call:register:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\nconst scope = container.createScope()\nscope.register({ currentUser: user })",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst scope = container.createScope()\nscope.register({ currentUser: user })",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>factory:createScope:*>call:resolve:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\nconst scope = container.createScope()\nconst currentUser = scope.resolve(\"currentUser\")",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst scope = container.createScope()\nconst currentUser = scope.resolve(\"currentUser\")",
    ],
  },
  {
    library: AWILIX,
    patternKey: "factory:createContainer:*>factory:createScope:*>call:loadModules:*",
    matches: [
      "import { createContainer } from \"awilix\"\nconst container = createContainer()\nconst scope = container.createScope()\nscope.loadModules([\"handlers/*.js\"])",
    ],
    rejects: [
      "const container = makeLocalRegistry()\nconst scope = container.createScope()\nscope.loadModules([\"handlers/*.js\"])",
    ],
  },
  {
    library: AWILIX,
    patternKey: "call:asClass:*",
    matches: [
      "import { asClass } from \"awilix\"\nconst userService = asClass(UserService).singleton()",
    ],
    rejects: [
      "const asClass = (...parts) => parts\nconst userService = asClass(UserService).singleton()",
    ],
  },
  {
    library: AWILIX,
    patternKey: "call:asFunction:*",
    matches: [
      "import { asFunction } from \"awilix\"\nconst counterValue = asFunction(() => counter++).scoped()",
    ],
    rejects: [
      "const asFunction = (...parts) => parts\nconst counterValue = asFunction(() => counter++).scoped()",
    ],
  },
  {
    library: AWILIX,
    patternKey: "call:asValue:*",
    matches: [
      "import { asValue } from \"awilix\"\nconst db = asValue({ query: () => [] })",
    ],
    rejects: [
      "const asValue = (...parts) => parts\nconst db = asValue({ query: () => [] })",
    ],
  },
]

const INJECTION_JS = "injection-js"

export const injectionJsFixtures: readonly PatternFixture[] = [
  {
    library: INJECTION_JS,
    patternKey: "factory:ReflectiveInjector.resolveAndCreate:*",
    matches: [
      "import { ReflectiveInjector } from \"injection-js\"\nconst injector = ReflectiveInjector.resolveAndCreate([Http, Service])",
    ],
    rejects: [
      "const ReflectiveInjector = makeLocalRegistry()\nconst injector = ReflectiveInjector.resolveAndCreate([Http, Service])",
    ],
  },
  {
    library: INJECTION_JS,
    patternKey: "factory:ReflectiveInjector.resolveAndCreate:*>call:get:*",
    matches: [
      "import { ReflectiveInjector } from \"injection-js\"\nconst injector = ReflectiveInjector.resolveAndCreate([Http, Service])\nconst service = injector.get(Service)",
    ],
    rejects: [
      "const injector = makeLocalRegistry()\nconst service = injector.get(Service)",
    ],
  },
  {
    library: INJECTION_JS,
    patternKey: "call:inject:*",
    matches: [
      "import { inject } from \"injection-js\"\nclass Service {\n  http = inject(Http)\n}",
    ],
    rejects: [
      "const inject = (...parts) => parts\nclass Service {\n  http = inject(Http)\n}",
    ],
  },
  {
    library: INJECTION_JS,
    patternKey: "decorator:Injectable:*",
    matches: [
      "import { Injectable } from \"injection-js\"\n@Injectable()\nclass Service {\n  constructor(http) { this.http = http }\n}",
    ],
    rejects: [
      "const Injectable = (...parts) => parts\n@Injectable()\nclass Service {\n  constructor(http) { this.http = http }\n}",
    ],
  },
]

const TYPEDI = "TypeDI"

export const typediFixtures: readonly PatternFixture[] = [
  {
    library: TYPEDI,
    patternKey: "call:Container.set:*",
    matches: [
      "import { Container } from \"typedi\"\nContainer.set(\"authorization-token\", \"RVT9rVjSVN\")",
    ],
    rejects: [
      "const Container = makeLocalRegistry()\nContainer.set(\"authorization-token\", \"RVT9rVjSVN\")",
    ],
  },
  {
    library: TYPEDI,
    patternKey: "call:Container.get:*",
    matches: [
      "import { Container } from \"typedi\"\nconst example = Container.get(ExampleClass)",
    ],
    rejects: [
      "const Container = makeLocalRegistry()\nconst example = Container.get(ExampleClass)",
    ],
  },
  {
    library: TYPEDI,
    patternKey: "decorator:Service:*",
    matches: [
      "import { Service } from \"typedi\"\n@Service()\nclass UserRepository {\n  findAll() { return [] }\n}",
    ],
    rejects: [
      "const Service = (...parts) => parts\n@Service()\nclass UserRepository {\n  findAll() { return [] }\n}",
    ],
  },
  {
    library: TYPEDI,
    patternKey: "decorator:Inject:*",
    matches: [
      "import { Inject } from \"typedi\"\nclass UserRepository {\n  @Inject(\"authorization-token\")\n  authorizationToken\n}",
    ],
    rejects: [
      "const Inject = (...parts) => parts\nclass UserRepository {\n  @Inject(\"authorization-token\")\n  authorizationToken\n}",
    ],
  },
]
