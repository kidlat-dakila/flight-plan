import type { PatternFixture } from "@/catalogue/types"

const BOOKSHELF = "Bookshelf"

export const bookshelfFixtures: readonly PatternFixture[] = [
  {
    library: BOOKSHELF,
    patternKey: "factory:default:*",
    matches: [
      "import makeBookshelf from \"bookshelf\"\nconst bookshelf = makeBookshelf(knex)",
    ],
    rejects: [
      "const makeBookshelf = (...parts) => parts\nconst bookshelf = makeBookshelf(knex)",
    ],
  },
  {
    library: BOOKSHELF,
    patternKey: "factory:default:*>factory:model:*",
    matches: [
      "import makeBookshelf from \"bookshelf\"\nconst bookshelf = makeBookshelf(knex)\nconst User = bookshelf.model(\"User\", { tableName: \"users\" })",
    ],
    rejects: [
      "const bookshelf = makeLocalRegistry()\nconst User = bookshelf.model(\"User\", { tableName: \"users\" })",
    ],
  },
  {
    library: BOOKSHELF,
    patternKey: "factory:default:*>factory:model:*>call:where:*",
    matches: [
      "import makeBookshelf from \"bookshelf\"\nconst bookshelf = makeBookshelf(knex)\nconst User = bookshelf.model(\"User\", { tableName: \"users\" })\nconst user = await User.where(\"id\", 1).fetch()",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst user = await User.where(\"id\", 1).fetch()",
    ],
  },
  {
    library: BOOKSHELF,
    patternKey: "factory:default:*>factory:model:*>call:fetchAll:*",
    matches: [
      "import makeBookshelf from \"bookshelf\"\nconst bookshelf = makeBookshelf(knex)\nconst User = bookshelf.model(\"User\", { tableName: \"users\" })\nconst users = await User.fetchAll()",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nconst users = await User.fetchAll()",
    ],
  },
  {
    library: BOOKSHELF,
    patternKey: "factory:default:*>call:transaction:*",
    matches: [
      "import makeBookshelf from \"bookshelf\"\nconst bookshelf = makeBookshelf(knex)\nawait bookshelf.transaction(async (t) => { await new User({ name: \"Ada\" }).save(null, { transacting: t }) })",
    ],
    rejects: [
      "const bookshelf = makeLocalRegistry()\nawait bookshelf.transaction(async (t) => { await new User({ name: \"Ada\" }).save(null, { transacting: t }) })",
    ],
  },
]

const DRIZZLE_ORM = "Drizzle ORM"

export const drizzleOrmFixtures: readonly PatternFixture[] = [
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)",
    ],
    rejects: [
      "const drizzle = (...parts) => parts\nconst db = drizzle(process.env.DATABASE_URL)",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*>call:insert:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)\nawait db.insert(users)",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.insert(users)",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*>call:update:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)\nawait db.update(users)",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.update(users)",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*>call:delete:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)\nawait db.delete(users)",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.delete(users)",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*>call:select:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)\nconst rows = await db.select().from(users)",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst rows = await db.select().from(users)",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*>call:findMany:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)\nconst rows = await db.query.users.findMany({ with: { posts: true } })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst rows = await db.query.users.findMany({ with: { posts: true } })",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "factory:drizzle:*>call:transaction:*",
    matches: [
      "import { drizzle } from \"drizzle-orm/node-postgres\"\nconst db = drizzle(process.env.DATABASE_URL)\nawait db.transaction(async (tx) => { await tx.update(users).set({ name: \"Ada\" }) })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.transaction(async (tx) => { await tx.update(users).set({ name: \"Ada\" }) })",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "call:pgTable:*",
    matches: [
      "import { integer, pgTable } from \"drizzle-orm/pg-core\"\nexport const users = pgTable(\"users\", { id: integer() })",
    ],
    rejects: [
      "const pgTable = (...parts) => parts\nexport const users = pgTable(\"users\", { id: integer() })",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "call:mysqlTable:*",
    matches: [
      "import { integer, mysqlTable } from \"drizzle-orm/mysql-core\"\nexport const users = mysqlTable(\"users\", { id: integer() })",
    ],
    rejects: [
      "const mysqlTable = (...parts) => parts\nexport const users = mysqlTable(\"users\", { id: integer() })",
    ],
  },
  {
    library: DRIZZLE_ORM,
    patternKey: "call:sqliteTable:*",
    matches: [
      "import { integer, sqliteTable } from \"drizzle-orm/sqlite-core\"\nexport const users = sqliteTable(\"users\", { id: integer() })",
    ],
    rejects: [
      "const sqliteTable = (...parts) => parts\nexport const users = sqliteTable(\"users\", { id: integer() })",
    ],
  },
]

const MIKROORM = "MikroORM"

export const mikroormFixtures: readonly PatternFixture[] = [
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)",
    ],
    rejects: [
      "const MikroORM = makeLocalRegistry()\nconst orm = await MikroORM.init(config)",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*>call:find:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)\norm.em.find(User, { email: \"foo@bar.com\" })",
    ],
    rejects: [
      "const orm = makeLocalRegistry()\norm.em.find(User, { email: \"foo@bar.com\" })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*>call:findOne:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)\norm.em.findOne(User, { email: \"foo@bar.com\" })",
    ],
    rejects: [
      "const orm = makeLocalRegistry()\norm.em.findOne(User, { email: \"foo@bar.com\" })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*>call:persist:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)\norm.em.persist(User, { email: \"foo@bar.com\" })",
    ],
    rejects: [
      "const orm = makeLocalRegistry()\norm.em.persist(User, { email: \"foo@bar.com\" })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*>call:flush:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)\norm.em.flush(User, { email: \"foo@bar.com\" })",
    ],
    rejects: [
      "const orm = makeLocalRegistry()\norm.em.flush(User, { email: \"foo@bar.com\" })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*>call:create:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)\norm.em.create(User, { email: \"foo@bar.com\" })",
    ],
    rejects: [
      "const orm = makeLocalRegistry()\norm.em.create(User, { email: \"foo@bar.com\" })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:MikroORM.init:*>call:fork:*",
    matches: [
      "import { MikroORM } from \"@mikro-orm/core\"\nconst orm = await MikroORM.init(config)\nconst em = orm.em.fork()",
    ],
    rejects: [
      "const orm = makeLocalRegistry()\nconst em = orm.em.fork()",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "decorator:Entity:*",
    matches: [
      "import { Entity, PrimaryKey } from \"@mikro-orm/decorators/legacy\"\n@Entity()\nexport class User {\n  @PrimaryKey()\n  id!: number\n}",
    ],
    rejects: [
      "const Entity = (...parts) => parts\n@Entity()\nexport class User {\n  id!: number\n}",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "call:defineEntity:*",
    matches: [
      "import { defineEntity, p } from \"@mikro-orm/core\"\nexport const Book = defineEntity({ name: \"Book\", properties: { id: p.bigint().primary(), title: p.string() } })",
    ],
    rejects: [
      "const defineEntity = (...parts) => parts\nexport const Book = defineEntity({ name: \"Book\", properties: { id: p.bigint().primary(), title: p.string() } })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:find:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.find(User, {})",
    ],
    rejects: [
      "export const run = (em) => em.find(User, {})",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:findOne:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.findOne(User, { id: 1 })",
    ],
    rejects: [
      "export const run = (em) => em.findOne(User, { id: 1 })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:findOneOrFail:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.findOneOrFail(User, { id: 1 })",
    ],
    rejects: [
      "export const run = (em) => em.findOneOrFail(User, { id: 1 })",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:count:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.count(User)",
    ],
    rejects: [
      "export const run = (em) => em.count(User)",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:persist:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.persist(user)",
    ],
    rejects: [
      "export const run = (em) => em.persist(user)",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:flush:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.flush()",
    ],
    rejects: [
      "export const run = (em) => em.flush()",
    ],
  },
  {
    library: MIKROORM,
    patternKey: "factory:EntityManager:*>call:remove:*",
    matches: [
      "import { EntityManager } from \"@mikro-orm/postgresql\"\nexport const run = (em: EntityManager) => em.remove(user)",
    ],
    rejects: [
      "export const run = (em) => em.remove(user)",
    ],
  },
]

const MONGOOSE = "Mongoose"

export const mongooseFixtures: readonly PatternFixture[] = [
  {
    library: MONGOOSE,
    patternKey: "factory:model:*",
    matches: [
      "import mongoose from \"mongoose\"\nconst User = mongoose.model(\"User\", userSchema)",
    ],
    rejects: [
      "const mongoose = makeLocalRegistry()\nconst User = mongoose.model(\"User\", userSchema)",
    ],
  },
  {
    library: MONGOOSE,
    patternKey: "factory:model:*>call:findOne:*",
    matches: [
      "import mongoose from \"mongoose\"\nconst User = mongoose.model(\"User\", userSchema)\nUser.findOne({ name: \"Ada\" })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.findOne({ name: \"Ada\" })",
    ],
  },
  {
    library: MONGOOSE,
    patternKey: "factory:model:*>call:find:*",
    matches: [
      "import mongoose from \"mongoose\"\nconst User = mongoose.model(\"User\", userSchema)\nUser.find({ name: \"Ada\" })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.find({ name: \"Ada\" })",
    ],
  },
  {
    library: MONGOOSE,
    patternKey: "factory:model:*>call:create:*",
    matches: [
      "import mongoose from \"mongoose\"\nconst User = mongoose.model(\"User\", userSchema)\nUser.create({ name: \"Ada\" })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.create({ name: \"Ada\" })",
    ],
  },
  {
    library: MONGOOSE,
    patternKey: "factory:Schema:*",
    matches: [
      "import { Schema } from \"mongoose\"\nconst userSchema = new Schema({ name: String })",
    ],
    rejects: [
      "const Schema = (...parts) => parts\nconst userSchema = new Schema({ name: String })",
    ],
  },
  {
    library: MONGOOSE,
    patternKey: "factory:Schema:*>call:pre:*",
    matches: [
      "import { Schema } from \"mongoose\"\nconst userSchema = new Schema({ name: String })\nuserSchema.pre(\"save\", function (next) { this.updatedAt = new Date(); next() })",
    ],
    rejects: [
      "const userSchema = makeLocalRegistry()\nuserSchema.pre(\"save\", function (next) { this.updatedAt = new Date(); next() })",
    ],
  },
  {
    library: MONGOOSE,
    patternKey: "call:connect:*",
    matches: [
      "import mongoose from \"mongoose\"\nawait mongoose.connect(\"mongodb://127.0.0.1:27017/test\")",
    ],
    rejects: [
      "const mongoose = makeLocalRegistry()\nawait mongoose.connect(\"mongodb://127.0.0.1:27017/test\")",
    ],
  },
]

const OBJECTION_JS = "Objection.js"

export const objectionJsFixtures: readonly PatternFixture[] = [
  {
    library: OBJECTION_JS,
    patternKey: "class:Model:*",
    matches: [
      "import { Model } from \"objection\"\nclass Person extends Model {\n  static get tableName() { return \"persons\" }\n}",
    ],
    rejects: [
      "class Model {}\nclass Person extends Model {\n  static get tableName() { return \"persons\" }\n}",
    ],
  },
  {
    library: OBJECTION_JS,
    patternKey: "class:Model:*>call:query:*",
    matches: [
      "import { Model } from \"objection\"\nclass Person extends Model {\n  static get tableName() { return \"persons\" }\n}\nconst people = await Person.query().where(\"age\", \">\", 40)",
    ],
    rejects: [
      "const Person = makeLocalRegistry()\nconst people = await Person.query().where(\"age\", \">\", 40)",
    ],
  },
  {
    library: OBJECTION_JS,
    patternKey: "class:Model:*>call:relatedQuery:*",
    matches: [
      "import { Model } from \"objection\"\nclass Person extends Model {\n  static get tableName() { return \"persons\" }\n}\nconst pets = await Person.relatedQuery(\"pets\").for(1)",
    ],
    rejects: [
      "const Person = makeLocalRegistry()\nconst pets = await Person.relatedQuery(\"pets\").for(1)",
    ],
  },
]

const ORANGE_ORM = "Orange ORM"

export const orangeOrmFixtures: readonly PatternFixture[] = [
  {
    library: ORANGE_ORM,
    patternKey: "factory:default.map:*",
    matches: [
      "import orange from \"orange-orm\"\nconst db = orange.map((x) => ({ customer: x.table(\"customer\").map(({ column }) => ({ id: column(\"id\").numeric().primary() })) }))",
    ],
    rejects: [
      "const orange = makeLocalRegistry()\nconst db = orange.map((x) => ({ customer: x.table(\"customer\").map(({ column }) => ({ id: column(\"id\").numeric().primary() })) }))",
    ],
  },
  {
    library: ORANGE_ORM,
    patternKey: "factory:default.map:*>call:insert:*",
    matches: [
      "import orange from \"orange-orm\"\nconst db = orange.map((x) => ({ customer: x.table(\"customer\").map(({ column }) => ({ id: column(\"id\").numeric().primary() })) }))\ndb.customer.insert({ id: 1 })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.customer.insert({ id: 1 })",
    ],
  },
  {
    library: ORANGE_ORM,
    patternKey: "factory:default.map:*>call:getById:*",
    matches: [
      "import orange from \"orange-orm\"\nconst db = orange.map((x) => ({ customer: x.table(\"customer\").map(({ column }) => ({ id: column(\"id\").numeric().primary() })) }))\ndb.customer.getById({ id: 1 })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.customer.getById({ id: 1 })",
    ],
  },
  {
    library: ORANGE_ORM,
    patternKey: "factory:default.map:*>call:getMany:*",
    matches: [
      "import orange from \"orange-orm\"\nconst db = orange.map((x) => ({ customer: x.table(\"customer\").map(({ column }) => ({ id: column(\"id\").numeric().primary() })) }))\ndb.customer.getMany({ id: 1 })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.customer.getMany({ id: 1 })",
    ],
  },
  {
    library: ORANGE_ORM,
    patternKey: "factory:default.map:*>call:transaction:*",
    matches: [
      "import orange from \"orange-orm\"\nconst db = orange.map((x) => ({ customer: x.table(\"customer\").map(({ column }) => ({ id: column(\"id\").numeric().primary() })) }))\nawait db.transaction(async (tx) => { await tx.customer.insert({ name: \"Ada\" }) })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.transaction(async (tx) => { await tx.customer.insert({ name: \"Ada\" }) })",
    ],
  },
]

const PRISMA = "Prisma"

export const prismaFixtures: readonly PatternFixture[] = [
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()",
    ],
    rejects: [
      "const PrismaClient = (...parts) => parts\nconst prisma = new PrismaClient()",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:findMany:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.findMany({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.findMany({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:findUnique:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.findUnique({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.findUnique({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:findFirst:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.findFirst({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.findFirst({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:create:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.create({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.create({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:update:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.update({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.update({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:delete:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.delete({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.delete({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:upsert:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.upsert({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.upsert({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:createMany:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.createMany({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.createMany({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:updateMany:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.updateMany({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.updateMany({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:deleteMany:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.deleteMany({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.deleteMany({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:count:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst result = await prisma.user.count({ where: { id: 1 } })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst result = await prisma.user.count({ where: { id: 1 } })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:$transaction:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nawait prisma.$transaction(async (tx) => { await tx.user.create({ data }) })",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nawait prisma.$transaction(async (tx) => { await tx.user.create({ data }) })",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:$queryRaw:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nconst users = await prisma.$queryRaw`SELECT * FROM \"User\"`",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nconst users = await prisma.$queryRaw`SELECT * FROM \"User\"`",
    ],
  },
  {
    library: PRISMA,
    patternKey: "factory:PrismaClient:*>call:$executeRaw:*",
    matches: [
      "import { PrismaClient } from \"@prisma/client\"\nconst prisma = new PrismaClient()\nawait prisma.$executeRaw`UPDATE \"User\" SET active = true`",
    ],
    rejects: [
      "const prisma = makeLocalRegistry()\nawait prisma.$executeRaw`UPDATE \"User\" SET active = true`",
    ],
  },
]

const SEQUELIZE = "Sequelize"

export const sequelizeFixtures: readonly PatternFixture[] = [
  {
    library: SEQUELIZE,
    patternKey: "factory:Sequelize:*",
    matches: [
      "import { Sequelize } from \"sequelize\"\nconst sequelize = new Sequelize(\"sqlite::memory:\")",
    ],
    rejects: [
      "const Sequelize = (...parts) => parts\nconst sequelize = new Sequelize(\"sqlite::memory:\")",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "factory:Sequelize:*>factory:define:*",
    matches: [
      "import { Sequelize } from \"sequelize\"\nconst sequelize = new Sequelize(\"sqlite::memory:\")\nconst User = sequelize.define(\"User\", { username: DataTypes.STRING })",
    ],
    rejects: [
      "const sequelize = makeLocalRegistry()\nconst User = sequelize.define(\"User\", { username: DataTypes.STRING })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "factory:Sequelize:*>factory:define:*>call:create:*",
    matches: [
      "import { Sequelize } from \"sequelize\"\nconst sequelize = new Sequelize(\"sqlite::memory:\")\nconst User = sequelize.define(\"User\", { username: DataTypes.STRING })\nUser.create({ where: { username: \"ada\" } })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.create({ where: { username: \"ada\" } })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "factory:Sequelize:*>factory:define:*>call:findAll:*",
    matches: [
      "import { Sequelize } from \"sequelize\"\nconst sequelize = new Sequelize(\"sqlite::memory:\")\nconst User = sequelize.define(\"User\", { username: DataTypes.STRING })\nUser.findAll({ where: { username: \"ada\" } })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.findAll({ where: { username: \"ada\" } })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "factory:Sequelize:*>factory:define:*>call:findOne:*",
    matches: [
      "import { Sequelize } from \"sequelize\"\nconst sequelize = new Sequelize(\"sqlite::memory:\")\nconst User = sequelize.define(\"User\", { username: DataTypes.STRING })\nUser.findOne({ where: { username: \"ada\" } })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.findOne({ where: { username: \"ada\" } })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "class:Model:*",
    matches: [
      "import { Model } from \"sequelize\"\nclass User extends Model {}\nUser.init({ username: DataTypes.STRING }, { sequelize })",
    ],
    rejects: [
      "class Model {}\nclass User extends Model {}\nUser.init({ username: DataTypes.STRING }, { sequelize })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "class:Model:*>call:create:*",
    matches: [
      "import { Model } from \"sequelize\"\nclass User extends Model {}\nUser.init({ username: DataTypes.STRING }, { sequelize })\nUser.create({ where: { username: \"ada\" } })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.create({ where: { username: \"ada\" } })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "class:Model:*>call:findAll:*",
    matches: [
      "import { Model } from \"sequelize\"\nclass User extends Model {}\nUser.init({ username: DataTypes.STRING }, { sequelize })\nUser.findAll({ where: { username: \"ada\" } })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.findAll({ where: { username: \"ada\" } })",
    ],
  },
  {
    library: SEQUELIZE,
    patternKey: "class:Model:*>call:findOne:*",
    matches: [
      "import { Model } from \"sequelize\"\nclass User extends Model {}\nUser.init({ username: DataTypes.STRING }, { sequelize })\nUser.findOne({ where: { username: \"ada\" } })",
    ],
    rejects: [
      "const User = makeLocalRegistry()\nUser.findOne({ where: { username: \"ada\" } })",
    ],
  },
]

const TYPEGOOSE = "Typegoose"

export const typegooseFixtures: readonly PatternFixture[] = [
  {
    library: TYPEGOOSE,
    patternKey: "factory:getModelForClass:*",
    matches: [
      "import { getModelForClass } from \"@typegoose/typegoose\"\nconst KittenModel = getModelForClass(KittenClass)",
    ],
    rejects: [
      "const getModelForClass = (...parts) => parts\nconst KittenModel = getModelForClass(KittenClass)",
    ],
  },
  {
    library: TYPEGOOSE,
    patternKey: "factory:getModelForClass:*>call:create:*",
    matches: [
      "import { getModelForClass } from \"@typegoose/typegoose\"\nconst KittenModel = getModelForClass(KittenClass)\nKittenModel.create({ name: \"Kitty\" })",
    ],
    rejects: [
      "const KittenModel = makeLocalRegistry()\nKittenModel.create({ name: \"Kitty\" })",
    ],
  },
  {
    library: TYPEGOOSE,
    patternKey: "factory:getModelForClass:*>call:findById:*",
    matches: [
      "import { getModelForClass } from \"@typegoose/typegoose\"\nconst KittenModel = getModelForClass(KittenClass)\nKittenModel.findById({ name: \"Kitty\" })",
    ],
    rejects: [
      "const KittenModel = makeLocalRegistry()\nKittenModel.findById({ name: \"Kitty\" })",
    ],
  },
  {
    library: TYPEGOOSE,
    patternKey: "factory:getModelForClass:*>call:find:*",
    matches: [
      "import { getModelForClass } from \"@typegoose/typegoose\"\nconst KittenModel = getModelForClass(KittenClass)\nKittenModel.find({ name: \"Kitty\" })",
    ],
    rejects: [
      "const KittenModel = makeLocalRegistry()\nKittenModel.find({ name: \"Kitty\" })",
    ],
  },
  {
    library: TYPEGOOSE,
    patternKey: "decorator:prop:*",
    matches: [
      "import { prop } from \"@typegoose/typegoose\"\nclass Kitten {\n  @prop()\n  public name?: string\n}",
    ],
    rejects: [
      "const prop = (...parts) => parts\nclass Kitten {\n  @prop()\n  public name?: string\n}",
    ],
  },
  {
    library: TYPEGOOSE,
    patternKey: "decorator:pre:*",
    matches: [
      "import { pre } from \"@typegoose/typegoose\"\n@pre(\"save\", function () { this.updatedAt = new Date() })\nclass KittenClass {}",
    ],
    rejects: [
      "const pre = (...parts) => parts\n@pre(\"save\", function () { this.updatedAt = new Date() })\nclass KittenClass {}",
    ],
  },
  {
    library: TYPEGOOSE,
    patternKey: "decorator:post:*",
    matches: [
      "import { post } from \"@typegoose/typegoose\"\n@post(\"save\", (kitten) => { report(kitten) })\nclass KittenClass {}",
    ],
    rejects: [
      "const post = (...parts) => parts\n@post(\"save\", (kitten) => { report(kitten) })\nclass KittenClass {}",
    ],
  },
]

const TYPEORM = "TypeORM"

export const typeormFixtures: readonly PatternFixture[] = [
  {
    library: TYPEORM,
    patternKey: "decorator:Entity:*",
    matches: [
      "import { Entity } from \"typeorm\"\n@Entity()\nexport class User {}",
    ],
    rejects: [
      "const Entity = (...parts) => parts\n@Entity()\nexport class User {}",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })",
    ],
    rejects: [
      "const DataSource = (...parts) => parts\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)",
    ],
    rejects: [
      "const dataSource = makeLocalRegistry()\nconst userRepository = dataSource.getRepository(User)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:findOneBy:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.findOneBy({ id: 1 })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.findOneBy({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:findOne:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.findOne({ id: 1 })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.findOne({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:save:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.save({ id: 1 })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.save({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>call:transaction:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nawait dataSource.manager.transaction(async (manager) => { await manager.save(user) })",
    ],
    rejects: [
      "const dataSource = makeLocalRegistry()\nawait dataSource.manager.transaction(async (manager) => { await manager.save(user) })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:find:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.find({ where: { active: true } })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.find({ where: { active: true } })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:findBy:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.findBy({ active: true })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.findBy({ active: true })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:count:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.count()",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.count()",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:insert:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.insert(user)",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.insert(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:update:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.update({ id: 1 }, { active: false })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.update({ id: 1 }, { active: false })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:delete:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.delete({ id: 1 })",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.delete({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:DataSource:*>factory:getRepository:*>call:remove:*",
    matches: [
      "import { DataSource } from \"typeorm\"\nconst dataSource = new DataSource({ type: \"postgres\", entities: [User] })\nconst userRepository = dataSource.getRepository(User)\nuserRepository.remove(user)",
    ],
    rejects: [
      "const userRepository = makeLocalRegistry()\nuserRepository.remove(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:find:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.find({ where: { active: true } })",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.find({ where: { active: true } })\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.find({ where: { active: true } })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:findBy:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.findBy({ active: true })",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.findBy({ active: true })\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.findBy({ active: true })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:findOne:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.findOne({ where: { id: 1 } })",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.findOne({ where: { id: 1 } })\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.findOne({ where: { id: 1 } })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:findOneBy:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.findOneBy({ id: 1 })",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.findOneBy({ id: 1 })\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.findOneBy({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:count:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.count()",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.count()\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.count()",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:save:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.save(user)",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.save(user)\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.save(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:insert:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.insert(user)",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.insert(user)\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.insert(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:update:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.update({ id: 1 }, { active: false })",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.update({ id: 1 }, { active: false })\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.update({ id: 1 }, { active: false })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:delete:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.delete({ id: 1 })",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.delete({ id: 1 })\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.delete({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:Repository:*>call:remove:*",
    matches: [
      "import { Repository } from \"typeorm\"\nexport const run = (repository: Repository<User>) => repository.remove(user)",
      "import { Repository } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly repository: Repository<User>) {}\n  run() {\n    return this.repository.remove(user)\n  }\n}",
    ],
    rejects: [
      "export const run = (repository) => repository.remove(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:find:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.find(User, { where: { active: true } })",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.find(User, { where: { active: true } })\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.find(User, { where: { active: true } })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:findBy:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.findBy(User, { active: true })",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.findBy(User, { active: true })\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.findBy(User, { active: true })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:findOne:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.findOne(User, { where: { id: 1 } })",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.findOne(User, { where: { id: 1 } })\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.findOne(User, { where: { id: 1 } })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:findOneBy:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.findOneBy(User, { id: 1 })",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.findOneBy(User, { id: 1 })\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.findOneBy(User, { id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:count:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.count(User)",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.count(User)\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.count(User)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:save:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.save(user)",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.save(user)\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.save(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:insert:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.insert(user)",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.insert(user)\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.insert(user)",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:update:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.update({ id: 1 }, { active: false })",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.update({ id: 1 }, { active: false })\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.update({ id: 1 }, { active: false })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:delete:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.delete({ id: 1 })",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.delete({ id: 1 })\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.delete({ id: 1 })",
    ],
  },
  {
    library: TYPEORM,
    patternKey: "factory:EntityManager:*>call:remove:*",
    matches: [
      "import { EntityManager } from \"typeorm\"\nexport const run = (manager: EntityManager) => manager.remove(user)",
      "import { EntityManager } from \"typeorm\"\nexport class UsersService {\n  constructor(private readonly manager: EntityManager) {}\n  run() {\n    return this.manager.remove(user)\n  }\n}",
    ],
    rejects: [
      "export const run = (manager) => manager.remove(user)",
    ],
  },
]
