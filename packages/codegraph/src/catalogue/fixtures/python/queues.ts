import type { PatternFixture } from "@/catalogue/types"

const CELERY = "Celery"

export const celeryFixtures: readonly PatternFixture[] = [
  {
    library: CELERY,
    patternKey: "factory:Celery:*",
    matches: [
      "from celery import Celery\n\napp = Celery(\"tasks\", broker=\"pyamqp://guest@localhost//\")",
    ],
    rejects: [
      "def Celery(*parts, **options):\n    return parts\n\napp = Celery(\"tasks\", broker=\"pyamqp://guest@localhost//\")",
    ],
  },
  {
    library: CELERY,
    patternKey: "factory:Celery:*>decorator:task:*",
    matches: [
      "from celery import Celery\n\napp = Celery(\"tasks\", broker=\"pyamqp://guest@localhost//\")\n\n@app.task\ndef add(x, y):\n    return x + y",
    ],
    rejects: [
      "app = LocalRegistry()\n\n@app.task\ndef add(x, y):\n    return x + y",
    ],
  },
  {
    library: CELERY,
    patternKey: "factory:Celery:*>call:add_periodic_task:*",
    matches: [
      "from celery import Celery\n\napp = Celery(\"tasks\", broker=\"pyamqp://guest@localhost//\")\n\napp.add_periodic_task(10.0, test.s(\"hello\"), name=\"add every 10\")",
    ],
    rejects: [
      "app = LocalRegistry()\n\napp.add_periodic_task(10.0, test.s(\"hello\"), name=\"add every 10\")",
    ],
  },
  {
    library: CELERY,
    patternKey: "decorator:shared_task:*",
    matches: [
      "from celery import shared_task\n\n@shared_task\ndef add(x, y):\n    return x + y",
    ],
    rejects: [
      "def shared_task(*parts, **options):\n    return parts\n\n@shared_task\ndef add(x, y):\n    return x + y",
    ],
  },
]

const HUEY = "huey"

export const hueyFixtures: readonly PatternFixture[] = [
  {
    library: HUEY,
    patternKey: "factory:RedisHuey:*",
    matches: [
      "from huey import RedisHuey\n\nhuey = RedisHuey(\"my-app\", host=\"redis.myapp.com\")",
    ],
    rejects: [
      "def RedisHuey(*parts, **options):\n    return parts\n\nhuey = RedisHuey(\"my-app\", host=\"redis.myapp.com\")",
    ],
  },
  {
    library: HUEY,
    patternKey: "factory:RedisHuey:*>decorator:task:*",
    matches: [
      "from huey import RedisHuey\n\nhuey = RedisHuey(\"my-app\", host=\"redis.myapp.com\")\n\n@huey.task()\ndef add_numbers(a, b):\n    return a + b",
    ],
    rejects: [
      "huey = LocalRegistry()\n\n@huey.task()\ndef add_numbers(a, b):\n    return a + b",
    ],
  },
  {
    library: HUEY,
    patternKey: "factory:RedisHuey:*>decorator:periodic_task:*",
    matches: [
      "from huey import RedisHuey\n\nhuey = RedisHuey(\"my-app\", host=\"redis.myapp.com\")\n\n@huey.periodic_task(crontab(minute=\"0\", hour=\"3\"))\ndef nightly_backup():\n    sync_all_data()",
    ],
    rejects: [
      "huey = LocalRegistry()\n\n@huey.periodic_task(crontab(minute=\"0\", hour=\"3\"))\ndef nightly_backup():\n    sync_all_data()",
    ],
  },
]

const KAFKA_PYTHON = "kafka-python"

export const kafkaPythonFixtures: readonly PatternFixture[] = [
  {
    library: KAFKA_PYTHON,
    patternKey: "factory:KafkaProducer:*",
    matches: [
      "from kafka import KafkaProducer\n\nproducer = KafkaProducer(bootstrap_servers=\"localhost:9092\")",
    ],
    rejects: [
      "def KafkaProducer(*parts, **options):\n    return parts\n\nproducer = KafkaProducer(bootstrap_servers=\"localhost:9092\")",
    ],
  },
  {
    library: KAFKA_PYTHON,
    patternKey: "factory:KafkaProducer:*>call:send:*",
    matches: [
      "from kafka import KafkaProducer\n\nproducer = KafkaProducer(bootstrap_servers=\"localhost:9092\")\n\nproducer.send(\"my_topic\", b\"raw_bytes\")",
    ],
    rejects: [
      "producer = LocalRegistry()\n\nproducer.send(\"my_topic\", b\"raw_bytes\")",
    ],
  },
  {
    library: KAFKA_PYTHON,
    patternKey: "factory:KafkaProducer:*>call:flush:*",
    matches: [
      "from kafka import KafkaProducer\n\nproducer = KafkaProducer(bootstrap_servers=\"localhost:9092\")\n\nproducer.flush()",
    ],
    rejects: [
      "producer = LocalRegistry()\n\nproducer.flush()",
    ],
  },
  {
    library: KAFKA_PYTHON,
    patternKey: "factory:KafkaConsumer:*",
    matches: [
      "from kafka import KafkaConsumer\n\nconsumer = KafkaConsumer(\"my_topic\", group_id=\"my_group\")",
    ],
    rejects: [
      "def KafkaConsumer(*parts, **options):\n    return parts\n\nconsumer = KafkaConsumer(\"my_topic\", group_id=\"my_group\")",
    ],
  },
  {
    library: KAFKA_PYTHON,
    patternKey: "factory:KafkaConsumer:*>call:subscribe:*",
    matches: [
      "from kafka import KafkaConsumer\n\nconsumer = KafkaConsumer(\"my_topic\", group_id=\"my_group\")\n\nconsumer.subscribe([\"my_topic\"])",
    ],
    rejects: [
      "consumer = LocalRegistry()\n\nconsumer.subscribe([\"my_topic\"])",
    ],
  },
]

const MRQ = "MRQ"

export const mrqFixtures: readonly PatternFixture[] = [
  {
    library: MRQ,
    patternKey: "class:Task:*",
    matches: [
      "from mrq.task import Task\n\nclass Fetch(Task):\n    def run(self, params):\n        return len(params[\"url\"])",
    ],
    rejects: [
      "class Task:\n    pass\n\nclass Fetch(Task):\n    def run(self, params):\n        return len(params[\"url\"])",
    ],
  },
]

const RQ = "RQ"

export const rqFixtures: readonly PatternFixture[] = [
  {
    library: RQ,
    patternKey: "factory:Queue:*",
    matches: [
      "from rq import Queue\n\nqueue = Queue(connection=Redis())",
    ],
    rejects: [
      "def Queue(*parts, **options):\n    return parts\n\nqueue = Queue(connection=Redis())",
    ],
  },
  {
    library: RQ,
    patternKey: "factory:Queue:*>call:enqueue:*",
    matches: [
      "from rq import Queue\n\nqueue = Queue(connection=Redis())\n\njob = queue.enqueue(count_words_at_url, \"http://nvie.com\")",
    ],
    rejects: [
      "queue = LocalRegistry()\n\njob = queue.enqueue(count_words_at_url, \"http://nvie.com\")",
    ],
  },
  {
    library: RQ,
    patternKey: "decorator:job:*",
    matches: [
      "from rq import job\n\n@job(\"low\", connection=my_redis_conn, timeout=5)\ndef add(x, y):\n    return x + y",
    ],
    rejects: [
      "def job(*parts, **options):\n    return parts\n\n@job(\"low\", connection=my_redis_conn, timeout=5)\ndef add(x, y):\n    return x + y",
    ],
  },
]
