import type { CatalogueLibrary } from "@/catalogue/types"

export const alasqlLibrary: CatalogueLibrary = {
  name: "AlaSQL",
  specifiers: ["alasql"],
  documentedVersion: "4.20",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], makes: "data" },
    { kind: "call", name: "default.promise", slots: [], makes: "data" },
    { kind: "call", name: "default.compile", slots: [], makes: "data" },
  ],
}

export const betterSqlite3Library: CatalogueLibrary = {
  name: "better-sqlite3",
  specifiers: ["better-sqlite3"],
  documentedVersion: "13.0",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "prepare", slots: [], makes: "data" },
        { kind: "call", name: "exec", slots: [], makes: "data" },
        { kind: "call", name: "pragma", slots: [], makes: "config" },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "kept" }], makes: "transaction" },
      ],
    },
  ],
}

export const duckdbWasmLibrary: CatalogueLibrary = {
  name: "DuckDB-Wasm",
  specifiers: ["@duckdb/duckdb-wasm"],
  documentedVersion: "1.33",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "AsyncDuckDB",
      methods: [
        {
          kind: "factory",
          name: "connect",
          methods: [
            { kind: "call", name: "query", slots: [], makes: "data" },
            { kind: "call", name: "prepare", slots: [], makes: "data" },
            { kind: "call", name: "insertArrowTable", slots: [], makes: "data" },
          ],
        },
      ],
    },
  ],
}

export const knexJsLibrary: CatalogueLibrary = {
  name: "knex.js",
  specifiers: ["knex"],
  documentedVersion: "3.3",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "raw", slots: [], makes: "data" },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      ],
      called: {
        slots: [],
        makes: "data",
      },
    },
  ],
}

export const kyselyLibrary: CatalogueLibrary = {
  name: "Kysely",
  specifiers: ["kysely"],
  documentedVersion: "0.29",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Kysely",
      methods: [
        { kind: "call", name: "selectFrom", slots: [], makes: "data-fetch" },
        { kind: "call", name: "insertInto", slots: [], makes: "data" },
        { kind: "call", name: "updateTable", slots: [], makes: "data" },
        { kind: "call", name: "deleteFrom", slots: [], makes: "data" },
        { kind: "call", name: "transaction", slots: [], makes: "transaction" },
      ],
    },
  ],
}

export const nodePostgresLibrary: CatalogueLibrary = {
  name: "node-postgres",
  specifiers: ["pg"],
  documentedVersion: "8.23",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Pool",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
        {
          kind: "factory",
          name: "connect",
          methods: [
            { kind: "call", name: "query", slots: [], makes: "data" },
          ],
        },
      ],
    },
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
      ],
    },
  ],
}

export const pgliteLibrary: CatalogueLibrary = {
  name: "PGlite",
  specifiers: ["@electric-sql/pglite"],
  documentedVersion: "0.5",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "PGlite",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
        { kind: "call", name: "exec", slots: [], makes: "data" },
        { kind: "call", name: "sql", slots: [], makes: "data" },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      ],
    },
  ],
}

export const postgresJsLibrary: CatalogueLibrary = {
  name: "Postgres.js",
  specifiers: ["postgres"],
  documentedVersion: "3.4",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "unsafe", slots: [], makes: "data" },
        { kind: "call", name: "begin", slots: [{ at: "last", runs: "in-place" }], makes: "transaction" },
        { kind: "call", name: "listen", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
        { kind: "call", name: "subscribe", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
      called: {
        slots: [],
        makes: "data",
      },
    },
  ],
}

export const slonikLibrary: CatalogueLibrary = {
  name: "Slonik",
  specifiers: ["slonik"],
  documentedVersion: "49.10",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createPool",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
        { kind: "call", name: "one", slots: [], makes: "data-fetch" },
        { kind: "call", name: "transaction", slots: [{ at: 0, runs: "in-place" }], makes: "transaction" },
      ],
    },
  ],
}

export const sqlJsLibrary: CatalogueLibrary = {
  name: "sql.js",
  specifiers: ["sql.js"],
  documentedVersion: "1.14",
  category: "raw-sql",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      methods: [
        { kind: "call", name: "run", slots: [], makes: "data" },
        { kind: "call", name: "exec", slots: [], makes: "data" },
        { kind: "call", name: "prepare", slots: [], makes: "data" },
      ],
    },
  ],
}
