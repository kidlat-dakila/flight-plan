import type { PatternFixture } from "@/catalogue/types"

const ALASQL = "AlaSQL"

export const alasqlFixtures: readonly PatternFixture[] = [
  {
    library: ALASQL,
    patternKey: "call:default:*",
    matches: [
      "import alasql from \"alasql\"\nconst rows = alasql(\"SELECT * FROM ? WHERE a > 1\", [data])",
    ],
    rejects: [
      "const alasql = (...parts) => parts\nconst rows = alasql(\"SELECT * FROM ? WHERE a > 1\", [data])",
    ],
  },
  {
    library: ALASQL,
    patternKey: "call:default.promise:*",
    matches: [
      "import alasql from \"alasql\"\nconst rows = await alasql.promise(\"SELECT * FROM XLS(\\\"data.xls\\\")\")",
    ],
    rejects: [
      "const alasql = makeLocalRegistry()\nconst rows = await alasql.promise(\"SELECT * FROM XLS(\\\"data.xls\\\")\")",
    ],
  },
  {
    library: ALASQL,
    patternKey: "call:default.compile:*",
    matches: [
      "import alasql from \"alasql\"\nconst statement = alasql.compile(\"SELECT * FROM ? WHERE a > ?\")",
    ],
    rejects: [
      "const alasql = makeLocalRegistry()\nconst statement = alasql.compile(\"SELECT * FROM ? WHERE a > ?\")",
    ],
  },
]

const BETTER_SQLITE3 = "better-sqlite3"

export const betterSqlite3Fixtures: readonly PatternFixture[] = [
  {
    library: BETTER_SQLITE3,
    patternKey: "factory:default:*",
    matches: [
      "import Database from \"better-sqlite3\"\nconst db = new Database(\"foobar.db\")",
    ],
    rejects: [
      "const Database = (...parts) => parts\nconst db = new Database(\"foobar.db\")",
    ],
  },
  {
    library: BETTER_SQLITE3,
    patternKey: "factory:default:*>call:prepare:*",
    matches: [
      "import Database from \"better-sqlite3\"\nconst db = new Database(\"foobar.db\")\ndb.prepare(\"SELECT * FROM users WHERE id = ?\")",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.prepare(\"SELECT * FROM users WHERE id = ?\")",
    ],
  },
  {
    library: BETTER_SQLITE3,
    patternKey: "factory:default:*>call:exec:*",
    matches: [
      "import Database from \"better-sqlite3\"\nconst db = new Database(\"foobar.db\")\ndb.exec(\"SELECT * FROM users WHERE id = ?\")",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.exec(\"SELECT * FROM users WHERE id = ?\")",
    ],
  },
  {
    library: BETTER_SQLITE3,
    patternKey: "factory:default:*>call:pragma:*",
    matches: [
      "import Database from \"better-sqlite3\"\nconst db = new Database(\"foobar.db\")\ndb.pragma(\"journal_mode = WAL\")",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.pragma(\"journal_mode = WAL\")",
    ],
  },
  {
    library: BETTER_SQLITE3,
    patternKey: "factory:default:*>call:transaction:*",
    matches: [
      "import Database from \"better-sqlite3\"\nconst db = new Database(\"foobar.db\")\nconst insertMany = db.transaction((cats) => { for (const cat of cats) insert.run(cat) })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst insertMany = db.transaction((cats) => { for (const cat of cats) insert.run(cat) })",
    ],
  },
]

const DUCKDB_WASM = "DuckDB-Wasm"

export const duckdbWasmFixtures: readonly PatternFixture[] = [
  {
    library: DUCKDB_WASM,
    patternKey: "factory:AsyncDuckDB:*",
    matches: [
      "import { AsyncDuckDB } from \"@duckdb/duckdb-wasm\"\nconst db = new AsyncDuckDB(logger, worker)",
    ],
    rejects: [
      "const AsyncDuckDB = (...parts) => parts\nconst db = new AsyncDuckDB(logger, worker)",
    ],
  },
  {
    library: DUCKDB_WASM,
    patternKey: "factory:AsyncDuckDB:*>factory:connect:*",
    matches: [
      "import { AsyncDuckDB } from \"@duckdb/duckdb-wasm\"\nconst db = new AsyncDuckDB(logger, worker)\nconst conn = await db.connect()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst conn = await db.connect()",
    ],
  },
  {
    library: DUCKDB_WASM,
    patternKey: "factory:AsyncDuckDB:*>factory:connect:*>call:query:*",
    matches: [
      "import { AsyncDuckDB } from \"@duckdb/duckdb-wasm\"\nconst db = new AsyncDuckDB(logger, worker)\nconst conn = await db.connect()\nconn.query(\"SELECT * FROM generate_series(1, 100)\")",
    ],
    rejects: [
      "const conn = makeLocalRegistry()\nconn.query(\"SELECT * FROM generate_series(1, 100)\")",
    ],
  },
  {
    library: DUCKDB_WASM,
    patternKey: "factory:AsyncDuckDB:*>factory:connect:*>call:prepare:*",
    matches: [
      "import { AsyncDuckDB } from \"@duckdb/duckdb-wasm\"\nconst db = new AsyncDuckDB(logger, worker)\nconst conn = await db.connect()\nconn.prepare(\"SELECT * FROM generate_series(1, 100)\")",
    ],
    rejects: [
      "const conn = makeLocalRegistry()\nconn.prepare(\"SELECT * FROM generate_series(1, 100)\")",
    ],
  },
  {
    library: DUCKDB_WASM,
    patternKey: "factory:AsyncDuckDB:*>factory:connect:*>call:insertArrowTable:*",
    matches: [
      "import { AsyncDuckDB } from \"@duckdb/duckdb-wasm\"\nconst db = new AsyncDuckDB(logger, worker)\nconst conn = await db.connect()\nconn.insertArrowTable(\"SELECT * FROM generate_series(1, 100)\")",
    ],
    rejects: [
      "const conn = makeLocalRegistry()\nconn.insertArrowTable(\"SELECT * FROM generate_series(1, 100)\")",
    ],
  },
]

const KNEX_JS = "knex.js"

export const knexJsFixtures: readonly PatternFixture[] = [
  {
    library: KNEX_JS,
    patternKey: "factory:default:*",
    matches: [
      "import knex from \"knex\"\nconst db = knex({ client: \"pg\", connection: process.env.DATABASE_URL })",
    ],
    rejects: [
      "const knex = (...parts) => parts\nconst db = knex({ client: \"pg\", connection: process.env.DATABASE_URL })",
    ],
  },
  {
    library: KNEX_JS,
    patternKey: "factory:default:*>call:raw:*",
    matches: [
      "import knex from \"knex\"\nconst db = knex({ client: \"pg\", connection: process.env.DATABASE_URL })\nconst rows = await db.raw(\"select * from users where id = ?\", [1])",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst rows = await db.raw(\"select * from users where id = ?\", [1])",
    ],
  },
  {
    library: KNEX_JS,
    patternKey: "factory:default:*>call:transaction:*",
    matches: [
      "import knex from \"knex\"\nconst db = knex({ client: \"pg\", connection: process.env.DATABASE_URL })\nawait db.transaction(async (trx) => { await trx(\"users\").insert({ name: \"Ada\" }) })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.transaction(async (trx) => { await trx(\"users\").insert({ name: \"Ada\" }) })",
    ],
  },
  {
    library: KNEX_JS,
    patternKey: "factory:default:*>called",
    matches: [
      "import knex from \"knex\"\nconst db = knex({ client: \"pg\", connection: process.env.DATABASE_URL })\nconst users = await db(\"users\").where({ id: 1 }).select(\"id\")",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst users = await db(\"users\").where({ id: 1 }).select(\"id\")",
    ],
  },
]

const KYSELY = "Kysely"

export const kyselyFixtures: readonly PatternFixture[] = [
  {
    library: KYSELY,
    patternKey: "factory:Kysely:*",
    matches: [
      "import { Kysely } from \"kysely\"\nconst db = new Kysely({ dialect })",
    ],
    rejects: [
      "const Kysely = (...parts) => parts\nconst db = new Kysely({ dialect })",
    ],
  },
  {
    library: KYSELY,
    patternKey: "factory:Kysely:*>call:selectFrom:*",
    matches: [
      "import { Kysely } from \"kysely\"\nconst db = new Kysely({ dialect })\nconst result = await db.selectFrom(\"person\").executeTakeFirst()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst result = await db.selectFrom(\"person\").executeTakeFirst()",
    ],
  },
  {
    library: KYSELY,
    patternKey: "factory:Kysely:*>call:insertInto:*",
    matches: [
      "import { Kysely } from \"kysely\"\nconst db = new Kysely({ dialect })\nconst result = await db.insertInto(\"person\").executeTakeFirst()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst result = await db.insertInto(\"person\").executeTakeFirst()",
    ],
  },
  {
    library: KYSELY,
    patternKey: "factory:Kysely:*>call:updateTable:*",
    matches: [
      "import { Kysely } from \"kysely\"\nconst db = new Kysely({ dialect })\nconst result = await db.updateTable(\"person\").executeTakeFirst()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst result = await db.updateTable(\"person\").executeTakeFirst()",
    ],
  },
  {
    library: KYSELY,
    patternKey: "factory:Kysely:*>call:deleteFrom:*",
    matches: [
      "import { Kysely } from \"kysely\"\nconst db = new Kysely({ dialect })\nconst result = await db.deleteFrom(\"person\").executeTakeFirst()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst result = await db.deleteFrom(\"person\").executeTakeFirst()",
    ],
  },
  {
    library: KYSELY,
    patternKey: "factory:Kysely:*>call:transaction:*",
    matches: [
      "import { Kysely } from \"kysely\"\nconst db = new Kysely({ dialect })\nawait db.transaction().execute(async (trx) => { await trx.insertInto(\"person\").values(person).execute() })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.transaction().execute(async (trx) => { await trx.insertInto(\"person\").values(person).execute() })",
    ],
  },
]

const NODE_POSTGRES = "node-postgres"

export const nodePostgresFixtures: readonly PatternFixture[] = [
  {
    library: NODE_POSTGRES,
    patternKey: "factory:Pool:*",
    matches: [
      "import { Pool } from \"pg\"\nconst pool = new Pool()",
    ],
    rejects: [
      "const Pool = (...parts) => parts\nconst pool = new Pool()",
    ],
  },
  {
    library: NODE_POSTGRES,
    patternKey: "factory:Pool:*>call:query:*",
    matches: [
      "import { Pool } from \"pg\"\nconst pool = new Pool()\nconst result = await pool.query(\"SELECT NOW()\")",
    ],
    rejects: [
      "const pool = makeLocalRegistry()\nconst result = await pool.query(\"SELECT NOW()\")",
    ],
  },
  {
    library: NODE_POSTGRES,
    patternKey: "factory:Pool:*>factory:connect:*",
    matches: [
      "import { Pool } from \"pg\"\nconst pool = new Pool()\nconst client = await pool.connect()",
    ],
    rejects: [
      "const pool = makeLocalRegistry()\nconst client = await pool.connect()",
    ],
  },
  {
    library: NODE_POSTGRES,
    patternKey: "factory:Pool:*>factory:connect:*>call:query:*",
    matches: [
      "import { Pool } from \"pg\"\nconst pool = new Pool()\nconst client = await pool.connect()\nawait client.query(\"BEGIN\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nawait client.query(\"BEGIN\")",
    ],
  },
  {
    library: NODE_POSTGRES,
    patternKey: "factory:Client:*",
    matches: [
      "import { Client } from \"pg\"\nconst client = new Client()",
    ],
    rejects: [
      "const Client = (...parts) => parts\nconst client = new Client()",
    ],
  },
  {
    library: NODE_POSTGRES,
    patternKey: "factory:Client:*>call:query:*",
    matches: [
      "import { Client } from \"pg\"\nconst client = new Client()\nconst result = await client.query(\"SELECT $1::text as message\", [\"Hello\"])",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst result = await client.query(\"SELECT $1::text as message\", [\"Hello\"])",
    ],
  },
]

const PGLITE = "PGlite"

export const pgliteFixtures: readonly PatternFixture[] = [
  {
    library: PGLITE,
    patternKey: "factory:PGlite:*",
    matches: [
      "import { PGlite } from \"@electric-sql/pglite\"\nconst db = new PGlite()",
    ],
    rejects: [
      "const PGlite = (...parts) => parts\nconst db = new PGlite()",
    ],
  },
  {
    library: PGLITE,
    patternKey: "factory:PGlite:*>call:query:*",
    matches: [
      "import { PGlite } from \"@electric-sql/pglite\"\nconst db = new PGlite()\nconst result = await db.query(\"SELECT * FROM todo WHERE id = $1\", [1])",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst result = await db.query(\"SELECT * FROM todo WHERE id = $1\", [1])",
    ],
  },
  {
    library: PGLITE,
    patternKey: "factory:PGlite:*>call:exec:*",
    matches: [
      "import { PGlite } from \"@electric-sql/pglite\"\nconst db = new PGlite()\nawait db.exec(\"CREATE TABLE IF NOT EXISTS todo (id SERIAL PRIMARY KEY, task TEXT)\")",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.exec(\"CREATE TABLE IF NOT EXISTS todo (id SERIAL PRIMARY KEY, task TEXT)\")",
    ],
  },
  {
    library: PGLITE,
    patternKey: "factory:PGlite:*>call:sql:*",
    matches: [
      "import { PGlite } from \"@electric-sql/pglite\"\nconst db = new PGlite()\nconst result = await db.sql`SELECT * FROM todo WHERE id = 1`",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst result = await db.sql`SELECT * FROM todo WHERE id = 1`",
    ],
  },
  {
    library: PGLITE,
    patternKey: "factory:PGlite:*>call:transaction:*",
    matches: [
      "import { PGlite } from \"@electric-sql/pglite\"\nconst db = new PGlite()\nawait db.transaction(async (tx) => { await tx.query(\"DELETE FROM todo\") })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.transaction(async (tx) => { await tx.query(\"DELETE FROM todo\") })",
    ],
  },
]

const POSTGRES_JS = "Postgres.js"

export const postgresJsFixtures: readonly PatternFixture[] = [
  {
    library: POSTGRES_JS,
    patternKey: "factory:default:*",
    matches: [
      "import postgres from \"postgres\"\nconst sql = postgres(\"postgres://username:password@host:5432/database\")",
    ],
    rejects: [
      "const postgres = (...parts) => parts\nconst sql = postgres(\"postgres://username:password@host:5432/database\")",
    ],
  },
  {
    library: POSTGRES_JS,
    patternKey: "factory:default:*>call:unsafe:*",
    matches: [
      "import postgres from \"postgres\"\nconst sql = postgres(\"postgres://username:password@host:5432/database\")\nconst rows = await sql.unsafe(\"select * from users\")",
    ],
    rejects: [
      "const sql = makeLocalRegistry()\nconst rows = await sql.unsafe(\"select * from users\")",
    ],
  },
  {
    library: POSTGRES_JS,
    patternKey: "factory:default:*>call:begin:*",
    matches: [
      "import postgres from \"postgres\"\nconst sql = postgres(\"postgres://username:password@host:5432/database\")\nawait sql.begin(async (sql) => { await sql`insert into users (name) values ('Murray')` })",
    ],
    rejects: [
      "const sql = makeLocalRegistry()\nawait sql.begin(async (sql) => { await sql`insert into users (name) values ('Murray')` })",
    ],
  },
  {
    library: POSTGRES_JS,
    patternKey: "factory:default:*>call:listen:*",
    matches: [
      "import postgres from \"postgres\"\nconst sql = postgres(\"postgres://username:password@host:5432/database\")\nawait sql.listen(\"news\", (payload) => { report(payload) })",
    ],
    rejects: [
      "const sql = makeLocalRegistry()\nawait sql.listen(\"news\", (payload) => { report(payload) })",
    ],
  },
  {
    library: POSTGRES_JS,
    patternKey: "factory:default:*>call:subscribe:*",
    matches: [
      "import postgres from \"postgres\"\nconst sql = postgres(\"postgres://username:password@host:5432/database\")\nawait sql.subscribe(\"insert:events\", (row) => { report(row) })",
    ],
    rejects: [
      "const sql = makeLocalRegistry()\nawait sql.subscribe(\"insert:events\", (row) => { report(row) })",
    ],
  },
  {
    library: POSTGRES_JS,
    patternKey: "factory:default:*>called",
    matches: [
      "import postgres from \"postgres\"\nconst sql = postgres(\"postgres://username:password@host:5432/database\")\nconst users = await sql`select name, age from users`",
    ],
    rejects: [
      "const sql = makeLocalRegistry()\nconst users = await sql`select name, age from users`",
    ],
  },
]

const SLONIK = "Slonik"

export const slonikFixtures: readonly PatternFixture[] = [
  {
    library: SLONIK,
    patternKey: "factory:createPool:*",
    matches: [
      "import { createPool } from \"slonik\"\nconst pool = await createPool(\"postgres://\")",
    ],
    rejects: [
      "const createPool = (...parts) => parts\nconst pool = await createPool(\"postgres://\")",
    ],
  },
  {
    library: SLONIK,
    patternKey: "factory:createPool:*>call:query:*",
    matches: [
      "import { createPool } from \"slonik\"\nconst pool = await createPool(\"postgres://\")\npool.query(sql.unsafe`SELECT 1`)",
    ],
    rejects: [
      "const pool = makeLocalRegistry()\npool.query(sql.unsafe`SELECT 1`)",
    ],
  },
  {
    library: SLONIK,
    patternKey: "factory:createPool:*>call:one:*",
    matches: [
      "import { createPool } from \"slonik\"\nconst pool = await createPool(\"postgres://\")\npool.one(sql.unsafe`SELECT 1`)",
    ],
    rejects: [
      "const pool = makeLocalRegistry()\npool.one(sql.unsafe`SELECT 1`)",
    ],
  },
  {
    library: SLONIK,
    patternKey: "factory:createPool:*>call:transaction:*",
    matches: [
      "import { createPool } from \"slonik\"\nconst pool = await createPool(\"postgres://\")\nawait pool.transaction(async (transactionConnection) => { await transactionConnection.query(sql.unsafe`SELECT 1`) })",
    ],
    rejects: [
      "const pool = makeLocalRegistry()\nawait pool.transaction(async (transactionConnection) => { await transactionConnection.query(sql.unsafe`SELECT 1`) })",
    ],
  },
]

const SQL_JS = "sql.js"

export const sqlJsFixtures: readonly PatternFixture[] = [
  {
    library: SQL_JS,
    patternKey: "factory:default:*",
    matches: [
      "import initSqlJs from \"sql.js\"\nconst SQL = await initSqlJs()\nconst db = new SQL.Database()",
    ],
    rejects: [
      "const initSqlJs = (...parts) => parts\nconst SQL = await initSqlJs()\nconst db = new SQL.Database()",
    ],
  },
  {
    library: SQL_JS,
    patternKey: "factory:default:*>call:run:*",
    matches: [
      "import initSqlJs from \"sql.js\"\nconst SQL = await initSqlJs()\nconst db = new SQL.Database()\ndb.run(\"SELECT * FROM test\")",
    ],
    rejects: [
      "const SQL = makeLocalRegistry()\ndb.run(\"SELECT * FROM test\")",
    ],
  },
  {
    library: SQL_JS,
    patternKey: "factory:default:*>call:exec:*",
    matches: [
      "import initSqlJs from \"sql.js\"\nconst SQL = await initSqlJs()\nconst db = new SQL.Database()\ndb.exec(\"SELECT * FROM test\")",
    ],
    rejects: [
      "const SQL = makeLocalRegistry()\ndb.exec(\"SELECT * FROM test\")",
    ],
  },
  {
    library: SQL_JS,
    patternKey: "factory:default:*>call:prepare:*",
    matches: [
      "import initSqlJs from \"sql.js\"\nconst SQL = await initSqlJs()\nconst db = new SQL.Database()\ndb.prepare(\"SELECT * FROM test\")",
    ],
    rejects: [
      "const SQL = makeLocalRegistry()\ndb.prepare(\"SELECT * FROM test\")",
    ],
  },
]
