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
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.scalars(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:get:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.get(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.get(select(User))",
    ],
  },
  {
    library: SQLALCHEMY,
    patternKey: "factory:Session:*>call:add:*",
    matches: [
      "from sqlalchemy.orm import Session\n\nsession = Session(engine)\n\nsession.add(select(User))",
    ],
    rejects: [
      "session = LocalRegistry()\n\nsession.add(select(User))",
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
