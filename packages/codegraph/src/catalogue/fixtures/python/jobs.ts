import type { PatternFixture } from "@/catalogue/types"

const AIRFLOW = "Airflow"

export const airflowFixtures: readonly PatternFixture[] = [
  {
    library: AIRFLOW,
    patternKey: "factory:DAG:*",
    matches: [
      "from airflow.sdk import DAG\n\ndag = DAG(\"tutorial\", schedule=\"@daily\")",
    ],
    rejects: [
      "def DAG(*parts, **options):\n    return parts\n\ndag = DAG(\"tutorial\", schedule=\"@daily\")",
    ],
  },
  {
    library: AIRFLOW,
    patternKey: "decorator:task:*",
    matches: [
      "from airflow.sdk import task\n\n@task\ndef airflow():\n    print(\"airflow\")",
    ],
    rejects: [
      "def task(*parts, **options):\n    return parts\n\n@task\ndef airflow():\n    print(\"airflow\")",
    ],
  },
]

const APSCHEDULER = "APScheduler"

export const apschedulerFixtures: readonly PatternFixture[] = [
  {
    library: APSCHEDULER,
    patternKey: "factory:Scheduler:*",
    matches: [
      "from apscheduler import Scheduler\n\nscheduler = Scheduler()",
    ],
    rejects: [
      "def Scheduler(*parts, **options):\n    return parts\n\nscheduler = Scheduler()",
    ],
  },
  {
    library: APSCHEDULER,
    patternKey: "factory:Scheduler:*>call:add_schedule:*",
    matches: [
      "from apscheduler import Scheduler\n\nscheduler = Scheduler()\n\nscheduler.add_schedule(tick, IntervalTrigger(seconds=1))",
    ],
    rejects: [
      "scheduler = LocalRegistry()\n\nscheduler.add_schedule(tick, IntervalTrigger(seconds=1))",
    ],
  },
  {
    library: APSCHEDULER,
    patternKey: "factory:Scheduler:*>call:add_job:*",
    matches: [
      "from apscheduler import Scheduler\n\nscheduler = Scheduler()\n\nscheduler.add_job(tick)",
    ],
    rejects: [
      "scheduler = LocalRegistry()\n\nscheduler.add_job(tick)",
    ],
  },
  {
    library: APSCHEDULER,
    patternKey: "factory:Scheduler:*>call:start_in_background:*",
    matches: [
      "from apscheduler import Scheduler\n\nscheduler = Scheduler()\n\nscheduler.start_in_background()",
    ],
    rejects: [
      "scheduler = LocalRegistry()\n\nscheduler.start_in_background()",
    ],
  },
  {
    library: APSCHEDULER,
    patternKey: "factory:AsyncScheduler:*",
    matches: [
      "from apscheduler import AsyncScheduler\n\nscheduler = AsyncScheduler()",
    ],
    rejects: [
      "def AsyncScheduler(*parts, **options):\n    return parts\n\nscheduler = AsyncScheduler()",
    ],
  },
  {
    library: APSCHEDULER,
    patternKey: "factory:AsyncScheduler:*>call:add_schedule:*",
    matches: [
      "from apscheduler import AsyncScheduler\n\nscheduler = AsyncScheduler()\n\nawait scheduler.add_schedule(tick, IntervalTrigger(seconds=1))",
    ],
    rejects: [
      "scheduler = LocalRegistry()\n\nawait scheduler.add_schedule(tick, IntervalTrigger(seconds=1))",
    ],
  },
]

const CEMENT = "Cement"

export const cementFixtures: readonly PatternFixture[] = [
  {
    library: CEMENT,
    patternKey: "decorator:ex:*",
    matches: [
      "from cement import ex\n\nclass Base(Controller):\n    @ex(help=\"example sub-command\")\n    def cmd1(self):\n        print(\"Inside Base.cmd1()\")",
    ],
    rejects: [
      "def ex(*parts, **options):\n    return parts\n\nclass Base(Controller):\n    @ex(help=\"example sub-command\")\n    def cmd1(self):\n        print(\"Inside Base.cmd1()\")",
    ],
  },
  {
    library: CEMENT,
    patternKey: "class:App:*",
    matches: [
      "from cement import App\n\nclass MyApp(App):\n    class Meta:\n        label = \"myapp\"",
    ],
    rejects: [
      "class App:\n    pass\n\nclass MyApp(App):\n    class Meta:\n        label = \"myapp\"",
    ],
  },
]

const CLICK = "Click"

export const clickFixtures: readonly PatternFixture[] = [
  {
    library: CLICK,
    patternKey: "decorator:command:*",
    matches: [
      "from click import command\n\n@command()\ndef hello():\n    echo(\"Hello\")",
    ],
    rejects: [
      "def command(*parts, **options):\n    return parts\n\n@command()\ndef hello():\n    echo(\"Hello\")",
    ],
  },
  {
    library: CLICK,
    patternKey: "decorator:option:*",
    matches: [
      "from click import option\n\n@command()\n@option(\"--count\", default=1, help=\"Number of greetings.\")\ndef hello(count):\n    echo(count)",
    ],
    rejects: [
      "def option(*parts, **options):\n    return parts\n\n@command()\n@option(\"--count\", default=1, help=\"Number of greetings.\")\ndef hello(count):\n    echo(count)",
    ],
  },
  {
    library: CLICK,
    patternKey: "decorator:argument:*",
    matches: [
      "from click import argument\n\n@command()\n@argument(\"name\")\ndef hello(name):\n    echo(name)",
    ],
    rejects: [
      "def argument(*parts, **options):\n    return parts\n\n@command()\n@argument(\"name\")\ndef hello(name):\n    echo(name)",
    ],
  },
  {
    library: CLICK,
    patternKey: "call:echo:*",
    matches: [
      "from click import echo\n\necho(\"Hello\")",
    ],
    rejects: [
      "def echo(*parts, **options):\n    return parts\n\necho(\"Hello\")",
    ],
  },
]

const CLIFF = "cliff"

export const cliffFixtures: readonly PatternFixture[] = [
  {
    library: CLIFF,
    patternKey: "class:Command:*",
    matches: [
      "from cliff.command import Command\n\nclass Simple(Command):\n    def take_action(self, parsed_args):\n        self.log.info(\"sending greeting\")",
    ],
    rejects: [
      "class Command:\n    pass\n\nclass Simple(Command):\n    def take_action(self, parsed_args):\n        self.log.info(\"sending greeting\")",
    ],
  },
]

const JOBLIB = "Joblib"

export const joblibFixtures: readonly PatternFixture[] = [
  {
    library: JOBLIB,
    patternKey: "call:delayed:*",
    matches: [
      "from joblib import delayed\n\nresults = Parallel(n_jobs=2)(delayed(sqrt)(i ** 2) for i in range(10))",
    ],
    rejects: [
      "def delayed(*parts, **options):\n    return parts\n\nresults = Parallel(n_jobs=2)(delayed(sqrt)(i ** 2) for i in range(10))",
    ],
  },
  {
    library: JOBLIB,
    patternKey: "factory:Memory:*",
    matches: [
      "from joblib import Memory\n\nmemory = Memory(\"./cachedir\", verbose=0)",
    ],
    rejects: [
      "def Memory(*parts, **options):\n    return parts\n\nmemory = Memory(\"./cachedir\", verbose=0)",
    ],
  },
  {
    library: JOBLIB,
    patternKey: "factory:Memory:*>decorator:cache:*",
    matches: [
      "from joblib import Memory\n\nmemory = Memory(\"./cachedir\", verbose=0)\n\n@memory.cache\ndef costly_compute(data):\n    return data",
    ],
    rejects: [
      "memory = LocalRegistry()\n\n@memory.cache\ndef costly_compute(data):\n    return data",
    ],
  },
  {
    library: JOBLIB,
    patternKey: "call:dump:*",
    matches: [
      "from joblib import dump\n\ndump(model, \"model.joblib\")",
    ],
    rejects: [
      "def dump(*parts, **options):\n    return parts\n\ndump(model, \"model.joblib\")",
    ],
  },
  {
    library: JOBLIB,
    patternKey: "call:load:*",
    matches: [
      "from joblib import load\n\nmodel = load(\"model.joblib\")",
    ],
    rejects: [
      "def load(*parts, **options):\n    return parts\n\nmodel = load(\"model.joblib\")",
    ],
  },
]

const PLAN = "Plan"

export const planFixtures: readonly PatternFixture[] = [
  {
    library: PLAN,
    patternKey: "factory:Plan:*",
    matches: [
      "from plan import Plan\n\ncron = Plan()",
    ],
    rejects: [
      "def Plan(*parts, **options):\n    return parts\n\ncron = Plan()",
    ],
  },
  {
    library: PLAN,
    patternKey: "factory:Plan:*>call:command:*",
    matches: [
      "from plan import Plan\n\ncron = Plan()\n\ncron.command(\"ls /tmp\", every=\"1.day\", at=\"12:00\")",
    ],
    rejects: [
      "cron = LocalRegistry()\n\ncron.command(\"ls /tmp\", every=\"1.day\", at=\"12:00\")",
    ],
  },
  {
    library: PLAN,
    patternKey: "factory:Plan:*>call:run:*",
    matches: [
      "from plan import Plan\n\ncron = Plan()\n\ncron.run()",
    ],
    rejects: [
      "cron = LocalRegistry()\n\ncron.run()",
    ],
  },
]

const SCHEDULE = "schedule"

export const scheduleFixtures: readonly PatternFixture[] = [
  {
    library: SCHEDULE,
    patternKey: "call:every:*",
    matches: [
      "from schedule import every\n\nevery(10).minutes.do(job)",
    ],
    rejects: [
      "def every(*parts, **options):\n    return parts\n\nevery(10).minutes.do(job)",
    ],
  },
  {
    library: SCHEDULE,
    patternKey: "call:run_pending:*",
    matches: [
      "from schedule import run_pending\n\nrun_pending()",
    ],
    rejects: [
      "def run_pending(*parts, **options):\n    return parts\n\nrun_pending()",
    ],
  },
  {
    library: SCHEDULE,
    patternKey: "decorator:repeat:*",
    matches: [
      "from schedule import repeat\n\n@repeat(every(10).minutes)\ndef job():\n    print(\"I am a scheduled job\")",
    ],
    rejects: [
      "def repeat(*parts, **options):\n    return parts\n\n@repeat(every(10).minutes)\ndef job():\n    print(\"I am a scheduled job\")",
    ],
  },
]

const SPIFFWORKFLOW = "SpiffWorkflow"

export const spiffworkflowFixtures: readonly PatternFixture[] = [
  {
    library: SPIFFWORKFLOW,
    patternKey: "factory:BpmnParser:*",
    matches: [
      "from SpiffWorkflow.bpmn.parser import BpmnParser\n\nparser = BpmnParser()",
    ],
    rejects: [
      "def BpmnParser(*parts, **options):\n    return parts\n\nparser = BpmnParser()",
    ],
  },
  {
    library: SPIFFWORKFLOW,
    patternKey: "factory:BpmnParser:*>call:get_collaboration:*",
    matches: [
      "from SpiffWorkflow.bpmn.parser import BpmnParser\n\nparser = BpmnParser()\n\nspec, dependencies = parser.get_collaboration(\"my_collaboration\")",
    ],
    rejects: [
      "parser = LocalRegistry()\n\nspec, dependencies = parser.get_collaboration(\"my_collaboration\")",
    ],
  },
]

const TASKFLOW = "TaskFlow"

export const taskflowFixtures: readonly PatternFixture[] = [
  {
    library: TASKFLOW,
    patternKey: "class:Task:*",
    matches: [
      "from taskflow.task import Task\n\nclass CallJim(Task):\n    def execute(self, jim_number, *args, **kwargs):\n        print(\"Calling jim %s.\" % jim_number)",
    ],
    rejects: [
      "class Task:\n    pass\n\nclass CallJim(Task):\n    def execute(self, jim_number, *args, **kwargs):\n        print(\"Calling jim %s.\" % jim_number)",
    ],
  },
  {
    library: TASKFLOW,
    patternKey: "call:run:*",
    matches: [
      "from taskflow.engines import run\n\nrun(flow, store=dict(joe_number=444, jim_number=555))",
    ],
    rejects: [
      "def run(*parts, **options):\n    return parts\n\nrun(flow, store=dict(joe_number=444, jim_number=555))",
    ],
  },
]
