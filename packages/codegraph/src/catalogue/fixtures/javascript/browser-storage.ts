import type { PatternFixture } from "@/catalogue/types"

const DEXIE_JS = "Dexie.js"

export const dexieJsFixtures: readonly PatternFixture[] = [
  {
    library: DEXIE_JS,
    patternKey: "factory:default:*",
    matches: [
      "import Dexie from \"dexie\"\nconst db = new Dexie(\"FriendDatabase\")",
    ],
    rejects: [
      "const Dexie = (...parts) => parts\nconst db = new Dexie(\"FriendDatabase\")",
    ],
  },
  {
    library: DEXIE_JS,
    patternKey: "factory:default:*>call:version:*",
    matches: [
      "import Dexie from \"dexie\"\nconst db = new Dexie(\"FriendDatabase\")\ndb.version(1).stores({ friends: \"++id, name, age\" })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.version(1).stores({ friends: \"++id, name, age\" })",
    ],
  },
  {
    library: DEXIE_JS,
    patternKey: "factory:default:*>call:transaction:*",
    matches: [
      "import Dexie from \"dexie\"\nconst db = new Dexie(\"FriendDatabase\")\nawait db.transaction(\"rw\", db.friends, async () => { await db.friends.add({ name: \"Ada\" }) })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.transaction(\"rw\", db.friends, async () => { await db.friends.add({ name: \"Ada\" }) })",
    ],
  },
  {
    library: DEXIE_JS,
    patternKey: "call:liveQuery:*",
    matches: [
      "import { liveQuery } from \"dexie\"\nconst friends$ = liveQuery(() => db.friends.toArray())",
    ],
    rejects: [
      "const liveQuery = (...parts) => parts\nconst friends$ = liveQuery(() => db.friends.toArray())",
    ],
  },
]

const IDB_KEYVAL = "idb-keyval"

export const idbKeyvalFixtures: readonly PatternFixture[] = [
  {
    library: IDB_KEYVAL,
    patternKey: "call:get:*",
    matches: [
      "import { get } from \"idb-keyval\"\nawait get(\"hello\")",
    ],
    rejects: [
      "const get = (...parts) => parts\nawait get(\"hello\")",
    ],
  },
  {
    library: IDB_KEYVAL,
    patternKey: "call:set:*",
    matches: [
      "import { set } from \"idb-keyval\"\nawait set(\"hello\", \"world\")",
    ],
    rejects: [
      "const set = (...parts) => parts\nawait set(\"hello\", \"world\")",
    ],
  },
  {
    library: IDB_KEYVAL,
    patternKey: "call:del:*",
    matches: [
      "import { del } from \"idb-keyval\"\nawait del(\"hello\")",
    ],
    rejects: [
      "const del = (...parts) => parts\nawait del(\"hello\")",
    ],
  },
  {
    library: IDB_KEYVAL,
    patternKey: "call:clear:*",
    matches: [
      "import { clear } from \"idb-keyval\"\nawait clear()",
    ],
    rejects: [
      "const clear = (...parts) => parts\nawait clear()",
    ],
  },
  {
    library: IDB_KEYVAL,
    patternKey: "call:getMany:*",
    matches: [
      "import { getMany } from \"idb-keyval\"\nawait getMany([\"user\", \"settings\"])",
    ],
    rejects: [
      "const getMany = (...parts) => parts\nawait getMany([\"user\", \"settings\"])",
    ],
  },
  {
    library: IDB_KEYVAL,
    patternKey: "call:setMany:*",
    matches: [
      "import { setMany } from \"idb-keyval\"\nawait setMany([[\"user\", user], [\"settings\", settings]])",
    ],
    rejects: [
      "const setMany = (...parts) => parts\nawait setMany([[\"user\", user], [\"settings\", settings]])",
    ],
  },
  {
    library: IDB_KEYVAL,
    patternKey: "call:update:*",
    matches: [
      "import { update } from \"idb-keyval\"\nawait update(\"counter\", (value) => (value || 0) + 1)",
    ],
    rejects: [
      "const update = (...parts) => parts\nawait update(\"counter\", (value) => (value || 0) + 1)",
    ],
  },
]

const IMMORTALDB = "ImmortalDB"

export const immortaldbFixtures: readonly PatternFixture[] = [
  {
    library: IMMORTALDB,
    patternKey: "call:ImmortalDB.set:*",
    matches: [
      "import { ImmortalDB } from \"immortal-db\"\nawait ImmortalDB.set(\"key\", \"value\")",
    ],
    rejects: [
      "const ImmortalDB = makeLocalRegistry()\nawait ImmortalDB.set(\"key\", \"value\")",
    ],
  },
  {
    library: IMMORTALDB,
    patternKey: "call:ImmortalDB.get:*",
    matches: [
      "import { ImmortalDB } from \"immortal-db\"\nawait ImmortalDB.get(\"key\", \"default\")",
    ],
    rejects: [
      "const ImmortalDB = makeLocalRegistry()\nawait ImmortalDB.get(\"key\", \"default\")",
    ],
  },
  {
    library: IMMORTALDB,
    patternKey: "call:ImmortalDB.remove:*",
    matches: [
      "import { ImmortalDB } from \"immortal-db\"\nawait ImmortalDB.remove(\"key\")",
    ],
    rejects: [
      "const ImmortalDB = makeLocalRegistry()\nawait ImmortalDB.remove(\"key\")",
    ],
  },
]

const LOCALFORAGE = "LocalForage"

export const localforageFixtures: readonly PatternFixture[] = [
  {
    library: LOCALFORAGE,
    patternKey: "call:default.getItem:*",
    matches: [
      "import localforage from \"localforage\"\nawait localforage.getItem(\"somekey\")",
    ],
    rejects: [
      "const localforage = makeLocalRegistry()\nawait localforage.getItem(\"somekey\")",
    ],
  },
  {
    library: LOCALFORAGE,
    patternKey: "call:default.setItem:*",
    matches: [
      "import localforage from \"localforage\"\nawait localforage.setItem(\"somekey\", \"some value\")",
    ],
    rejects: [
      "const localforage = makeLocalRegistry()\nawait localforage.setItem(\"somekey\", \"some value\")",
    ],
  },
  {
    library: LOCALFORAGE,
    patternKey: "call:default.removeItem:*",
    matches: [
      "import localforage from \"localforage\"\nawait localforage.removeItem(\"somekey\")",
    ],
    rejects: [
      "const localforage = makeLocalRegistry()\nawait localforage.removeItem(\"somekey\")",
    ],
  },
  {
    library: LOCALFORAGE,
    patternKey: "call:default.keys:*",
    matches: [
      "import localforage from \"localforage\"\nawait localforage.keys()",
    ],
    rejects: [
      "const localforage = makeLocalRegistry()\nawait localforage.keys()",
    ],
  },
  {
    library: LOCALFORAGE,
    patternKey: "call:default.iterate:*",
    matches: [
      "import localforage from \"localforage\"\nawait localforage.iterate((value, key) => { report(key, value) })",
    ],
    rejects: [
      "const localforage = makeLocalRegistry()\nawait localforage.iterate((value, key) => { report(key, value) })",
    ],
  },
]

const LOKIJS = "LokiJS"

export const lokijsFixtures: readonly PatternFixture[] = [
  {
    library: LOKIJS,
    patternKey: "factory:default:*",
    matches: [
      "import loki from \"lokijs\"\nconst db = new loki(\"example.db\")",
    ],
    rejects: [
      "const loki = (...parts) => parts\nconst db = new loki(\"example.db\")",
    ],
  },
  {
    library: LOKIJS,
    patternKey: "factory:default:*>factory:addCollection:*",
    matches: [
      "import loki from \"lokijs\"\nconst db = new loki(\"example.db\")\nconst users = db.addCollection(\"users\")",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst users = db.addCollection(\"users\")",
    ],
  },
  {
    library: LOKIJS,
    patternKey: "factory:default:*>factory:addCollection:*>call:insert:*",
    matches: [
      "import loki from \"lokijs\"\nconst db = new loki(\"example.db\")\nconst users = db.addCollection(\"users\")\nusers.insert({ name: \"Odin\", age: 50 })",
    ],
    rejects: [
      "const users = makeLocalRegistry()\nusers.insert({ name: \"Odin\", age: 50 })",
    ],
  },
  {
    library: LOKIJS,
    patternKey: "factory:default:*>factory:addCollection:*>call:find:*",
    matches: [
      "import loki from \"lokijs\"\nconst db = new loki(\"example.db\")\nconst users = db.addCollection(\"users\")\nconst results = users.find({ age: { $gte: 35 } })",
    ],
    rejects: [
      "const users = makeLocalRegistry()\nconst results = users.find({ age: { $gte: 35 } })",
    ],
  },
]

const REDUX_PERSIST = "Redux Persist"

export const reduxPersistFixtures: readonly PatternFixture[] = [
  {
    library: REDUX_PERSIST,
    patternKey: "call:persistReducer:*",
    matches: [
      "import { persistReducer } from \"redux-persist\"\nconst persistedReducer = persistReducer(persistConfig, rootReducer)",
    ],
    rejects: [
      "const persistReducer = (...parts) => parts\nconst persistedReducer = persistReducer(persistConfig, rootReducer)",
    ],
  },
  {
    library: REDUX_PERSIST,
    patternKey: "call:persistStore:*",
    matches: [
      "import { persistStore } from \"redux-persist\"\nconst persistor = persistStore(store)",
    ],
    rejects: [
      "const persistStore = (...parts) => parts\nconst persistor = persistStore(store)",
    ],
  },
]

const REMOTESTORAGE_JS = "remoteStorage.js"

export const remotestorageJsFixtures: readonly PatternFixture[] = [
  {
    library: REMOTESTORAGE_JS,
    patternKey: "factory:default:*",
    matches: [
      "import RemoteStorage from \"remotestoragejs\"\nconst remoteStorage = new RemoteStorage()",
    ],
    rejects: [
      "const RemoteStorage = (...parts) => parts\nconst remoteStorage = new RemoteStorage()",
    ],
  },
  {
    library: REMOTESTORAGE_JS,
    patternKey: "factory:default:*>call:claim:*",
    matches: [
      "import RemoteStorage from \"remotestoragejs\"\nconst remoteStorage = new RemoteStorage()\nremoteStorage.access.claim(\"bookmarks\", \"rw\")",
    ],
    rejects: [
      "const remoteStorage = makeLocalRegistry()\nremoteStorage.access.claim(\"bookmarks\", \"rw\")",
    ],
  },
  {
    library: REMOTESTORAGE_JS,
    patternKey: "factory:default:*>factory:scope:*",
    matches: [
      "import RemoteStorage from \"remotestoragejs\"\nconst remoteStorage = new RemoteStorage()\nconst client = remoteStorage.scope(\"/bookmarks/\")",
    ],
    rejects: [
      "const remoteStorage = makeLocalRegistry()\nconst client = remoteStorage.scope(\"/bookmarks/\")",
    ],
  },
  {
    library: REMOTESTORAGE_JS,
    patternKey: "factory:default:*>factory:scope:*>call:getListing:*",
    matches: [
      "import RemoteStorage from \"remotestoragejs\"\nconst remoteStorage = new RemoteStorage()\nconst client = remoteStorage.scope(\"/bookmarks/\")\nconst listing = await client.getListing(\"\")",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nconst listing = await client.getListing(\"\")",
    ],
  },
  {
    library: REMOTESTORAGE_JS,
    patternKey: "factory:default:*>factory:scope:*>call:storeFile:*",
    matches: [
      "import RemoteStorage from \"remotestoragejs\"\nconst remoteStorage = new RemoteStorage()\nconst client = remoteStorage.scope(\"/bookmarks/\")\nawait client.storeFile(\"text/html\", \"index.html\", page)",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nawait client.storeFile(\"text/html\", \"index.html\", page)",
    ],
  },
  {
    library: REMOTESTORAGE_JS,
    patternKey: "factory:default:*>factory:scope:*>call:on:*",
    matches: [
      "import RemoteStorage from \"remotestoragejs\"\nconst remoteStorage = new RemoteStorage()\nconst client = remoteStorage.scope(\"/bookmarks/\")\nclient.on(\"change\", (event) => { updateItemInUI(event) })",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nclient.on(\"change\", (event) => { updateItemInUI(event) })",
    ],
  },
]

const RXDB = "RxDB"

export const rxdbFixtures: readonly PatternFixture[] = [
  {
    library: RXDB,
    patternKey: "factory:createRxDatabase:*",
    matches: [
      "import { createRxDatabase } from \"rxdb\"\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })",
    ],
    rejects: [
      "const createRxDatabase = (...parts) => parts\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })",
    ],
  },
  {
    library: RXDB,
    patternKey: "factory:createRxDatabase:*>call:addCollections:*",
    matches: [
      "import { createRxDatabase } from \"rxdb\"\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })\nawait db.addCollections({ heroes: { schema: heroSchema } })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.addCollections({ heroes: { schema: heroSchema } })",
    ],
  },
  {
    library: RXDB,
    patternKey: "factory:createRxDatabase:*>call:find:*",
    matches: [
      "import { createRxDatabase } from \"rxdb\"\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })\nconst heroes = await db.heroes.find().exec()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst heroes = await db.heroes.find().exec()",
    ],
  },
  {
    library: RXDB,
    patternKey: "factory:createRxDatabase:*>call:findOne:*",
    matches: [
      "import { createRxDatabase } from \"rxdb\"\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })\nconst hero = await db.heroes.findOne(\"alice\").exec()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst hero = await db.heroes.findOne(\"alice\").exec()",
    ],
  },
  {
    library: RXDB,
    patternKey: "factory:createRxDatabase:*>call:insert:*",
    matches: [
      "import { createRxDatabase } from \"rxdb\"\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })\nawait db.heroes.insert({ name: \"Bob\" })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.heroes.insert({ name: \"Bob\" })",
    ],
  },
  {
    library: RXDB,
    patternKey: "factory:createRxDatabase:*>call:subscribe:*",
    matches: [
      "import { createRxDatabase } from \"rxdb\"\nconst db = await createRxDatabase({ name: \"heroesdb\", storage: getRxStorageLocalstorage() })\ndb.heroes.find().$.subscribe((heroes) => render(heroes))",
    ],
    rejects: [
      "const db = makeLocalRegistry()\ndb.heroes.find().$.subscribe((heroes) => render(heroes))",
    ],
  },
]

const STORE_JS = "store.js"

export const storeJsFixtures: readonly PatternFixture[] = [
  {
    library: STORE_JS,
    patternKey: "call:default.set:*",
    matches: [
      "import store from \"store\"\nstore.set(\"user\", { name: \"Marcus\" })",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.set(\"user\", { name: \"Marcus\" })",
    ],
  },
  {
    library: STORE_JS,
    patternKey: "call:default.get:*",
    matches: [
      "import store from \"store\"\nstore.get(\"user\")",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.get(\"user\")",
    ],
  },
  {
    library: STORE_JS,
    patternKey: "call:default.remove:*",
    matches: [
      "import store from \"store\"\nstore.remove(\"user\")",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.remove(\"user\")",
    ],
  },
  {
    library: STORE_JS,
    patternKey: "call:default.clearAll:*",
    matches: [
      "import store from \"store\"\nstore.clearAll()",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.clearAll()",
    ],
  },
  {
    library: STORE_JS,
    patternKey: "call:default.each:*",
    matches: [
      "import store from \"store\"\nstore.each((value, key) => { report(key, value) })",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.each((value, key) => { report(key, value) })",
    ],
  },
]

const WATERMELONDB = "WatermelonDB"

export const watermelondbFixtures: readonly PatternFixture[] = [
  {
    library: WATERMELONDB,
    patternKey: "factory:Database:*",
    matches: [
      "import { Database, Q } from \"@nozbe/watermelondb\"\nconst database = new Database({ adapter, modelClasses: [Post] })",
    ],
    rejects: [
      "const Database = (...parts) => parts\nconst database = new Database({ adapter, modelClasses: [Post] })",
    ],
  },
  {
    library: WATERMELONDB,
    patternKey: "factory:Database:*>call:get:*",
    matches: [
      "import { Database, Q } from \"@nozbe/watermelondb\"\nconst database = new Database({ adapter, modelClasses: [Post] })\nconst posts = await database.get(\"posts\").query(Q.where(\"is_pinned\", true)).fetch()",
    ],
    rejects: [
      "const database = makeLocalRegistry()\nconst posts = await database.get(\"posts\").query(Q.where(\"is_pinned\", true)).fetch()",
    ],
  },
]
