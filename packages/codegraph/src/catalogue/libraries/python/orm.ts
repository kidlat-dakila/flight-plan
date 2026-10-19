import type { CatalogueLibrary } from "@/catalogue/types"

const DATA_MODEL = "data-model"

export const datasetLibrary: CatalogueLibrary = {
  name: "dataset",
  specifiers: ["dataset"],
  documentedVersion: "2.0",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "connect",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
        { kind: "call", name: "insert", slots: [], makes: "data" },
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "find_one", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

export const djangoModelsLibrary: CatalogueLibrary = {
  name: "Django Models",
  specifiers: ["django.db.models"],
  documentedVersion: "6.1",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Model",
      makes: "data",
      classifies: DATA_MODEL,
      members: [{ name: "save", runs: "in-place" }],
      methods: [
        { kind: "call", name: "filter", slots: [], makes: "data-fetch" },
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "get_or_create", slots: [], makes: "data" },
        { kind: "call", name: "bulk_create", slots: [], makes: "data" },
        { kind: "call", name: "save", slots: [], makes: "data" },
      ],
    },
  ],
}

export const hotRedisLibrary: CatalogueLibrary = {
  name: "hot-redis",
  specifiers: ["hot_redis"],
  documentedVersion: "0.3",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "List",
      makes: "cache",
      methods: [],
    },
    {
      kind: "factory",
      name: "Queue",
      makes: "cache",
      methods: [],
    },
    { kind: "call", name: "transaction", slots: [], makes: "transaction" },
  ],
}

export const mongoengineLibrary: CatalogueLibrary = {
  name: "MongoEngine",
  specifiers: ["mongoengine"],
  documentedVersion: "0.29",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "connect", slots: [], makes: "data" },
    {
      kind: "class",
      name: "Document",
      makes: "data",
      classifies: DATA_MODEL,
      members: [{ name: "save", runs: "in-place" }],
      methods: [
        { kind: "call", name: "objects", slots: [], makes: "data-fetch" },
        { kind: "call", name: "save", slots: [], makes: "data" },
      ],
    },
  ],
}

export const oratorLibrary: CatalogueLibrary = {
  name: "Orator",
  specifiers: ["orator"],
  documentedVersion: "0.9",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "DatabaseManager",
      methods: [
        { kind: "call", name: "table", slots: [], makes: "data" },
      ],
    },
    {
      kind: "class",
      name: "Model",
      makes: "data",
      classifies: DATA_MODEL,
      members: [],
      methods: [
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
        { kind: "call", name: "where", slots: [], makes: "data-fetch" },
        { kind: "call", name: "all", slots: [], makes: "data-fetch" },
        { kind: "call", name: "destroy", slots: [], makes: "data" },
      ],
    },
  ],
}

export const ormLibrary: CatalogueLibrary = {
  name: "orm",
  specifiers: ["orm"],
  documentedVersion: "0.3",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Model",
      makes: "data",
      classifies: DATA_MODEL,
      members: [],
      methods: [
        { kind: "call", name: "filter", slots: [], makes: "data-fetch" },
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "get", slots: [], makes: "data-fetch" },
        { kind: "call", name: "all", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

export const peeweeLibrary: CatalogueLibrary = {
  name: "peewee",
  specifiers: ["peewee"],
  documentedVersion: "4.5",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "class",
      name: "Model",
      makes: "data",
      classifies: DATA_MODEL,
      members: [],
      methods: [
        { kind: "call", name: "create", slots: [], makes: "data" },
        { kind: "call", name: "select", slots: [], makes: "data-fetch" },
      ],
    },
    {
      kind: "factory",
      name: "SqliteDatabase",
      methods: [
        { kind: "call", name: "atomic", slots: [], makes: "transaction" },
      ],
    },
  ],
}

export const ponyLibrary: CatalogueLibrary = {
  name: "Pony",
  specifiers: ["pony", "pony.orm"],
  documentedVersion: "0.7",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Database",
      methods: [
        { kind: "call", name: "bind", slots: [], makes: "data" },
        { kind: "call", name: "generate_mapping", slots: [], makes: "data" },
      ],
    },
    { kind: "decorator", name: "db_session", makes: "transaction" },
    { kind: "call", name: "PrimaryKey", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "Required", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "Optional", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "Set", slots: [], classifies: DATA_MODEL },
  ],
}

export const pydalLibrary: CatalogueLibrary = {
  name: "pyDAL",
  specifiers: ["pydal"],
  documentedVersion: "20260520.0",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "DAL",
      methods: [
        { kind: "call", name: "define_table", slots: [], makes: "data", classifies: DATA_MODEL },
        { kind: "call", name: "insert", slots: [], makes: "data" },
        { kind: "call", name: "commit", slots: [], makes: "transaction" },
      ],
      called: {
        slots: [],
        makes: "data",
      },
    },
  ],
}

export const sqlalchemyLibrary: CatalogueLibrary = {
  name: "SQLAlchemy",
  specifiers: ["sqlalchemy", "sqlalchemy.orm"],
  documentedVersion: "2.1",
  category: "orm",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Session",
      methods: [
        { kind: "call", name: "execute", slots: [], makes: "data" },
        { kind: "call", name: "scalars", slots: [], makes: "data-fetch" },
        { kind: "call", name: "get", slots: [], makes: "data-fetch" },
        { kind: "call", name: "add", slots: [], makes: "data" },
      ],
    },
    { kind: "call", name: "select", slots: [], makes: "data-fetch" },
    { kind: "call", name: "text", slots: [], makes: "data" },
    { kind: "class", name: "DeclarativeBase", classifies: DATA_MODEL, members: [], methods: [] },
    { kind: "call", name: "declarative_base", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "mapped_column", slots: [], classifies: DATA_MODEL },
    { kind: "call", name: "Column", slots: [], classifies: DATA_MODEL },
  ],
}
