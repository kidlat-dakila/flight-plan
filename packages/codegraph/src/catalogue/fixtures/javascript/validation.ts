import type { PatternFixture } from "@/catalogue/types"

const AJV = "Ajv"

export const ajvFixtures: readonly PatternFixture[] = [
  {
    library: AJV,
    patternKey: "factory:default:*",
    matches: [
      "import Ajv from \"ajv\"\nconst ajv = new Ajv()",
    ],
    rejects: [
      "const Ajv = (...parts) => parts\nconst ajv = new Ajv()",
    ],
  },
  {
    library: AJV,
    patternKey: "factory:default:*>factory:compile:*",
    matches: [
      "import Ajv from \"ajv\"\nconst ajv = new Ajv()\nconst validateFoo = ajv.compile(schema)",
    ],
    rejects: [
      "const ajv = makeLocalRegistry()\nconst validateFoo = ajv.compile(schema)",
    ],
  },
  {
    library: AJV,
    patternKey: "factory:default:*>factory:compile:*>called",
    matches: [
      "import Ajv from \"ajv\"\nconst ajv = new Ajv()\nconst validateFoo = ajv.compile(schema)\nconst valid = validateFoo(data)",
    ],
    rejects: [
      "const validateFoo = makeLocalRegistry()\nconst valid = validateFoo(data)",
    ],
  },
  {
    library: AJV,
    patternKey: "factory:default:*>call:validate:*",
    matches: [
      "import Ajv from \"ajv\"\nconst ajv = new Ajv()\nconst valid = ajv.validate(schema, data)",
    ],
    rejects: [
      "const ajv = makeLocalRegistry()\nconst valid = ajv.validate(schema, data)",
    ],
  },
  {
    library: AJV,
    patternKey: "factory:default:*>call:addSchema:*",
    matches: [
      "import Ajv from \"ajv\"\nconst ajv = new Ajv()\najv.addSchema(schema, \"user\")",
    ],
    rejects: [
      "const ajv = makeLocalRegistry()\najv.addSchema(schema, \"user\")",
    ],
  },
]

const ARKTYPE = "ArkType"

export const arktypeFixtures: readonly PatternFixture[] = [
  {
    library: ARKTYPE,
    patternKey: "factory:type:*",
    matches: [
      "import { type } from \"arktype\"\nconst User = type({ name: \"string\", \"age?\": \"number\" })",
    ],
    rejects: [
      "const type = (...parts) => parts\nconst User = type({ name: \"string\", \"age?\": \"number\" })",
    ],
  },
  {
    library: ARKTYPE,
    patternKey: "factory:type:*>call:narrow:*",
    matches: [
      "import { type } from \"arktype\"\nconst User = type({ name: \"string\", \"age?\": \"number\" })\nconst Even = User.narrow((data, ctx) => data.age % 2 === 0 || ctx.mustBe(\"even\"))",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst Even = User.narrow((data, ctx) => data.age % 2 === 0 || ctx.mustBe(\"even\"))",
    ],
  },
  {
    library: ARKTYPE,
    patternKey: "factory:type:*>call:pipe:*",
    matches: [
      "import { type } from \"arktype\"\nconst User = type({ name: \"string\", \"age?\": \"number\" })\nconst Parsed = User.pipe((data) => normalize(data))",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst Parsed = User.pipe((data) => normalize(data))",
    ],
  },
  {
    library: ARKTYPE,
    patternKey: "factory:type:*>called",
    matches: [
      "import { type } from \"arktype\"\nconst User = type({ name: \"string\", \"age?\": \"number\" })\nconst out = User(data)",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst out = User(data)",
    ],
  },
]

const EXPRESS_ZOD_API = "Express Zod API"

export const expressZodApiFixtures: readonly PatternFixture[] = [
  {
    library: EXPRESS_ZOD_API,
    patternKey: "call:defaultEndpointsFactory.build:*",
    matches: [
      "import { defaultEndpointsFactory } from \"express-zod-api\"\nconst helloWorldEndpoint = defaultEndpointsFactory.build({ method: \"get\", input: z.object({ name: z.string().optional() }), output: z.object({ greetings: z.string() }), handler: async ({ input }) => ({ greetings: greet(input.name) }) })",
    ],
    rejects: [
      "const defaultEndpointsFactory = makeLocalRegistry()\nconst helloWorldEndpoint = defaultEndpointsFactory.build({ method: \"get\", input: z.object({ name: z.string().optional() }), output: z.object({ greetings: z.string() }), handler: async ({ input }) => ({ greetings: greet(input.name) }) })",
    ],
  },
  {
    library: EXPRESS_ZOD_API,
    patternKey: "call:defaultEndpointsFactory.addMiddleware:*",
    matches: [
      "import { defaultEndpointsFactory } from \"express-zod-api\"\nconst authorizedFactory = defaultEndpointsFactory.addMiddleware(authMiddleware)",
    ],
    rejects: [
      "const defaultEndpointsFactory = makeLocalRegistry()\nconst authorizedFactory = defaultEndpointsFactory.addMiddleware(authMiddleware)",
    ],
  },
  {
    library: EXPRESS_ZOD_API,
    patternKey: "factory:Middleware:*",
    matches: [
      "import { Middleware } from \"express-zod-api\"\nconst authMiddleware = new Middleware({ input: z.object({ key: z.string() }), handler: async ({ input }) => findUser(input.key) })",
    ],
    rejects: [
      "const Middleware = (...parts) => parts\nconst authMiddleware = new Middleware({ input: z.object({ key: z.string() }), handler: async ({ input }) => findUser(input.key) })",
    ],
  },
  {
    library: EXPRESS_ZOD_API,
    patternKey: "call:createConfig:*",
    matches: [
      "import { createConfig } from \"express-zod-api\"\nconst config = createConfig({ http: { listen: 8090 }, cors: true })",
    ],
    rejects: [
      "const createConfig = (...parts) => parts\nconst config = createConfig({ http: { listen: 8090 }, cors: true })",
    ],
  },
]

const SURY = "Sury"

export const suryFixtures: readonly PatternFixture[] = [
  {
    library: SURY,
    patternKey: "call:schema:*",
    matches: [
      "import * as S from \"sury\"\nconst result = S.schema({ id: S.string })",
    ],
    rejects: [
      "const S = makeLocalRegistry()\nconst result = S.schema({ id: S.string })",
    ],
  },
  {
    library: SURY,
    patternKey: "call:parseOrThrow:*",
    matches: [
      "import * as S from \"sury\"\nconst result = S.parseOrThrow(data, userSchema)",
    ],
    rejects: [
      "const S = makeLocalRegistry()\nconst result = S.parseOrThrow(data, userSchema)",
    ],
  },
  {
    library: SURY,
    patternKey: "call:object:*",
    matches: [
      "import * as S from \"sury\"\nconst result = S.object((s) => ({ id: s.field(\"id\", S.string) }))",
    ],
    rejects: [
      "const S = makeLocalRegistry()\nconst result = S.object((s) => ({ id: s.field(\"id\", S.string) }))",
    ],
  },
]

const TYPEBOX = "TypeBox"

export const typeboxFixtures: readonly PatternFixture[] = [
  {
    library: TYPEBOX,
    patternKey: "call:Type.Object:*",
    matches: [
      "import { Type } from \"@sinclair/typebox\"\nconst T = Type.Object({ x: Type.Number(), y: Type.Number() })",
    ],
    rejects: [
      "const Type = makeLocalRegistry()\nconst T = Type.Object({ x: Type.Number(), y: Type.Number() })",
    ],
  },
  {
    library: TYPEBOX,
    patternKey: "call:Value.Parse:*",
    matches: [
      "import { Value } from \"typebox/value\"\nconst R = Value.Parse(T, { x: 1, y: 2 })",
    ],
    rejects: [
      "const Value = makeLocalRegistry()\nconst R = Value.Parse(T, { x: 1, y: 2 })",
    ],
  },
  {
    library: TYPEBOX,
    patternKey: "factory:Compile:*",
    matches: [
      "import { Compile } from \"typebox/compile\"\nconst C = Compile(T)",
    ],
    rejects: [
      "const Compile = (...parts) => parts\nconst C = Compile(T)",
    ],
  },
  {
    library: TYPEBOX,
    patternKey: "factory:Compile:*>call:Parse:*",
    matches: [
      "import { Compile } from \"typebox/compile\"\nconst C = Compile(T)\nconst R = C.Parse({ x: 1, y: 2 })",
    ],
    rejects: [
      "const C = makeLocalRegistry()\nconst R = C.Parse({ x: 1, y: 2 })",
    ],
  },
]

const TYPIA = "Typia"

export const typiaFixtures: readonly PatternFixture[] = [
  {
    library: TYPIA,
    patternKey: "call:default.assert:*",
    matches: [
      "import typia from \"typia\"\nconst result = typia.assert(input)",
    ],
    rejects: [
      "const typia = makeLocalRegistry()\nconst result = typia.assert(input)",
    ],
  },
  {
    library: TYPIA,
    patternKey: "call:default.validate:*",
    matches: [
      "import typia from \"typia\"\nconst result = typia.validate(input)",
    ],
    rejects: [
      "const typia = makeLocalRegistry()\nconst result = typia.validate(input)",
    ],
  },
  {
    library: TYPIA,
    patternKey: "call:default.createIs:*",
    matches: [
      "import typia from \"typia\"\nconst result = typia.createIs(input)",
    ],
    rejects: [
      "const typia = makeLocalRegistry()\nconst result = typia.createIs(input)",
    ],
  },
]

const VALIBOT = "Valibot"

export const valibotFixtures: readonly PatternFixture[] = [
  {
    library: VALIBOT,
    patternKey: "call:object:*",
    matches: [
      "import * as v from \"valibot\"\nconst result = v.object({ email: v.string() })",
    ],
    rejects: [
      "const v = makeLocalRegistry()\nconst result = v.object({ email: v.string() })",
    ],
  },
  {
    library: VALIBOT,
    patternKey: "call:pipe:*",
    matches: [
      "import * as v from \"valibot\"\nconst result = v.pipe(v.string(), v.email())",
    ],
    rejects: [
      "const v = makeLocalRegistry()\nconst result = v.pipe(v.string(), v.email())",
    ],
  },
  {
    library: VALIBOT,
    patternKey: "call:parse:*",
    matches: [
      "import * as v from \"valibot\"\nconst result = v.parse(LoginSchema, data)",
    ],
    rejects: [
      "const v = makeLocalRegistry()\nconst result = v.parse(LoginSchema, data)",
    ],
  },
  {
    library: VALIBOT,
    patternKey: "call:safeParse:*",
    matches: [
      "import * as v from \"valibot\"\nconst result = v.safeParse(LoginSchema, data)",
    ],
    rejects: [
      "const v = makeLocalRegistry()\nconst result = v.safeParse(LoginSchema, data)",
    ],
  },
]

const VALIDATOR = "Validator"

export const validatorFixtures: readonly PatternFixture[] = [
  {
    library: VALIDATOR,
    patternKey: "call:default.isEmail:*",
    matches: [
      "import validator from \"validator\"\nconst ok = validator.isEmail(input)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst ok = validator.isEmail(input)",
    ],
  },
  {
    library: VALIDATOR,
    patternKey: "call:default.isURL:*",
    matches: [
      "import validator from \"validator\"\nconst ok = validator.isURL(input)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst ok = validator.isURL(input)",
    ],
  },
  {
    library: VALIDATOR,
    patternKey: "call:default.isLength:*",
    matches: [
      "import validator from \"validator\"\nconst ok = validator.isLength(input)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst ok = validator.isLength(input)",
    ],
  },
  {
    library: VALIDATOR,
    patternKey: "call:default.escape:*",
    matches: [
      "import validator from \"validator\"\nconst ok = validator.escape(input)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst ok = validator.escape(input)",
    ],
  },
  {
    library: VALIDATOR,
    patternKey: "call:default.normalizeEmail:*",
    matches: [
      "import validator from \"validator\"\nconst ok = validator.normalizeEmail(input)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst ok = validator.normalizeEmail(input)",
    ],
  },
]

const VINEJS = "VineJS"

export const vinejsFixtures: readonly PatternFixture[] = [
  {
    library: VINEJS,
    patternKey: "call:default.object:*",
    matches: [
      "import vine from \"@vinejs/vine\"\nconst schema = vine.object({ username: vine.string() })",
    ],
    rejects: [
      "const vine = makeLocalRegistry()\nconst schema = vine.object({ username: vine.string() })",
    ],
  },
  {
    library: VINEJS,
    patternKey: "factory:default.compile:*",
    matches: [
      "import vine from \"@vinejs/vine\"\nconst validator = vine.compile(schema)",
    ],
    rejects: [
      "const vine = makeLocalRegistry()\nconst validator = vine.compile(schema)",
    ],
  },
  {
    library: VINEJS,
    patternKey: "factory:default.compile:*>call:validate:*",
    matches: [
      "import vine from \"@vinejs/vine\"\nconst validator = vine.compile(schema)\nconst output = await validator.validate(data)",
    ],
    rejects: [
      "const validator = makeLocalRegistry()\nconst output = await validator.validate(data)",
    ],
  },
]

const ZOD = "Zod"

export const zodFixtures: readonly PatternFixture[] = [
  {
    library: ZOD,
    patternKey: "factory:z.object:*",
    matches: [
      "import { z } from \"zod\"\nconst User = z.object({ name: z.string() })",
    ],
    rejects: [
      "const z = makeLocalRegistry()\nconst User = z.object({ name: z.string() })",
    ],
  },
  {
    library: ZOD,
    patternKey: "factory:z.object:*>call:parse:*",
    matches: [
      "import { z } from \"zod\"\nconst User = z.object({ name: z.string() })\nconst user = User.parse(input)",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst user = User.parse(input)",
    ],
  },
  {
    library: ZOD,
    patternKey: "factory:z.object:*>call:safeParse:*",
    matches: [
      "import { z } from \"zod\"\nconst User = z.object({ name: z.string() })\nconst result = User.safeParse(input)",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst result = User.safeParse(input)",
    ],
  },
  {
    library: ZOD,
    patternKey: "factory:z.string:*",
    matches: [
      "import { z } from \"zod\"\nconst mySchema = z.string()",
    ],
    rejects: [
      "const z = makeLocalRegistry()\nconst mySchema = z.string()",
    ],
  },
  {
    library: ZOD,
    patternKey: "factory:z.string:*>call:parse:*",
    matches: [
      "import { z } from \"zod\"\nconst mySchema = z.string()\nconst result = mySchema.parse(\"tuna\")",
    ],
    rejects: [
      "const mySchema = makeLocalRegistry()\nconst result = mySchema.parse(\"tuna\")",
    ],
  },
  {
    library: ZOD,
    patternKey: "factory:z.string:*>call:safeParse:*",
    matches: [
      "import { z } from \"zod\"\nconst mySchema = z.string()\nconst result = mySchema.safeParse(\"tuna\")",
    ],
    rejects: [
      "const mySchema = makeLocalRegistry()\nconst result = mySchema.safeParse(\"tuna\")",
    ],
  },
]
