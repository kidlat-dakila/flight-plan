import type { PatternFixture } from "@/catalogue/types"

const NEST = "Nest"

const COMMON = "@nestjs/common"

const APP_KEY = "factory:NestFactory.create:*"

const APPLY_KEY = "factory:MiddlewareConsumer:*>factory:apply:*"

const EXCLUDE_KEY = `${APPLY_KEY}>factory:exclude:*`

const NEST_APP = "import { NestFactory } from \"@nestjs/core\"\nconst app = await NestFactory.create(AppModule)"

const LOCAL_APP = "const app = makeLocalRegistry()"

const importing = (name: string, specifier: string, code: string): string => `import { ${name} } from "${specifier}"\n${code}`

const declaringLocally = (name: string, code: string): string => `const ${name} = (...parts) => parts\n${code}`

const decoratorFixture = (name: string, specifier: string, code: string, patternKey = `decorator:${name}:*`): PatternFixture => ({
  library: NEST,
  patternKey,
  matches: [importing(name, specifier, code)],
  rejects: [declaringLocally(name, code)],
})

const methodDecorated = (decorator: string): string => `export class CatsController {\n  ${decorator}\n  handle() {}\n}`

const classDecorated = (decorator: string): string => `${decorator}\nexport class CatsController {}`

const routeFixture = (name: string): PatternFixture => decoratorFixture(name, COMMON, `@Controller("cats")\n${methodDecorated(`@${name}(":id")`)}`)

const appMethodFixture = (name: string, call: string): PatternFixture => ({
  library: NEST,
  patternKey: `${APP_KEY}>call:${name}:*`,
  matches: [`${NEST_APP}\n${call}`],
  rejects: [`${LOCAL_APP}\n${call}`],
})

const configuring = (chain: string): string =>
  `import { MiddlewareConsumer } from "${COMMON}"\nexport class AppModule {\n  configure(consumer: MiddlewareConsumer) {\n    consumer${chain}\n  }\n}`

const configuringUntyped = (chain: string): string => `export class AppModule {\n  configure(consumer) {\n    consumer${chain}\n  }\n}`

const consumerFixture = (patternKey: string, chain: string): PatternFixture => ({
  library: NEST,
  patternKey,
  matches: [configuring(chain)],
  rejects: [configuringUntyped(chain)],
})

export const nestFixtures: readonly PatternFixture[] = [
  decoratorFixture("Controller", COMMON, classDecorated("@Controller(\"cats\")")),
  ...["Get", "Post", "Put", "Patch", "Delete", "Head", "Options", "Search", "All", "Sse"].map(routeFixture),
  ...["UseGuards", "UseInterceptors", "UsePipes", "UseFilters"].map((name) => decoratorFixture(name, COMMON, classDecorated(`@${name}(RolesGuard)`))),
  decoratorFixture("Version", COMMON, methodDecorated("@Version(\"2\")")),
  decoratorFixture("Module", COMMON, classDecorated("@Module({ controllers: [CatsController] })")),
  decoratorFixture("MessagePattern", "@nestjs/microservices", methodDecorated("@MessagePattern({ cmd: \"sum\" })")),
  decoratorFixture("EventPattern", "@nestjs/microservices", methodDecorated("@EventPattern(\"user_created\")")),
  decoratorFixture("Cron", "@nestjs/schedule", methodDecorated("@Cron(\"45 * * * * *\")")),
  decoratorFixture("Interval", "@nestjs/schedule", methodDecorated("@Interval(10000)")),
  decoratorFixture("Timeout", "@nestjs/schedule", methodDecorated("@Timeout(5000)")),
  decoratorFixture("SubscribeMessage", "@nestjs/websockets", methodDecorated("@SubscribeMessage(\"events\")")),
  decoratorFixture("OnEvent", "@nestjs/event-emitter", methodDecorated("@OnEvent(\"order.created\")")),
  decoratorFixture("Catch", COMMON, classDecorated("@Catch(HttpException)")),
  ...["Query", "Mutation", "Subscription", "ResolveField"].map((name) => decoratorFixture(name, "@nestjs/graphql", methodDecorated(`@${name}()`), `decorator:${name}@@nestjs/graphql:*`)),
  {
    library: NEST,
    patternKey: "call:RouterModule.register:*",
    matches: [importing("RouterModule", "@nestjs/core", "RouterModule.register([{ path: \"admin\", module: AdminModule }])")],
    rejects: ["const RouterModule = makeLocalRegistry()\nRouterModule.register([{ path: \"admin\", module: AdminModule }])"],
  },
  consumerFixture(APPLY_KEY, ".apply(LoggerMiddleware)"),
  consumerFixture(`${APPLY_KEY}>call:forRoutes:*`, ".apply(LoggerMiddleware).forRoutes(\"cats\")"),
  consumerFixture(EXCLUDE_KEY, ".apply(LoggerMiddleware).exclude(\"health\")"),
  consumerFixture(`${EXCLUDE_KEY}>call:forRoutes:*`, ".apply(LoggerMiddleware).exclude(\"health\").forRoutes(\"cats\")"),
  { library: NEST, patternKey: APP_KEY, matches: [NEST_APP], rejects: ["const NestFactory = makeLocalRegistry()\nconst app = await NestFactory.create(AppModule)"] },
  appMethodFixture("setGlobalPrefix", "app.setGlobalPrefix(\"api\")"),
  appMethodFixture("enableVersioning", "app.enableVersioning({ type: VersioningType.URI })"),
  appMethodFixture("useGlobalGuards", "app.useGlobalGuards(new RolesGuard())"),
  appMethodFixture("useGlobalInterceptors", "app.useGlobalInterceptors(new LoggingInterceptor())"),
  appMethodFixture("useGlobalPipes", "app.useGlobalPipes(new ValidationPipe())"),
  appMethodFixture("useGlobalFilters", "app.useGlobalFilters(new HttpExceptionFilter())"),
  appMethodFixture("use", "app.use(logger)"),
  appMethodFixture("listen", "await app.listen(3000)"),
]
