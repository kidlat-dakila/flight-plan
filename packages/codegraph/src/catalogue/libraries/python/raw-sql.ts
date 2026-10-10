import type { CatalogueLibrary } from "@/catalogue/types"

export const cassandraDriverLibrary: CatalogueLibrary = {
  name: "cassandra-driver",
  specifiers: ["cassandra", "cassandra.cluster"],
  documentedVersion: "3.30",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Cluster",
      methods: [
        {
          kind: "factory",
          name: "connect",
          methods: [
            { kind: "call", name: "execute", slots: [], makes: "data" },
            { kind: "call", name: "prepare", slots: [], makes: "data" },
            { kind: "call", name: "execute_async", slots: [], makes: "data" },
          ],
        },
      ],
    },
  ],
}

export const happybaseLibrary: CatalogueLibrary = {
  name: "HappyBase",
  specifiers: ["happybase"],
  documentedVersion: "1.3",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Connection",
      methods: [
        {
          kind: "factory",
          name: "table",
          methods: [
            { kind: "call", name: "put", slots: [], makes: "data" },
            { kind: "call", name: "row", slots: [], makes: "data-fetch" },
            { kind: "call", name: "scan", slots: [], makes: "data-fetch" },
            { kind: "call", name: "delete", slots: [], makes: "data" },
          ],
        },
      ],
    },
  ],
}

export const mysqlclientLibrary: CatalogueLibrary = {
  name: "mysqlclient",
  specifiers: ["MySQLdb"],
  documentedVersion: "2.3",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "connect",
      methods: [
        {
          kind: "factory",
          name: "cursor",
          methods: [
            { kind: "call", name: "execute", slots: [], makes: "data" },
          ],
        },
        { kind: "call", name: "commit", slots: [], makes: "transaction" },
      ],
    },
  ],
}

export const psycopg2Library: CatalogueLibrary = {
  name: "psycopg2",
  specifiers: ["psycopg2"],
  documentedVersion: "2.9",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "connect",
      methods: [
        {
          kind: "factory",
          name: "cursor",
          methods: [
            { kind: "call", name: "execute", slots: [], makes: "data" },
          ],
        },
        { kind: "call", name: "commit", slots: [], makes: "transaction" },
      ],
    },
  ],
}

export const py2neoLibrary: CatalogueLibrary = {
  name: "py2neo",
  specifiers: ["py2neo"],
  documentedVersion: "2021.2",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Graph",
      methods: [
        { kind: "call", name: "run", slots: [], makes: "data" },
      ],
    },
  ],
}

export const pymongoLibrary: CatalogueLibrary = {
  name: "PyMongo",
  specifiers: ["pymongo"],
  documentedVersion: "4.18",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "MongoClient",
      methods: [
        { kind: "call", name: "insert_one", slots: [], makes: "data" },
        { kind: "call", name: "find", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

export const pymssqlLibrary: CatalogueLibrary = {
  name: "pymssql",
  specifiers: ["pymssql"],
  documentedVersion: "2.4",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "connect",
      methods: [
        {
          kind: "factory",
          name: "cursor",
          methods: [
            { kind: "call", name: "execute", slots: [], makes: "data" },
            { kind: "call", name: "executemany", slots: [], makes: "data" },
            { kind: "call", name: "callproc", slots: [], makes: "data" },
          ],
        },
        { kind: "call", name: "commit", slots: [], makes: "transaction" },
      ],
    },
  ],
}

export const pymysqlLibrary: CatalogueLibrary = {
  name: "PyMySQL",
  specifiers: ["pymysql"],
  documentedVersion: "1.2",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "connect",
      methods: [
        {
          kind: "factory",
          name: "cursor",
          methods: [
            { kind: "call", name: "execute", slots: [], makes: "data" },
            { kind: "call", name: "fetchone", slots: [], makes: "data-fetch" },
          ],
        },
        { kind: "call", name: "commit", slots: [], makes: "transaction" },
      ],
    },
  ],
}

export const queriesLibrary: CatalogueLibrary = {
  name: "queries",
  specifiers: ["queries"],
  documentedVersion: "2.1",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Session",
      methods: [
        { kind: "call", name: "query", slots: [], makes: "data" },
      ],
    },
  ],
}

export const supersqliteLibrary: CatalogueLibrary = {
  name: "SuperSQLite",
  specifiers: ["supersqlite"],
  documentedVersion: "0.0",
  category: "raw-sql",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "sqlite3.connect", slots: [], makes: "data" },
  ],
}
