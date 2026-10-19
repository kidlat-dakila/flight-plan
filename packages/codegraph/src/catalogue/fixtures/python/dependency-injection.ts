import type { PatternFixture } from "@/catalogue/types"

const DEPENDENCY_INJECTOR = "Dependency Injector"

export const dependencyInjectorFixtures: readonly PatternFixture[] = [
  {
    library: DEPENDENCY_INJECTOR,
    patternKey: "class:DeclarativeContainer:*",
    matches: [
      "from dependency_injector import containers, providers\n\nclass Container(containers.DeclarativeContainer):\n    config = providers.Configuration()",
    ],
    rejects: [
      "class DeclarativeContainer:\n    pass\n\nclass Container(DeclarativeContainer):\n    config = LocalConfiguration()",
    ],
  },
  {
    library: DEPENDENCY_INJECTOR,
    patternKey: "class:DeclarativeContainer:*>call:wire:*",
    matches: [
      "from dependency_injector import containers\n\nclass Container(containers.DeclarativeContainer):\n    pass\n\ncontainer = Container()\ncontainer.wire(modules=[__name__])",
    ],
    rejects: [
      "container = LocalRegistry()\ncontainer.wire(modules=[__name__])",
    ],
  },
  {
    library: DEPENDENCY_INJECTOR,
    patternKey: "call:Singleton:*",
    matches: [
      "from dependency_injector import providers\n\napi_client = providers.Singleton(ApiClient, api_key=\"secret\", timeout=5)",
    ],
    rejects: [
      "providers = LocalRegistry()\n\napi_client = providers.Singleton(ApiClient, api_key=\"secret\", timeout=5)",
    ],
  },
  {
    library: DEPENDENCY_INJECTOR,
    patternKey: "call:Factory:*",
    matches: [
      "from dependency_injector import providers\n\nservice = providers.Factory(Service, api_client=api_client)",
    ],
    rejects: [
      "providers = LocalRegistry()\n\nservice = providers.Factory(Service, api_client=api_client)",
    ],
  },
  {
    library: DEPENDENCY_INJECTOR,
    patternKey: "call:Configuration:*",
    matches: [
      "from dependency_injector import providers\n\nconfig = providers.Configuration()",
    ],
    rejects: [
      "providers = LocalRegistry()\n\nconfig = providers.Configuration()",
    ],
  },
  {
    library: DEPENDENCY_INJECTOR,
    patternKey: "decorator:inject:*",
    matches: [
      "from dependency_injector.wiring import Provide, inject\n\n@inject\ndef main(service: Service = Provide[Container.service]) -> None:\n    service.run()",
    ],
    rejects: [
      "def inject(function):\n    return function\n\n@inject\ndef main(service: Service = Provide[Container.service]) -> None:\n    service.run()",
    ],
  },
]

const SVCS = "svcs"

export const svcsFixtures: readonly PatternFixture[] = [
  {
    library: SVCS,
    patternKey: "factory:Registry:*",
    matches: [
      "import svcs\n\nregistry = svcs.Registry()",
    ],
    rejects: [
      "def Registry():\n    return LocalRegistry()\n\nregistry = Registry()",
    ],
  },
  {
    library: SVCS,
    patternKey: "factory:Registry:*>call:register_factory:*",
    matches: [
      "import svcs\n\nregistry = svcs.Registry()\nregistry.register_factory(uuid.UUID, uuid.uuid4)",
    ],
    rejects: [
      "registry = LocalRegistry()\nregistry.register_factory(uuid.UUID, uuid.uuid4)",
    ],
  },
  {
    library: SVCS,
    patternKey: "factory:Registry:*>call:register_value:*",
    matches: [
      "import svcs\n\nregistry = svcs.Registry()\nregistry.register_value(str, \"Hello World\")",
    ],
    rejects: [
      "registry = LocalRegistry()\nregistry.register_value(str, \"Hello World\")",
    ],
  },
  {
    library: SVCS,
    patternKey: "factory:Container:*",
    matches: [
      "import svcs\n\ncontainer = svcs.Container(registry)",
    ],
    rejects: [
      "def Container(registry):\n    return LocalRegistry()\n\ncontainer = Container(registry)",
    ],
  },
  {
    library: SVCS,
    patternKey: "factory:Container:*>call:get:*",
    matches: [
      "import svcs\n\ncontainer = svcs.Container(registry)\nu = container.get(uuid.UUID)",
    ],
    rejects: [
      "container = LocalRegistry()\nu = container.get(uuid.UUID)",
    ],
  },
  {
    library: SVCS,
    patternKey: "factory:Container:*>call:register_local_value:*",
    matches: [
      "import svcs\n\ncontainer = svcs.Container(registry)\ncontainer.register_local_value(str, \"Goodbye Cruel World!\")",
    ],
    rejects: [
      "container = LocalRegistry()\ncontainer.register_local_value(str, \"Goodbye Cruel World!\")",
    ],
  },
]

const INJECTOR = "Injector"

export const injectorFixtures: readonly PatternFixture[] = [
  {
    library: INJECTOR,
    patternKey: "factory:Injector:*",
    matches: [
      "from injector import Injector\n\ninjector = Injector([DatabaseModule()])",
    ],
    rejects: [
      "def Injector(modules):\n    return LocalRegistry()\n\ninjector = Injector([DatabaseModule()])",
    ],
  },
  {
    library: INJECTOR,
    patternKey: "factory:Injector:*>call:get:*",
    matches: [
      "from injector import Injector\n\ninjector = Injector([DatabaseModule()])\nconnection = injector.get(str)",
    ],
    rejects: [
      "injector = LocalRegistry()\nconnection = injector.get(str)",
    ],
  },
  {
    library: INJECTOR,
    patternKey: "class:Module:*",
    matches: [
      "from injector import Module\n\nclass DatabaseModule(Module):\n    def configure(self, binder):\n        binder.bind(Configuration, to=Configuration(\":memory:\"))",
    ],
    rejects: [
      "class Module:\n    pass\n\nclass DatabaseModule(Module):\n    def configure(self, binder):\n        binder.bind(Configuration, to=Configuration(\":memory:\"))",
    ],
  },
  {
    library: INJECTOR,
    patternKey: "decorator:inject:*",
    matches: [
      "from injector import inject\n\nclass RequestHandler:\n    @inject\n    def __init__(self, db: Database):\n        self.db = db",
    ],
    rejects: [
      "def inject(function):\n    return function\n\nclass RequestHandler:\n    @inject\n    def __init__(self, db: Database):\n        self.db = db",
    ],
  },
  {
    library: INJECTOR,
    patternKey: "decorator:provider:*",
    matches: [
      "from injector import Module, provider\n\nclass DatabaseModule(Module):\n    @provider\n    def provide_connection(self) -> str:\n        return \"sqlite:///app.db\"",
    ],
    rejects: [
      "def provider(function):\n    return function\n\nclass DatabaseModule:\n    @provider\n    def provide_connection(self) -> str:\n        return \"sqlite:///app.db\"",
    ],
  },
  {
    library: INJECTOR,
    patternKey: "decorator:singleton:*",
    matches: [
      "from injector import singleton\n\n@singleton\nclass Configuration:\n    def __init__(self):\n        self.connection_string = \":memory:\"",
    ],
    rejects: [
      "def singleton(cls):\n    return cls\n\n@singleton\nclass Configuration:\n    def __init__(self):\n        self.connection_string = \":memory:\"",
    ],
  },
]

const PYTHON_INJECT = "python-inject"

export const pythonInjectFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_INJECT,
    patternKey: "call:configure:*",
    matches: [
      "import inject\n\ndef my_config(binder):\n    binder.bind(Cache, RedisCache(\"localhost:1234\"))\n\ninject.configure(my_config)",
    ],
    rejects: [
      "inject = LocalRegistry()\n\ninject.configure(my_config)",
    ],
  },
  {
    library: PYTHON_INJECT,
    patternKey: "call:instance:*",
    matches: [
      "import inject\n\ndef foo(bar):\n    cache = inject.instance(Cache)\n    cache.save(\"bar\", bar)",
    ],
    rejects: [
      "inject = LocalRegistry()\n\ndef foo(bar):\n    cache = inject.instance(Cache)\n    cache.save(\"bar\", bar)",
    ],
  },
  {
    library: PYTHON_INJECT,
    patternKey: "call:attr:*",
    matches: [
      "import inject\n\nclass User:\n    cache = inject.attr(Cache)",
    ],
    rejects: [
      "inject = LocalRegistry()\n\nclass User:\n    cache = inject.attr(Cache)",
    ],
  },
  {
    library: PYTHON_INJECT,
    patternKey: "decorator:params:*",
    matches: [
      "import inject\n\n@inject.params(cache=Cache, user=CurrentUser)\ndef baz(foo, cache=None, user=None):\n    cache.save(\"foo\", foo, user)",
    ],
    rejects: [
      "inject = LocalRegistry()\n\n@inject.params(cache=Cache, user=CurrentUser)\ndef baz(foo, cache=None, user=None):\n    cache.save(\"foo\", foo, user)",
    ],
  },
  {
    library: PYTHON_INJECT,
    patternKey: "decorator:autoparams:*",
    matches: [
      "import inject\n\n@inject.autoparams()\ndef refresh_cache(cache: RedisCache, db: DbInterface):\n    pass",
    ],
    rejects: [
      "inject = LocalRegistry()\n\n@inject.autoparams()\ndef refresh_cache(cache: RedisCache, db: DbInterface):\n    pass",
    ],
  },
]

const DISHKA = "Dishka"

export const dishkaFixtures: readonly PatternFixture[] = [
  {
    library: DISHKA,
    patternKey: "factory:make_container:*",
    matches: [
      "from dishka import make_container\n\ncontainer = make_container(service_provider, ConnectionProvider())",
    ],
    rejects: [
      "def make_container(*providers):\n    return LocalRegistry()\n\ncontainer = make_container(service_provider, ConnectionProvider())",
    ],
  },
  {
    library: DISHKA,
    patternKey: "factory:make_container:*>call:get:*",
    matches: [
      "from dishka import make_container\n\ncontainer = make_container(service_provider, ConnectionProvider())\nclient = container.get(APIClient)",
    ],
    rejects: [
      "container = LocalRegistry()\nclient = container.get(APIClient)",
    ],
  },
  {
    library: DISHKA,
    patternKey: "factory:make_async_container:*",
    matches: [
      "from dishka import make_async_container\n\ncontainer = make_async_container(service_provider, ConnectionProvider())",
    ],
    rejects: [
      "def make_async_container(*providers):\n    return LocalRegistry()\n\ncontainer = make_async_container(service_provider, ConnectionProvider())",
    ],
  },
  {
    library: DISHKA,
    patternKey: "factory:make_async_container:*>call:get:*",
    matches: [
      "from dishka import make_async_container\n\ncontainer = make_async_container(service_provider)\nclient = await container.get(APIClient)",
    ],
    rejects: [
      "container = LocalRegistry()\nclient = await container.get(APIClient)",
    ],
  },
  {
    library: DISHKA,
    patternKey: "class:Provider:*",
    matches: [
      "from dishka import Provider\n\nclass ConnectionProvider(Provider):\n    pass",
    ],
    rejects: [
      "class Provider:\n    pass\n\nclass ConnectionProvider(Provider):\n    pass",
    ],
  },
  {
    library: DISHKA,
    patternKey: "factory:Provider:*",
    matches: [
      "from dishka import Provider, Scope\n\nservice_provider = Provider(scope=Scope.REQUEST)",
    ],
    rejects: [
      "def Provider(scope):\n    return LocalRegistry()\n\nservice_provider = Provider(scope=Scope.REQUEST)",
    ],
  },
  {
    library: DISHKA,
    patternKey: "decorator:provide:*",
    matches: [
      "from dishka import Provider, Scope, provide\n\nclass ConnectionProvider(Provider):\n    @provide(scope=Scope.REQUEST)\n    def new_connection(self) -> Connection:\n        return connect()",
    ],
    rejects: [
      "def provide(scope):\n    return lambda function: function\n\nclass ConnectionProvider:\n    @provide(scope=Scope.REQUEST)\n    def new_connection(self) -> Connection:\n        return connect()",
    ],
  },
  {
    library: DISHKA,
    patternKey: "decorator:inject:*",
    matches: [
      "from dishka.integrations.fastapi import FromDishka, inject\n\n@router.get(\"/\")\n@inject\nasync def index(service: FromDishka[Service]) -> str:\n    return service.name",
    ],
    rejects: [
      "def inject(function):\n    return function\n\n@router.get(\"/\")\n@inject\nasync def index(service: FromDishka[Service]) -> str:\n    return service.name",
    ],
  },
  {
    library: DISHKA,
    patternKey: "call:setup_dishka:*",
    matches: [
      "from dishka.integrations.fastapi import setup_dishka\n\nsetup_dishka(container, app)",
    ],
    rejects: [
      "def setup_dishka(container, app):\n    return None\n\nsetup_dishka(container, app)",
    ],
  },
]
