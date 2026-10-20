import type { CallPattern, CatalogueLibrary } from "@/catalogue/types"

const DATA_MODEL = "data-model"

export const bookshelfLibrary: CatalogueLibrary = {
  name: "Bookshelf",
  specifiers: ["bookshelf"],
  documentedVersion: "1.2",
  category: "orm",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        {
          kind: "factory",
          name: "model",
          makes: "data",
          classifies: DATA_MODEL,
          methods: [
            { kind: "call", name: "where", slots: [], makes: "data-fetch" },
            { kind: "call", name: "fetchAll", slots: [], makes: "data-fetch" },
          ],
        },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      ],
    },
  ],
}

export const drizzleOrmLibrary: CatalogueLibrary = {
  name: "Drizzle ORM",
  specifiers: [
    "drizzle-orm",
    "drizzle-orm/node-postgres",
    "drizzle-orm/postgres-js",
    "drizzle-orm/mysql2",
    "drizzle-orm/better-sqlite3",
    "drizzle-orm/libsql",
    "drizzle-orm/neon-http",
    "drizzle-orm/pg-core",
    "drizzle-orm/mysql-core",
    "drizzle-orm/sqlite-core",
  ],
  documentedVersion: "0.45",
  category: "orm",
  type: "backend",
  language: "javascript",
  locations: [
    { classification: "migration", files: [{ glob: "drizzle.config.*" }], keys: [{ key: "out", holds: "folders", default: ["drizzle"] }] },
    { classification: "data-model", files: [{ glob: "drizzle.config.*" }], keys: [{ key: "schema", holds: "paths" }] },
  ],
  patterns: [
    {
      kind: "factory",
      name: "drizzle",
      methods: [
        { kind: "call", name: "insert", slots: [], makes: "data" },
        { kind: "call", name: "update", slots: [], makes: "data" },
        { kind: "call", name: "delete", slots: [], makes: "data" },
        { kind: "call", name: "select", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findMany", slots: [], makes: "data-fetch" },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      ],
    },
    { kind: "call", name: "pgTable", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "mysqlTable", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "sqliteTable", slots: [], classifies: DATA_MODEL },
  ],
}

export const mikroormLibrary: CatalogueLibrary = {
  name: "MikroORM",
  specifiers: [
    "@mikro-orm/core",
    "@mikro-orm/decorators/legacy",
    "@mikro-orm/decorators/es",
    "@mikro-orm/postgresql",
    "@mikro-orm/mysql",
    "@mikro-orm/mariadb",
    "@mikro-orm/sqlite",
    "@mikro-orm/libsql",
    "@mikro-orm/mssql",
    "@mikro-orm/mongodb",
  ],
  documentedVersion: "7.2",
  category: "orm",
  type: "backend",
  language: "javascript",
  locations: [
    {
      classification: "migration",
      files: [{ glob: "mikro-orm.config.*" }, { glob: "src/mikro-orm.config.*" }],
      keys: [
        { key: "migrations.path", holds: "folders", default: ["migrations"] },
        { key: "migrations.pathTs", holds: "folders" },
      ],
    },
  ],
  patterns: [
    {
      kind: "factory",
      name: "MikroORM.init",
      methods: [
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
        { kind: "call", name: "persist", slots: [], makes: "data" },
        { kind: "call", name: "flush", slots: [], makes: "data" },
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "fork", slots: [], makes: "data" },
      ],
    },
    {
      kind: "factory",
      name: "EntityManager",
      makesType: "EntityManager",
      isTypeOnly: true,
      methods: [
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findOneOrFail", slots: [], makes: "data-fetch" },
        { kind: "call", name: "count", slots: [], makes: "data-fetch" },
        { kind: "call", name: "persist", slots: [], makes: "data" },
        { kind: "call", name: "flush", slots: [], makes: "data" },
        { kind: "call", name: "remove", slots: [], makes: "data" },
      ],
    },
    { kind: "decorator", name: "Entity", classifies: DATA_MODEL },
    { kind: "call", name: "defineEntity", slots: [], classifies: DATA_MODEL },
  ],
}

export const mongooseLibrary: CatalogueLibrary = {
  name: "Mongoose",
  specifiers: ["mongoose"],
  documentedVersion: "9.11",
  category: "orm",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "model",
      makes: "data",
      classifies: DATA_MODEL,
      methods: [
        { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "create", slots: [], makes: "data" },
      ],
    },
    {
      kind: "factory",
      name: "Schema",
      classifies: DATA_MODEL,
      methods: [
        { kind: "call", name: "pre", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
    { kind: "call", name: "connect", slots: [], makes: "data" },
  ],
}

export const objectionJsLibrary: CatalogueLibrary = {
  name: "Objection.js",
  specifiers: ["objection"],
  documentedVersion: "3.2",
  category: "orm",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "class",
      name: "Model",
      makes: "data",
      classifies: DATA_MODEL,
      members: [],
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
        { kind: "call", name: "relatedQuery", slots: [], makes: "data" },
      ],
    },
  ],
}

export const orangeOrmLibrary: CatalogueLibrary = {
  name: "Orange ORM",
  specifiers: ["orange-orm"],
  documentedVersion: "5.5",
  category: "orm",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default.map",
      classifies: DATA_MODEL,
      slots: [{ at: 0, runs: "in-place" }],
      methods: [
        { kind: "call", name: "insert", slots: [], makes: "data" },
        { kind: "call", name: "getById", slots: [], makes: "data-fetch" },
        { kind: "call", name: "getMany", slots: [], makes: "data-fetch" },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      ],
    },
  ],
}

export const prismaLibrary: CatalogueLibrary = {
  name: "Prisma",
  specifiers: ["@prisma/client"],
  documentedVersion: "7.10",
  category: "orm",
  type: "backend",
  language: "javascript",
  locations: [
    {
      classification: "migration",
      files: [{ glob: "prisma.config.*" }, { glob: "package.json", under: "prisma" }],
      keys: [
        { key: "migrations.path", holds: "folders" },
        { key: "schema", holds: "file-folders", below: "migrations/**", default: ["prisma/schema.prisma"], unlessRead: "migrations.path" },
      ],
    },
  ],
  patterns: [
    {
      kind: "factory",
      name: "PrismaClient",
      makesType: "PrismaClient",
      methods: [
        { kind: "call", name: "findMany", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findUnique", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findFirst", slots: [], makes: "data-fetch" },
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "update", slots: [], makes: "data" },
        { kind: "call", name: "delete", slots: [], makes: "data" },
        { kind: "call", name: "upsert", slots: [], makes: "data" },
        { kind: "call", name: "createMany", slots: [], makes: "data" },
        { kind: "call", name: "updateMany", slots: [], makes: "data" },
        { kind: "call", name: "deleteMany", slots: [], makes: "data" },
        { kind: "call", name: "count", slots: [], makes: "data-fetch" },
        { kind: "call", name: "$transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
        { kind: "call", name: "$queryRaw", slots: [], makes: "data-fetch" },
        { kind: "call", name: "$executeRaw", slots: [], makes: "data" },
      ],
    },
  ],
}

export const sequelizeLibrary: CatalogueLibrary = {
  name: "Sequelize",
  specifiers: ["sequelize"],
  documentedVersion: "6.37",
  category: "orm",
  type: "backend",
  language: "javascript",
  locations: [
    { classification: "migration", files: [{ glob: ".sequelizerc" }], keys: [{ key: "migrations-path", holds: "folders", default: ["migrations"] }] },
  ],
  patterns: [
    {
      kind: "factory",
      name: "Sequelize",
      makesType: "Sequelize",
      methods: [
        {
          kind: "factory",
          name: "define",
          makes: "data",
          classifies: DATA_MODEL,
          methods: [
            { kind: "call", name: "create", slots: [], makes: "data" },
            { kind: "call", name: "findAll", slots: [], makes: "data-fetch" },
            { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
          ],
        },
      ],
    },
    {
      kind: "class",
      name: "Model",
      makes: "data",
      classifies: DATA_MODEL,
      members: [],
      methods: [
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "findAll", slots: [], makes: "data-fetch" },
        { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

export const typegooseLibrary: CatalogueLibrary = {
  name: "Typegoose",
  specifiers: ["@typegoose/typegoose"],
  documentedVersion: "13.5",
  category: "orm",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "getModelForClass",
      makes: "data",
      classifies: DATA_MODEL,
      methods: [
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "findById", slots: [], makes: "data-fetch" },
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
      ],
    },
    { kind: "decorator", name: "prop", classifies: DATA_MODEL },
    { kind: "decorator", name: "pre", runs: "event", eventAt: 0 },
    { kind: "decorator", name: "post", runs: "event", eventAt: 0 },
  ],
}

const TYPEORM_STORE_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "find", slots: [], makes: "data-fetch" },
  { kind: "call", name: "findBy", slots: [], makes: "data-fetch" },
  { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
  { kind: "call", name: "findOneBy", slots: [], makes: "data-fetch" },
  { kind: "call", name: "count", slots: [], makes: "data-fetch" },
  { kind: "call", name: "save", slots: [], makes: "data" },
  { kind: "call", name: "insert", slots: [], makes: "data" },
  { kind: "call", name: "update", slots: [], makes: "data" },
  { kind: "call", name: "delete", slots: [], makes: "data" },
  { kind: "call", name: "remove", slots: [], makes: "data" },
]

export const typeormLibrary: CatalogueLibrary = {
  name: "TypeORM",
  specifiers: ["typeorm"],
  documentedVersion: "1.1",
  category: "orm",
  type: "backend",
  language: "javascript",
  locations: [
    {
      classification: "migration",
      files: [{ glob: "**/ormconfig.*", base: "package" }, { glob: "**/data-source.*", base: "package" }, { glob: "**/*-data-source.*", base: "package" }],
      keys: [{ key: "migrations", holds: "paths" }],
    },
  ],
  patterns: [
    { kind: "decorator", name: "Entity", makes: "data", classifies: DATA_MODEL },
    {
      kind: "factory",
      name: "DataSource",
      makesType: "DataSource",
      methods: [
        { kind: "factory", name: "getRepository", methods: TYPEORM_STORE_METHODS },
        { kind: "call", name: "transaction", slots: [{ at: "last", runs: "in-place" }], makes: "transaction" },
      ],
    },
    { kind: "factory", name: "Repository", makesType: "Repository", isTypeOnly: true, methods: TYPEORM_STORE_METHODS },
    { kind: "factory", name: "EntityManager", makesType: "EntityManager", isTypeOnly: true, methods: TYPEORM_STORE_METHODS },
  ],
}
