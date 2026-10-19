import type { PatternFixture } from "@/catalogue/types"

const LOGBOOK = "Logbook"

export const logbookFixtures: readonly PatternFixture[] = [
  {
    library: LOGBOOK,
    patternKey: "factory:Logger:*",
    matches: [
      "from logbook import Logger\n\nlog = Logger(\"My Awesome Logger\")",
    ],
    rejects: [
      "def Logger(*parts, **options):\n    return parts\n\nlog = Logger(\"My Awesome Logger\")",
    ],
  },
  {
    library: LOGBOOK,
    patternKey: "factory:Logger:*>call:info:*",
    matches: [
      "from logbook import Logger\n\nlog = Logger(\"My Awesome Logger\")\n\nlog.info(\"Hello World\")",
    ],
    rejects: [
      "log = LocalRegistry()\n\nlog.info(\"Hello World\")",
    ],
  },
  {
    library: LOGBOOK,
    patternKey: "factory:Logger:*>call:error:*",
    matches: [
      "from logbook import Logger\n\nlog = Logger(\"My Awesome Logger\")\n\nlog.error(\"Hello World\")",
    ],
    rejects: [
      "log = LocalRegistry()\n\nlog.error(\"Hello World\")",
    ],
  },
  {
    library: LOGBOOK,
    patternKey: "factory:StderrHandler:*",
    matches: [
      "from logbook import StderrHandler\n\nhandler = StderrHandler()",
    ],
    rejects: [
      "def StderrHandler(*parts, **options):\n    return parts\n\nhandler = StderrHandler()",
    ],
  },
  {
    library: LOGBOOK,
    patternKey: "factory:StderrHandler:*>call:push_application:*",
    matches: [
      "from logbook import StderrHandler\n\nhandler = StderrHandler()\n\nhandler.push_application()",
    ],
    rejects: [
      "handler = LocalRegistry()\n\nhandler.push_application()",
    ],
  },
]

const LOGURU = "Loguru"

export const loguruFixtures: readonly PatternFixture[] = [
  {
    library: LOGURU,
    patternKey: "call:logger.info:*",
    matches: [
      "from loguru import logger\n\nlogger.info(\"That is it, beautiful and simple logging!\")",
    ],
    rejects: [
      "logger = LocalRegistry()\n\nlogger.info(\"That is it, beautiful and simple logging!\")",
    ],
  },
  {
    library: LOGURU,
    patternKey: "call:logger.debug:*",
    matches: [
      "from loguru import logger\n\nlogger.debug(\"That is it, beautiful and simple logging!\")",
    ],
    rejects: [
      "logger = LocalRegistry()\n\nlogger.debug(\"That is it, beautiful and simple logging!\")",
    ],
  },
  {
    library: LOGURU,
    patternKey: "call:logger.exception:*",
    matches: [
      "from loguru import logger\n\nlogger.exception(\"That is it, beautiful and simple logging!\")",
    ],
    rejects: [
      "logger = LocalRegistry()\n\nlogger.exception(\"That is it, beautiful and simple logging!\")",
    ],
  },
  {
    library: LOGURU,
    patternKey: "call:logger.add:*",
    matches: [
      "from loguru import logger\n\nlogger.add(\"file_{time}.log\", rotation=\"500 MB\")",
    ],
    rejects: [
      "logger = LocalRegistry()\n\nlogger.add(\"file_{time}.log\", rotation=\"500 MB\")",
    ],
  },
  {
    library: LOGURU,
    patternKey: "call:logger.bind:*",
    matches: [
      "from loguru import logger\n\ncontext_logger = logger.bind(ip=\"192.168.0.1\", user=\"someone\")",
    ],
    rejects: [
      "logger = LocalRegistry()\n\ncontext_logger = logger.bind(ip=\"192.168.0.1\", user=\"someone\")",
    ],
  },
  {
    library: LOGURU,
    patternKey: "decorator:logger.catch:*",
    matches: [
      "from loguru import logger\n\n@logger.catch\ndef my_function(x, y, z):\n    return 1 / (x + y + z)",
    ],
    rejects: [
      "logger = LocalRegistry()\n\n@logger.catch\ndef my_function(x, y, z):\n    return 1 / (x + y + z)",
    ],
  },
]

const SENTRY_PYTHON = "sentry-python"

export const sentryPythonFixtures: readonly PatternFixture[] = [
  {
    library: SENTRY_PYTHON,
    patternKey: "call:init:*",
    matches: [
      "from sentry_sdk import init\n\ninit(dsn=\"https://examplePublicKey@o0.ingest.sentry.io/0\", traces_sample_rate=1.0)",
    ],
    rejects: [
      "def init(*parts, **options):\n    return parts\n\ninit(dsn=\"https://examplePublicKey@o0.ingest.sentry.io/0\", traces_sample_rate=1.0)",
    ],
  },
  {
    library: SENTRY_PYTHON,
    patternKey: "call:capture_exception:*",
    matches: [
      "from sentry_sdk import capture_exception\n\ncapture_exception(error)",
    ],
    rejects: [
      "def capture_exception(*parts, **options):\n    return parts\n\ncapture_exception(error)",
    ],
  },
  {
    library: SENTRY_PYTHON,
    patternKey: "call:capture_message:*",
    matches: [
      "from sentry_sdk import capture_message\n\ncapture_message(\"Something went wrong\")",
    ],
    rejects: [
      "def capture_message(*parts, **options):\n    return parts\n\ncapture_message(\"Something went wrong\")",
    ],
  },
  {
    library: SENTRY_PYTHON,
    patternKey: "call:set_tag:*",
    matches: [
      "from sentry_sdk import set_tag\n\nset_tag(\"page_locale\", \"de-at\")",
    ],
    rejects: [
      "def set_tag(*parts, **options):\n    return parts\n\nset_tag(\"page_locale\", \"de-at\")",
    ],
  },
  {
    library: SENTRY_PYTHON,
    patternKey: "call:add_breadcrumb:*",
    matches: [
      "from sentry_sdk import add_breadcrumb\n\nadd_breadcrumb(category=\"auth\", message=\"Authenticated user\", level=\"info\")",
    ],
    rejects: [
      "def add_breadcrumb(*parts, **options):\n    return parts\n\nadd_breadcrumb(category=\"auth\", message=\"Authenticated user\", level=\"info\")",
    ],
  },
]

const STRUCTLOG = "structlog"

export const structlogFixtures: readonly PatternFixture[] = [
  {
    library: STRUCTLOG,
    patternKey: "factory:get_logger:*",
    matches: [
      "from structlog import get_logger\n\nlog = get_logger()",
    ],
    rejects: [
      "def get_logger(*parts, **options):\n    return parts\n\nlog = get_logger()",
    ],
  },
  {
    library: STRUCTLOG,
    patternKey: "factory:get_logger:*>call:info:*",
    matches: [
      "from structlog import get_logger\n\nlog = get_logger()\n\nlog.info(\"key_value_logging\", out_of_the_box=True, effort=0)",
    ],
    rejects: [
      "log = LocalRegistry()\n\nlog.info(\"key_value_logging\", out_of_the_box=True, effort=0)",
    ],
  },
  {
    library: STRUCTLOG,
    patternKey: "factory:get_logger:*>call:bind:*",
    matches: [
      "from structlog import get_logger\n\nlog = get_logger()\n\nlog = log.bind(user=\"anonymous\", some_key=23)",
    ],
    rejects: [
      "log = LocalRegistry()\n\nlog = log.bind(user=\"anonymous\", some_key=23)",
    ],
  },
  {
    library: STRUCTLOG,
    patternKey: "call:configure:*",
    matches: [
      "from structlog import configure\n\nconfigure(processors=[processors.KeyValueRenderer()])",
    ],
    rejects: [
      "def configure(*parts, **options):\n    return parts\n\nconfigure(processors=[processors.KeyValueRenderer()])",
    ],
  },
]

const OPENTELEMETRY_PYTHON = "opentelemetry-python"

export const opentelemetryPythonFixtures: readonly PatternFixture[] = [
  {
    library: OPENTELEMETRY_PYTHON,
    patternKey: "factory:get_tracer:*",
    matches: [
      "from opentelemetry import trace\n\ntracer = trace.get_tracer(__name__)",
      "from opentelemetry.trace import get_tracer\n\ntracer = get_tracer(__name__)",
    ],
    rejects: [
      "def get_tracer(*parts, **options):\n    return parts\n\ntracer = get_tracer(__name__)",
    ],
  },
  {
    library: OPENTELEMETRY_PYTHON,
    patternKey: "factory:get_tracer:*>call:start_as_current_span:*",
    matches: [
      "from opentelemetry import trace\n\ntracer = trace.get_tracer(__name__)\n\nwith tracer.start_as_current_span(\"foo\"):\n    print(\"Hello world from OpenTelemetry Python!\")",
    ],
    rejects: [
      "tracer = LocalRegistry()\n\nwith tracer.start_as_current_span(\"foo\"):\n    print(\"Hello world from OpenTelemetry Python!\")",
    ],
  },
  {
    library: OPENTELEMETRY_PYTHON,
    patternKey: "factory:get_tracer:*>decorator:start_as_current_span:*",
    matches: [
      "from opentelemetry import trace\n\ntracer = trace.get_tracer(__name__)\n\n@tracer.start_as_current_span(\"do_work\")\ndef do_work():\n    print(\"doing some work...\")",
    ],
    rejects: [
      "tracer = LocalRegistry()\n\n@tracer.start_as_current_span(\"do_work\")\ndef do_work():\n    print(\"doing some work...\")",
    ],
  },
  {
    library: OPENTELEMETRY_PYTHON,
    patternKey: "call:set_tracer_provider:*",
    matches: [
      "from opentelemetry import trace\n\ntrace.set_tracer_provider(provider)",
    ],
    rejects: [
      "trace = LocalRegistry()\n\ntrace.set_tracer_provider(provider)",
    ],
  },
]
