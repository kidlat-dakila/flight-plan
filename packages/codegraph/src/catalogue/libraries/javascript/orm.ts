import type { CatalogueLibrary } from "@/catalogue/types"

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
  specifiers: ["drizzle-orm", "drizzle-orm/node-postgres", "drizzle-orm/postgres-js", "drizzle-orm/mysql2", "drizzle-orm/better-sqlite3", "drizzle-orm/libsql", "drizzle-orm/neon-http"],
  documentedVersion: "0.45",
  category: "orm",
  type: "backend",
  language: "javascript",
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
  ],
}

export const mikroormLibrary: CatalogueLibrary = {
  name: "MikroORM",
  specifiers: ["@mikro-orm/core"],
  documentedVersion: "7.2",
  category: "orm",
  type: "backend",
  language: "javascript",
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
      methods: [
        { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "create", slots: [], makes: "data" },
      ],
    },
    {
      kind: "factory",
      name: "Schema",
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
  patterns: [
    {
      kind: "factory",
      name: "PrismaClient",
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
  patterns: [
    {
      kind: "factory",
      name: "Sequelize",
      methods: [
        {
          kind: "factory",
          name: "define",
          makes: "data",
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
      methods: [
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "findById", slots: [], makes: "data-fetch" },
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
      ],
    },
    { kind: "decorator", name: "pre", runs: "event", eventAt: 0 },
    { kind: "decorator", name: "post", runs: "event", eventAt: 0 },
  ],
}

export const typeormLibrary: CatalogueLibrary = {
  name: "TypeORM",
  specifiers: ["typeorm"],
  documentedVersion: "1.1",
  category: "orm",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "decorator", name: "Entity", makes: "data" },
    {
      kind: "factory",
      name: "DataSource",
      methods: [
        {
          kind: "factory",
          name: "getRepository",
          methods: [
            { kind: "call", name: "findOneBy", slots: [], makes: "data-fetch" },
            { kind: "call", name: "findOne", slots: [], makes: "data-fetch" },
            { kind: "call", name: "save", slots: [], makes: "data" },
          ],
        },
        { kind: "call", name: "transaction", slots: [{ at: "last", runs: "in-place" }], makes: "transaction" },
      ],
    },
  ],
}
