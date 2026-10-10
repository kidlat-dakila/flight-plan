import type { PatternFixture } from "@/catalogue/types"

const CASSANDRA_DRIVER = "cassandra-driver"

export const cassandraDriverFixtures: readonly PatternFixture[] = [
  {
    library: CASSANDRA_DRIVER,
    patternKey: "factory:Cluster:*",
    matches: [
      "from cassandra.cluster import Cluster\n\ncluster = Cluster([\"127.0.0.1\"])",
    ],
    rejects: [
      "def Cluster(*parts, **options):\n    return parts\n\ncluster = Cluster([\"127.0.0.1\"])",
    ],
  },
  {
    library: CASSANDRA_DRIVER,
    patternKey: "factory:Cluster:*>factory:connect:*",
    matches: [
      "from cassandra.cluster import Cluster\n\ncluster = Cluster([\"127.0.0.1\"])\n\nsession = cluster.connect(\"mykeyspace\")",
    ],
    rejects: [
      "cluster = LocalRegistry()\n\nsession = cluster.connect(\"mykeyspace\")",
    ],
  },
  {
    library: CASSANDRA_DRIVER,
    patternKey: "factory:Cluster:*>factory:connect:*>call:execute:*",
    matches: [
      "from cassandra.cluster import Cluster\n\ncluster = Cluster([\"127.0.0.1\"])\n\nsession = cluster.connect(\"mykeyspace\")\n\nsession.execute(\"SELECT name FROM users WHERE user_id = %s\", [user_id])",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.execute(\"SELECT name FROM users WHERE user_id = %s\", [user_id])",
    ],
  },
  {
    library: CASSANDRA_DRIVER,
    patternKey: "factory:Cluster:*>factory:connect:*>call:prepare:*",
    matches: [
      "from cassandra.cluster import Cluster\n\ncluster = Cluster([\"127.0.0.1\"])\n\nsession = cluster.connect(\"mykeyspace\")\n\nsession.prepare(\"SELECT name FROM users WHERE user_id = %s\", [user_id])",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.prepare(\"SELECT name FROM users WHERE user_id = %s\", [user_id])",
    ],
  },
  {
    library: CASSANDRA_DRIVER,
    patternKey: "factory:Cluster:*>factory:connect:*>call:execute_async:*",
    matches: [
      "from cassandra.cluster import Cluster\n\ncluster = Cluster([\"127.0.0.1\"])\n\nsession = cluster.connect(\"mykeyspace\")\n\nsession.execute_async(\"SELECT name FROM users WHERE user_id = %s\", [user_id])",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.execute_async(\"SELECT name FROM users WHERE user_id = %s\", [user_id])",
    ],
  },
]

const HAPPYBASE = "HappyBase"

export const happybaseFixtures: readonly PatternFixture[] = [
  {
    library: HAPPYBASE,
    patternKey: "factory:Connection:*",
    matches: [
      "from happybase import Connection\n\nconnection = Connection(\"hostname\")",
    ],
    rejects: [
      "def Connection(*parts, **options):\n    return parts\n\nconnection = Connection(\"hostname\")",
    ],
  },
  {
    library: HAPPYBASE,
    patternKey: "factory:Connection:*>factory:table:*",
    matches: [
      "from happybase import Connection\n\nconnection = Connection(\"hostname\")\n\ntable = connection.table(\"table-name\")",
    ],
    rejects: [
      "connection = LocalRegistry()\n\ntable = connection.table(\"table-name\")",
    ],
  },
  {
    library: HAPPYBASE,
    patternKey: "factory:Connection:*>factory:table:*>call:put:*",
    matches: [
      "from happybase import Connection\n\nconnection = Connection(\"hostname\")\n\ntable = connection.table(\"table-name\")\n\ntable.put(b\"row-key\")",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable.put(b\"row-key\")",
    ],
  },
  {
    library: HAPPYBASE,
    patternKey: "factory:Connection:*>factory:table:*>call:row:*",
    matches: [
      "from happybase import Connection\n\nconnection = Connection(\"hostname\")\n\ntable = connection.table(\"table-name\")\n\ntable.row(b\"row-key\")",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable.row(b\"row-key\")",
    ],
  },
  {
    library: HAPPYBASE,
    patternKey: "factory:Connection:*>factory:table:*>call:scan:*",
    matches: [
      "from happybase import Connection\n\nconnection = Connection(\"hostname\")\n\ntable = connection.table(\"table-name\")\n\ntable.scan(b\"row-key\")",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable.scan(b\"row-key\")",
    ],
  },
  {
    library: HAPPYBASE,
    patternKey: "factory:Connection:*>factory:table:*>call:delete:*",
    matches: [
      "from happybase import Connection\n\nconnection = Connection(\"hostname\")\n\ntable = connection.table(\"table-name\")\n\ntable.delete(b\"row-key\")",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable.delete(b\"row-key\")",
    ],
  },
]

const MYSQLCLIENT = "mysqlclient"

export const mysqlclientFixtures: readonly PatternFixture[] = [
  {
    library: MYSQLCLIENT,
    patternKey: "factory:connect:*",
    matches: [
      "from MySQLdb import connect\n\nconn = connect(host=\"localhost\", user=\"root\", passwd=\"secret\", db=\"shop\")",
    ],
    rejects: [
      "def connect(*parts, **options):\n    return parts\n\nconn = connect(host=\"localhost\", user=\"root\", passwd=\"secret\", db=\"shop\")",
    ],
  },
  {
    library: MYSQLCLIENT,
    patternKey: "factory:connect:*>factory:cursor:*",
    matches: [
      "from MySQLdb import connect\n\nconn = connect(host=\"localhost\", user=\"root\", passwd=\"secret\", db=\"shop\")\n\ncursor = conn.cursor()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\ncursor = conn.cursor()",
    ],
  },
  {
    library: MYSQLCLIENT,
    patternKey: "factory:connect:*>factory:cursor:*>call:execute:*",
    matches: [
      "from MySQLdb import connect\n\nconn = connect(host=\"localhost\", user=\"root\", passwd=\"secret\", db=\"shop\")\n\ncursor = conn.cursor()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
  },
  {
    library: MYSQLCLIENT,
    patternKey: "factory:connect:*>call:commit:*",
    matches: [
      "from MySQLdb import connect\n\nconn = connect(host=\"localhost\", user=\"root\", passwd=\"secret\", db=\"shop\")\n\nconn.commit()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\nconn.commit()",
    ],
  },
]

const PSYCOPG2 = "psycopg2"

export const psycopg2Fixtures: readonly PatternFixture[] = [
  {
    library: PSYCOPG2,
    patternKey: "factory:connect:*",
    matches: [
      "from psycopg2 import connect\n\nconn = connect(\"dbname=test user=postgres\")",
    ],
    rejects: [
      "def connect(*parts, **options):\n    return parts\n\nconn = connect(\"dbname=test user=postgres\")",
    ],
  },
  {
    library: PSYCOPG2,
    patternKey: "factory:connect:*>factory:cursor:*",
    matches: [
      "from psycopg2 import connect\n\nconn = connect(\"dbname=test user=postgres\")\n\ncursor = conn.cursor()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\ncursor = conn.cursor()",
    ],
  },
  {
    library: PSYCOPG2,
    patternKey: "factory:connect:*>factory:cursor:*>call:execute:*",
    matches: [
      "from psycopg2 import connect\n\nconn = connect(\"dbname=test user=postgres\")\n\ncursor = conn.cursor()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
  },
  {
    library: PSYCOPG2,
    patternKey: "factory:connect:*>call:commit:*",
    matches: [
      "from psycopg2 import connect\n\nconn = connect(\"dbname=test user=postgres\")\n\nconn.commit()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\nconn.commit()",
    ],
  },
]

const PY2NEO = "py2neo"

export const py2neoFixtures: readonly PatternFixture[] = [
  {
    library: PY2NEO,
    patternKey: "factory:Graph:*",
    matches: [
      "from py2neo import Graph\n\ngraph = Graph(\"bolt://localhost:7687\")",
    ],
    rejects: [
      "def Graph(*parts, **options):\n    return parts\n\ngraph = Graph(\"bolt://localhost:7687\")",
    ],
  },
  {
    library: PY2NEO,
    patternKey: "factory:Graph:*>call:run:*",
    matches: [
      "from py2neo import Graph\n\ngraph = Graph(\"bolt://localhost:7687\")\n\ngraph.run(\"UNWIND range(1, 3) AS n RETURN n, n * n as n_sq\")",
    ],
    rejects: [
      "graph = LocalRegistry()\n\ngraph.run(\"UNWIND range(1, 3) AS n RETURN n, n * n as n_sq\")",
    ],
  },
]

const PYMONGO = "PyMongo"

export const pymongoFixtures: readonly PatternFixture[] = [
  {
    library: PYMONGO,
    patternKey: "factory:MongoClient:*",
    matches: [
      "from pymongo import MongoClient\n\nclient = MongoClient(\"mongodb://localhost:27017/\")",
    ],
    rejects: [
      "def MongoClient(*parts, **options):\n    return parts\n\nclient = MongoClient(\"mongodb://localhost:27017/\")",
    ],
  },
  {
    library: PYMONGO,
    patternKey: "factory:MongoClient:*>call:insert_one:*",
    matches: [
      "from pymongo import MongoClient\n\nclient = MongoClient(\"mongodb://localhost:27017/\")\n\nmy_collection = client.test.inventory\nmy_collection.insert_one({\"x\": 10})",
    ],
    rejects: [
      "my_collection = LocalRegistry()\n\nmy_collection = client.test.inventory\nmy_collection.insert_one({\"x\": 10})",
    ],
  },
  {
    library: PYMONGO,
    patternKey: "factory:MongoClient:*>call:find:*",
    matches: [
      "from pymongo import MongoClient\n\nclient = MongoClient(\"mongodb://localhost:27017/\")\n\nmy_collection = client.test.inventory\nmy_collection.find({\"x\": 10})",
    ],
    rejects: [
      "my_collection = LocalRegistry()\n\nmy_collection = client.test.inventory\nmy_collection.find({\"x\": 10})",
    ],
  },
]

const PYMSSQL = "pymssql"

export const pymssqlFixtures: readonly PatternFixture[] = [
  {
    library: PYMSSQL,
    patternKey: "factory:connect:*",
    matches: [
      "from pymssql import connect\n\nconn = connect(server, user, password, \"tempdb\")",
    ],
    rejects: [
      "def connect(*parts, **options):\n    return parts\n\nconn = connect(server, user, password, \"tempdb\")",
    ],
  },
  {
    library: PYMSSQL,
    patternKey: "factory:connect:*>factory:cursor:*",
    matches: [
      "from pymssql import connect\n\nconn = connect(server, user, password, \"tempdb\")\n\ncursor = conn.cursor()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\ncursor = conn.cursor()",
    ],
  },
  {
    library: PYMSSQL,
    patternKey: "factory:connect:*>factory:cursor:*>call:execute:*",
    matches: [
      "from pymssql import connect\n\nconn = connect(server, user, password, \"tempdb\")\n\ncursor = conn.cursor()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
  },
  {
    library: PYMSSQL,
    patternKey: "factory:connect:*>factory:cursor:*>call:executemany:*",
    matches: [
      "from pymssql import connect\n\nconn = connect(server, user, password, \"tempdb\")\n\ncursor = conn.cursor()\n\ncursor.executemany(\"INSERT INTO persons VALUES (%d, %s)\", rows)",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\ncursor.executemany(\"INSERT INTO persons VALUES (%d, %s)\", rows)",
    ],
  },
  {
    library: PYMSSQL,
    patternKey: "factory:connect:*>factory:cursor:*>call:callproc:*",
    matches: [
      "from pymssql import connect\n\nconn = connect(server, user, password, \"tempdb\")\n\ncursor = conn.cursor()\n\ncursor.callproc(\"FindPerson\", (\"Jane Doe\",))",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\ncursor.callproc(\"FindPerson\", (\"Jane Doe\",))",
    ],
  },
  {
    library: PYMSSQL,
    patternKey: "factory:connect:*>call:commit:*",
    matches: [
      "from pymssql import connect\n\nconn = connect(server, user, password, \"tempdb\")\n\nconn.commit()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\nconn.commit()",
    ],
  },
]

const PYMYSQL = "PyMySQL"

export const pymysqlFixtures: readonly PatternFixture[] = [
  {
    library: PYMYSQL,
    patternKey: "factory:connect:*",
    matches: [
      "from pymysql import connect\n\nconn = connect(host=\"localhost\", user=\"user\", password=\"passwd\", database=\"db\")",
    ],
    rejects: [
      "def connect(*parts, **options):\n    return parts\n\nconn = connect(host=\"localhost\", user=\"user\", password=\"passwd\", database=\"db\")",
    ],
  },
  {
    library: PYMYSQL,
    patternKey: "factory:connect:*>factory:cursor:*",
    matches: [
      "from pymysql import connect\n\nconn = connect(host=\"localhost\", user=\"user\", password=\"passwd\", database=\"db\")\n\ncursor = conn.cursor()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\ncursor = conn.cursor()",
    ],
  },
  {
    library: PYMYSQL,
    patternKey: "factory:connect:*>factory:cursor:*>call:execute:*",
    matches: [
      "from pymysql import connect\n\nconn = connect(host=\"localhost\", user=\"user\", password=\"passwd\", database=\"db\")\n\ncursor = conn.cursor()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (1,))",
    ],
  },
  {
    library: PYMYSQL,
    patternKey: "factory:connect:*>factory:cursor:*>call:fetchone:*",
    matches: [
      "from pymysql import connect\n\nconn = connect(host=\"localhost\", user=\"user\", password=\"passwd\", database=\"db\")\n\ncursor = conn.cursor()\n\nrow = cursor.fetchone()",
    ],
    rejects: [
      "cursor = LocalRegistry()\n\nrow = cursor.fetchone()",
    ],
  },
  {
    library: PYMYSQL,
    patternKey: "factory:connect:*>call:commit:*",
    matches: [
      "from pymysql import connect\n\nconn = connect(host=\"localhost\", user=\"user\", password=\"passwd\", database=\"db\")\n\nconn.commit()",
    ],
    rejects: [
      "conn = LocalRegistry()\n\nconn.commit()",
    ],
  },
]

const QUERIES = "queries"

export const queriesFixtures: readonly PatternFixture[] = [
  {
    library: QUERIES,
    patternKey: "factory:Session:*",
    matches: [
      "from queries import Session\n\nsession = Session(\"postgresql://postgres@localhost:5432/postgres\")",
    ],
    rejects: [
      "def Session(*parts, **options):\n    return parts\n\nsession = Session(\"postgresql://postgres@localhost:5432/postgres\")",
    ],
  },
  {
    library: QUERIES,
    patternKey: "factory:Session:*>call:query:*",
    matches: [
      "from queries import Session\n\nsession = Session(\"postgresql://postgres@localhost:5432/postgres\")\n\nrows = session.query(\"SELECT * FROM names\")",
    ],
    rejects: [
      "session = LocalRegistry()\n\nrows = session.query(\"SELECT * FROM names\")",
    ],
  },
]

const SUPERSQLITE = "SuperSQLite"

export const supersqliteFixtures: readonly PatternFixture[] = [
  {
    library: SUPERSQLITE,
    patternKey: "call:sqlite3.connect:*",
    matches: [
      "from supersqlite import sqlite3\n\nconn = sqlite3.connect(\"database.db\")",
    ],
    rejects: [
      "sqlite3 = LocalRegistry()\n\nconn = sqlite3.connect(\"database.db\")",
    ],
  },
]
