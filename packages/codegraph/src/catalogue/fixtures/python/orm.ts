import type { PatternFixture } from "@/catalogue/types"

const DATASET = "dataset"

export const datasetFixtures: readonly PatternFixture[] = [
  {
    library: DATASET,
    patternKey: "factory:connect:*",
    matches: [
      "from dataset import connect\n\ndb = connect(\"sqlite:///mydatabase.db\")",
    ],
    rejects: [
      "def connect(*parts, **options):\n    return parts\n\ndb = connect(\"sqlite:///mydatabase.db\")",
    ],
  },
  {
    library: DATASET,
    patternKey: "factory:connect:*>call:query:*",
    matches: [
      "from dataset import connect\n\ndb = connect(\"sqlite:///mydatabase.db\")\n\nrows = db.query(\"SELECT country, COUNT(*) c FROM user GROUP BY country\")",
    ],
    rejects: [
      "db = LocalRegistry()\n\nrows = db.query(\"SELECT country, COUNT(*) c FROM user GROUP BY country\")",
    ],
  },
  {
    library: DATASET,
    patternKey: "factory:connect:*>call:insert:*",
    matches: [
      "from dataset import connect\n\ndb = connect(\"sqlite:///mydatabase.db\")\n\ntable = db[\"user\"]\ntable.insert(dict(name=\"John Doe\"))",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable = db[\"user\"]\ntable.insert(dict(name=\"John Doe\"))",
    ],
  },
  {
    library: DATASET,
    patternKey: "factory:connect:*>call:find:*",
    matches: [
      "from dataset import connect\n\ndb = connect(\"sqlite:///mydatabase.db\")\n\ntable = db[\"user\"]\ntable.find(dict(name=\"John Doe\"))",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable = db[\"user\"]\ntable.find(dict(name=\"John Doe\"))",
    ],
  },
  {
    library: DATASET,
    patternKey: "factory:connect:*>call:find_one:*",
    matches: [
      "from dataset import connect\n\ndb = connect(\"sqlite:///mydatabase.db\")\n\ntable = db[\"user\"]\ntable.find_one(dict(name=\"John Doe\"))",
    ],
    rejects: [
      "table = LocalRegistry()\n\ntable = db[\"user\"]\ntable.find_one(dict(name=\"John Doe\"))",
    ],
  },
]

const DJANGO_MODELS = "Django Models"

export const djangoModelsFixtures: readonly PatternFixture[] = [
  {
    library: DJANGO_MODELS,
    patternKey: "class:Model:*",
    matches: [
      "from django.db.models import Model\n\nclass Person(Model):\n    name = CharField(max_length=30)",
    ],
    rejects: [
      "class Model:\n    pass\n\nclass Person(Model):\n    name = CharField(max_length=30)",
    ],
  },
  {
    library: DJANGO_MODELS,
    patternKey: "class:Model:*>call:filter:*",
    matches: [
      "from django.db.models import Model\n\nclass Person(Model):\n    name = CharField(max_length=30)\n\npeople = Person.objects.filter(name=\"Ada\")",
    ],
    rejects: [
      "Person = LocalRegistry()\n\npeople = Person.objects.filter(name=\"Ada\")",
    ],
  },
  {
    library: DJANGO_MODELS,
    patternKey: "class:Model:*>call:create:*",
    matches: [
      "from django.db.models import Model\n\nclass Person(Model):\n    name = CharField(max_length=30)\n\npeople = Person.objects.create(name=\"Ada\")",
    ],
    rejects: [
      "Person = LocalRegistry()\n\npeople = Person.objects.create(name=\"Ada\")",
    ],
  },
  {
    library: DJANGO_MODELS,
    patternKey: "class:Model:*>call:get_or_create:*",
    matches: [
      "from django.db.models import Model\n\nclass Person(Model):\n    name = CharField(max_length=30)\n\npeople = Person.objects.get_or_create(name=\"Ada\")",
    ],
    rejects: [
      "Person = LocalRegistry()\n\npeople = Person.objects.get_or_create(name=\"Ada\")",
    ],
  },
  {
    library: DJANGO_MODELS,
    patternKey: "class:Model:*>call:bulk_create:*",
    matches: [
      "from django.db.models import Model\n\nclass Person(Model):\n    name = CharField(max_length=30)\n\npeople = Person.objects.bulk_create(name=\"Ada\")",
    ],
    rejects: [
      "Person = LocalRegistry()\n\npeople = Person.objects.bulk_create(name=\"Ada\")",
    ],
  },
  {
    library: DJANGO_MODELS,
    patternKey: "class:Model:*>call:save:*",
    matches: [
      "from django.db.models import Model\n\nclass Person(Model):\n    name = CharField(max_length=30)\n\np = Person(name=\"Ada\")\np.save()",
    ],
    rejects: [
      "p = LocalRegistry()\n\np = Person(name=\"Ada\")\np.save()",
    ],
  },
]

const HOT_REDIS = "hot-redis"

export const hotRedisFixtures: readonly PatternFixture[] = [
  {
    library: HOT_REDIS,
    patternKey: "factory:List:*",
    matches: [
      "from hot_redis import List\n\nmy_list = List(key=\"my_list\")",
    ],
    rejects: [
      "def List(*parts, **options):\n    return parts\n\nmy_list = List(key=\"my_list\")",
    ],
  },
  {
    library: HOT_REDIS,
    patternKey: "factory:Queue:*",
    matches: [
      "from hot_redis import Queue\n\nmy_queue = Queue(key=\"my_queue\")",
    ],
    rejects: [
      "def Queue(*parts, **options):\n    return parts\n\nmy_queue = Queue(key=\"my_queue\")",
    ],
  },
  {
    library: HOT_REDIS,
    patternKey: "call:transaction:*",
    matches: [
      "from hot_redis import transaction\n\nwith transaction():\n    my_list.append(\"x\")",
    ],
    rejects: [
      "def transaction(*parts, **options):\n    return parts\n\nwith transaction():\n    my_list.append(\"x\")",
    ],
  },
]

const MONGOENGINE = "MongoEngine"

export const mongoengineFixtures: readonly PatternFixture[] = [
  {
    library: MONGOENGINE,
    patternKey: "call:connect:*",
    matches: [
      "from mongoengine import connect\n\nconnect(\"tumblelog\")",
    ],
    rejects: [
      "def connect(*parts, **options):\n    return parts\n\nconnect(\"tumblelog\")",
    ],
  },
  {
    library: MONGOENGINE,
    patternKey: "class:Document:*",
    matches: [
      "from mongoengine import Document\n\nclass User(Document):\n    email = StringField(required=True)",
    ],
    rejects: [
      "class Document:\n    pass\n\nclass User(Document):\n    email = StringField(required=True)",
    ],
  },
  {
    library: MONGOENGINE,
    patternKey: "class:Document:*>call:objects:*",
    matches: [
      "from mongoengine import Document\n\nclass User(Document):\n    email = StringField(required=True)\n\nusers = User.objects(email=\"ada@example.com\")",
    ],
    rejects: [
      "User = LocalRegistry()\n\nusers = User.objects(email=\"ada@example.com\")",
    ],
  },
  {
    library: MONGOENGINE,
    patternKey: "class:Document:*>call:save:*",
    matches: [
      "from mongoengine import Document\n\nclass User(Document):\n    email = StringField(required=True)\n\nuser = User(email=\"ada@example.com\")\nuser.save()",
    ],
    rejects: [
      "user = LocalRegistry()\n\nuser = User(email=\"ada@example.com\")\nuser.save()",
    ],
  },
]

const ORATOR = "Orator"

export const oratorFixtures: readonly PatternFixture[] = [
  {
    library: ORATOR,
    patternKey: "factory:DatabaseManager:*",
    matches: [
      "from orator import DatabaseManager\n\ndb = DatabaseManager(config)",
    ],
    rejects: [
      "def DatabaseManager(*parts, **options):\n    return parts\n\ndb = DatabaseManager(config)",
    ],
  },
  {
    library: ORATOR,
    patternKey: "factory:DatabaseManager:*>call:table:*",
    matches: [
      "from orator import DatabaseManager\n\ndb = DatabaseManager(config)\n\nusers = db.table(\"users\").where(\"votes\", \">\", 100).get()",
    ],
    rejects: [
      "db = LocalRegistry()\n\nusers = db.table(\"users\").where(\"votes\", \">\", 100).get()",
    ],
  },
  {
    library: ORATOR,
    patternKey: "class:Model:*",
    matches: [
      "from orator import Model\n\nclass User(Model):\n    __table__ = \"users\"",
    ],
    rejects: [
      "class Model:\n    pass\n\nclass User(Model):\n    __table__ = \"users\"",
    ],
  },
  {
    library: ORATOR,
    patternKey: "class:Model:*>call:find:*",
    matches: [
      "from orator import Model\n\nclass User(Model):\n    __table__ = \"users\"\n\nuser = User.find(1)",
    ],
    rejects: [
      "User = LocalRegistry()\n\nuser = User.find(1)",
    ],
  },
  {
    library: ORATOR,
    patternKey: "class:Model:*>call:where:*",
    matches: [
      "from orator import Model\n\nclass User(Model):\n    __table__ = \"users\"\n\nuser = User.where(1)",
    ],
    rejects: [
      "User = LocalRegistry()\n\nuser = User.where(1)",
    ],
  },
  {
    library: ORATOR,
    patternKey: "class:Model:*>call:all:*",
    matches: [
      "from orator import Model\n\nclass User(Model):\n    __table__ = \"users\"\n\nuser = User.all(1)",
    ],
    rejects: [
      "User = LocalRegistry()\n\nuser = User.all(1)",
    ],
  },
  {
    library: ORATOR,
    patternKey: "class:Model:*>call:destroy:*",
    matches: [
      "from orator import Model\n\nclass User(Model):\n    __table__ = \"users\"\n\nuser = User.destroy(1)",
    ],
    rejects: [
      "User = LocalRegistry()\n\nuser = User.destroy(1)",
    ],
  },
]

const ORM = "orm"

export const ormFixtures: readonly PatternFixture[] = [
  {
    library: ORM,
    patternKey: "class:Model:*",
    matches: [
      "from orm import Model\n\nclass Note(Model):\n    tablename = \"notes\"\n    registry = models\n    fields = {\"id\": Integer(primary_key=True)}",
    ],
    rejects: [
      "class Model:\n    pass\n\nclass Note(Model):\n    tablename = \"notes\"\n    registry = models\n    fields = {\"id\": Integer(primary_key=True)}",
    ],
  },
  {
    library: ORM,
    patternKey: "class:Model:*>call:filter:*",
    matches: [
      "from orm import Model\n\nclass Note(Model):\n    tablename = \"notes\"\n    registry = models\n    fields = {\"id\": Integer(primary_key=True)}\n\nnotes = await Note.objects.filter(completed=True)",
    ],
    rejects: [
      "Note = LocalRegistry()\n\nnotes = await Note.objects.filter(completed=True)",
    ],
  },
  {
    library: ORM,
    patternKey: "class:Model:*>call:create:*",
    matches: [
      "from orm import Model\n\nclass Note(Model):\n    tablename = \"notes\"\n    registry = models\n    fields = {\"id\": Integer(primary_key=True)}\n\nnotes = await Note.objects.create(completed=True)",
    ],
    rejects: [
      "Note = LocalRegistry()\n\nnotes = await Note.objects.create(completed=True)",
    ],
  },
  {
    library: ORM,
    patternKey: "class:Model:*>call:get:*",
    matches: [
      "from orm import Model\n\nclass Note(Model):\n    tablename = \"notes\"\n    registry = models\n    fields = {\"id\": Integer(primary_key=True)}\n\nnotes = await Note.objects.get(completed=True)",
    ],
    rejects: [
      "Note = LocalRegistry()\n\nnotes = await Note.objects.get(completed=True)",
    ],
  },
  {
    library: ORM,
    patternKey: "class:Model:*>call:all:*",
    matches: [
      "from orm import Model\n\nclass Note(Model):\n    tablename = \"notes\"\n    registry = models\n    fields = {\"id\": Integer(primary_key=True)}\n\nnotes = await Note.objects.all(completed=True)",
    ],
    rejects: [
      "Note = LocalRegistry()\n\nnotes = await Note.objects.all(completed=True)",
    ],
  },
]

const PEEWEE = "peewee"

export const peeweeFixtures: readonly PatternFixture[] = [
  {
    library: PEEWEE,
    patternKey: "class:Model:*",
    matches: [
      "from peewee import Model\n\nclass User(Model):\n    username = CharField(unique=True)",
    ],
    rejects: [
      "class Model:\n    pass\n\nclass User(Model):\n    username = CharField(unique=True)",
    ],
  },
  {
    library: PEEWEE,
    patternKey: "class:Model:*>call:create:*",
    matches: [
      "from peewee import Model\n\nclass User(Model):\n    username = CharField(unique=True)\n\nuser = User.create(username=\"charlie\")",
    ],
    rejects: [
      "User = LocalRegistry()\n\nuser = User.create(username=\"charlie\")",
    ],
  },
  {
    library: PEEWEE,
    patternKey: "class:Model:*>call:select:*",
    matches: [
      "from peewee import Model\n\nclass User(Model):\n    username = CharField(unique=True)\n\nuser = User.select(username=\"charlie\")",
    ],
    rejects: [
      "User = LocalRegistry()\n\nuser = User.select(username=\"charlie\")",
    ],
  },
  {
    library: PEEWEE,
    patternKey: "factory:SqliteDatabase:*",
    matches: [
      "from peewee import SqliteDatabase\n\ndb = SqliteDatabase(\"people.db\")",
    ],
    rejects: [
      "def SqliteDatabase(*parts, **options):\n    return parts\n\ndb = SqliteDatabase(\"people.db\")",
    ],
  },
  {
    library: PEEWEE,
    patternKey: "factory:SqliteDatabase:*>call:atomic:*",
    matches: [
      "from peewee import SqliteDatabase\n\ndb = SqliteDatabase(\"people.db\")\n\nwith db.atomic():\n    User.create(username=\"charlie\")",
    ],
    rejects: [
      "db = LocalRegistry()\n\nwith db.atomic():\n    User.create(username=\"charlie\")",
    ],
  },
]

const PONY = "Pony"

export const ponyFixtures: readonly PatternFixture[] = [
  {
    library: PONY,
    patternKey: "factory:Database:*",
    matches: [
      "from pony.orm import Database\n\ndb = Database()",
    ],
    rejects: [
      "def Database(*parts, **options):\n    return parts\n\ndb = Database()",
    ],
  },
  {
    library: PONY,
    patternKey: "factory:Database:*>call:bind:*",
    matches: [
      "from pony.orm import Database\n\ndb = Database()\n\ndb.bind(provider=\"sqlite\", filename=\":memory:\")",
    ],
    rejects: [
      "db = LocalRegistry()\n\ndb.bind(provider=\"sqlite\", filename=\":memory:\")",
    ],
  },
  {
    library: PONY,
    patternKey: "factory:Database:*>call:generate_mapping:*",
    matches: [
      "from pony.orm import Database\n\ndb = Database()\n\ndb.generate_mapping(create_tables=True)",
    ],
    rejects: [
      "db = LocalRegistry()\n\ndb.generate_mapping(create_tables=True)",
    ],
  },
  {
    library: PONY,
    patternKey: "decorator:db_session:*",
    matches: [
      "from pony.orm import db_session\n\n@db_session\ndef print_person_name(person_id):\n    p = Person[person_id]\n    print(p.name)",
    ],
    rejects: [
      "def db_session(*parts, **options):\n    return parts\n\n@db_session\ndef print_person_name(person_id):\n    p = Person[person_id]\n    print(p.name)",
    ],
  },
  {
    library: PONY,
    patternKey: "call:PrimaryKey:*",
    matches: [
      "from pony.orm import Database, PrimaryKey\n\ndb = Database()\n\nclass Person(db.Entity):\n    id = PrimaryKey(int, auto=True)",
    ],
    rejects: [
      "def PrimaryKey(*parts, **options):\n    return parts\n\nclass Person(db.Entity):\n    id = PrimaryKey(int, auto=True)",
    ],
  },
  {
    library: PONY,
    patternKey: "call:Required:*",
    matches: [
      "from pony.orm import Database, Required\n\ndb = Database()\n\nclass Person(db.Entity):\n    name = Required(str)",
    ],
    rejects: [
      "def Required(*parts, **options):\n    return parts\n\nclass Person(db.Entity):\n    name = Required(str)",
    ],
  },
  {
    library: PONY,
    patternKey: "call:Optional:*",
    matches: [
      "from pony.orm import Database, Optional\n\ndb = Database()\n\nclass Person(db.Entity):\n    age = Optional(int)",
    ],
    rejects: [
      "def Optional(*parts, **options):\n    return parts\n\nclass Person(db.Entity):\n    age = Optional(int)",
    ],
  },
  {
    library: PONY,
    patternKey: "call:Set:*",
    matches: [
      "from pony.orm import Database, Set\n\ndb = Database()\n\nclass Person(db.Entity):\n    orders = Set(\"Order\")",
    ],
    rejects: [
      "def Set(*parts, **options):\n    return parts\n\nclass Person(db.Entity):\n    orders = Set(\"Order\")",
    ],
  },
]

const PYDAL = "pyDAL"

export const pydalFixtures: readonly PatternFixture[] = [
  {
    library: PYDAL,
    patternKey: "factory:DAL:*",
    matches: [
      "from pydal import DAL\n\ndb = DAL(\"sqlite://storage.db\")",
    ],
    rejects: [
      "def DAL(*parts, **options):\n    return parts\n\ndb = DAL(\"sqlite://storage.db\")",
    ],
  },
  {
    library: PYDAL,
    patternKey: "factory:DAL:*>call:define_table:*",
    matches: [
      "from pydal import DAL\n\ndb = DAL(\"sqlite://storage.db\")\n\ndb.define_table(\"thing\", Field(\"name\"))",
    ],
    rejects: [
      "db = LocalRegistry()\n\ndb.define_table(\"thing\", Field(\"name\"))",
    ],
  },
  {
    library: PYDAL,
    patternKey: "factory:DAL:*>call:insert:*",
    matches: [
      "from pydal import DAL\n\ndb = DAL(\"sqlite://storage.db\")\n\ndb.thing.insert(name=\"Chair\")",
    ],
    rejects: [
      "db = LocalRegistry()\n\ndb.thing.insert(name=\"Chair\")",
    ],
  },
  {
    library: PYDAL,
    patternKey: "factory:DAL:*>call:commit:*",
    matches: [
      "from pydal import DAL\n\ndb = DAL(\"sqlite://storage.db\")\n\ndb.commit()",
    ],
    rejects: [
      "db = LocalRegistry()\n\ndb.commit()",
    ],
  },
  {
    library: PYDAL,
    patternKey: "factory:DAL:*>called",
    matches: [
      "from pydal import DAL\n\ndb = DAL(\"sqlite://storage.db\")\n\nrows = db(db.thing.name.startswith(\"C\")).select()",
    ],
    rejects: [
      "db = LocalRegistry()\n\nrows = db(db.thing.name.startswith(\"C\")).select()",
    ],
  },
]

const SQLALCHEMY = "SQLAlchemy"

export const sqlalchemyFixtures: readonly PatternFixture[] = [
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)",
    ],
    rejects: [
      "def Session(*parts, **options):\n    return parts\n\nsession = Session(engine)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:execute:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.execute(select(User))",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.execute(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.execute(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:scalars:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.scalars(select(User))",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.scalars(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalars(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:scalar:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.scalar(select(User))",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.scalar(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalar(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:get:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.get(User, 5)",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.get(User, 5)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.get(User, 5)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:add:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.add(user)",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.add(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:add_all:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.add_all([user])",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.add_all([user])",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add_all([user])",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:delete:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.delete(user)",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.delete(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.delete(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:merge:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.merge(user)",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.merge(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.merge(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:flush:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.flush()",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.flush()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.flush()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:refresh:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.refresh(user)",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.refresh(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.refresh(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:commit:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.commit()",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.commit()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.commit()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:rollback:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.rollback()",
      "from sqlalchemy.orm import Session\n\ndef save(user, session: Session):\n    session.rollback()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.rollback()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)",
    ],
    rejects: [
      "def AsyncSession(*parts, **options):\n    return parts\n\nsession = AsyncSession(engine)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:execute:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.execute(select(User))",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.execute(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.execute(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:scalars:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.scalars(select(User))",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.scalars(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalars(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:scalar:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.scalar(select(User))",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.scalar(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalar(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:get:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.get(User, 5)",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.get(User, 5)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.get(User, 5)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:add:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.add(user)",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.add(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:add_all:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.add_all([user])",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.add_all([user])",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add_all([user])",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:delete:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.delete(user)",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.delete(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.delete(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:merge:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.merge(user)",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.merge(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.merge(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:flush:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.flush()",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.flush()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.flush()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:refresh:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.refresh(user)",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.refresh(user)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.refresh(user)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:commit:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.commit()",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.commit()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.commit()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:AsyncSession:*>call:rollback:*",
    matches: [
      "from sqlalchemy.ext.asyncio import AsyncSession\n\nsession = AsyncSession(engine)\n\nsession.rollback()",
      "from sqlalchemy.ext.asyncio import AsyncSession\n\ndef save(user, session: AsyncSession):\n    session.rollback()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.rollback()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "call:select:*",
    matches: [
      "from sqlalchemy import select\n\nstmt = select(User).where(User.name == \"spongebob\")",
    ],
    rejects: [
      "def select(*parts, **options):\n    return parts\n\nstmt = select(User).where(User.name == \"spongebob\")",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "call:text:*",
    matches: [
      "from sqlalchemy import text\n\nstmt = text(\"SELECT x, y FROM some_table\")",
    ],
    rejects: [
      "def text(*parts, **options):\n    return parts\n\nstmt = text(\"SELECT x, y FROM some_table\")",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "class:DeclarativeBase:*",
    matches: [
      "from sqlalchemy.orm import DeclarativeBase\n\nclass Base(DeclarativeBase):\n    pass",
    ],
    rejects: [
      "class DeclarativeBase:\n    pass\n\nclass Base(DeclarativeBase):\n    pass",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "call:declarative_base:*",
    matches: [
      "from sqlalchemy.orm import declarative_base\n\nBase = declarative_base()",
    ],
    rejects: [
      "def declarative_base(*parts, **options):\n    return parts\n\nBase = declarative_base()",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "call:mapped_column:*",
    matches: [
      "from sqlalchemy.orm import mapped_column\n\nclass User(Base):\n    __tablename__ = \"user\"\n\n    id = mapped_column(Integer, primary_key=True)",
    ],
    rejects: [
      "def mapped_column(*parts, **options):\n    return parts\n\nclass User(Base):\n    __tablename__ = \"user\"\n\n    id = mapped_column(Integer, primary_key=True)",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "call:Column:*",
    matches: [
      "from sqlalchemy import Column, Integer\n\nclass User(Base):\n    __tablename__ = \"user\"\n\n    id = Column(Integer, primary_key=True)",
    ],
    rejects: [
      "def Column(*parts, **options):\n    return parts\n\nclass User(Base):\n    __tablename__ = \"user\"\n\n    id = Column(Integer, primary_key=True)",
    ],
  },
]

const SQLMODEL = "SQLModel"

export const sqlmodelFixtures: readonly PatternFixture[] = [
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)",
    ],
    rejects: [
      "def Session(*parts, **options):\n    return parts\n\nsession = Session(engine)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:exec:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.exec(select(Hero))",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.exec(select(Hero))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.exec(select(Hero))",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:execute:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.execute(select(Hero))",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.execute(select(Hero))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.execute(select(Hero))",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:scalars:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.scalars(select(Hero))",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.scalars(select(Hero))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalars(select(Hero))",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:scalar:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.scalar(select(Hero))",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.scalar(select(Hero))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalar(select(Hero))",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:get:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.get(Hero, 1)",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.get(Hero, 1)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.get(Hero, 1)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:add:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.add(hero)",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.add(hero)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add(hero)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:add_all:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.add_all([hero])",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.add_all([hero])",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add_all([hero])",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:delete:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.delete(hero)",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.delete(hero)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.delete(hero)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:merge:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.merge(hero)",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.merge(hero)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.merge(hero)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:flush:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.flush()",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.flush()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.flush()",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:refresh:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.refresh(hero)",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.refresh(hero)",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.refresh(hero)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:commit:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.commit()",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.commit()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.commit()",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "factory:Session:*>call:rollback:*",
    matches: [
      "from sqlmodel import Session\n\nsession = Session(engine)\n\nsession.rollback()",
      "from sqlmodel import Session\n\ndef save(hero, session: Session):\n    session.rollback()",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.rollback()",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "call:select:*",
    matches: [
      "from sqlmodel import select\n\nstatement = select(Hero).where(Hero.name == \"Deadpond\")",
    ],
    rejects: [
      "def select(*parts):\n    return parts\n\nstatement = select(Hero)",
    ],
  },
  {
    library: SQLMODEL,
    patternKey: "class:SQLModel:*",
    matches: [
      "from sqlmodel import SQLModel\n\nclass Hero(SQLModel, table=True):\n    name: str",
    ],
    rejects: [
      "class SQLModel:\n    pass\n\nclass Hero(SQLModel, table=True):\n    name: str",
    ],
  },
]
