import type { PatternFixture } from "@/catalogue/types"

const RETURNS = "returns"

export const returnsFixtures: readonly PatternFixture[] = [
  {
    library: RETURNS,
    patternKey: "decorator:safe:*",
    matches: [
      "from returns.result import safe\n\n@safe\ndef divide(number: int) -> float:\n    return number / number",
      "from returns.result import safe\n\n@safe(exceptions=(ZeroDivisionError,))\ndef divide(number: int) -> float:\n    return number / number",
    ],
    rejects: [
      "def safe(function):\n    return function\n\n@safe\ndef divide(number: int) -> float:\n    return number / number",
    ],
  },
  {
    library: RETURNS,
    patternKey: "decorator:attempt:*",
    matches: [
      "from returns.result import attempt\n\n@attempt\ndef divide_itself(number: int) -> float:\n    return number / number",
    ],
    rejects: [
      "def attempt(function):\n    return function\n\n@attempt\ndef divide_itself(number: int) -> float:\n    return number / number",
    ],
  },
  {
    library: RETURNS,
    patternKey: "decorator:future_safe:*",
    matches: [
      "from returns.future import future_safe\n\n@future_safe\nasync def fetch_user(user_id: int) -> dict:\n    return await client.get_user(user_id)",
    ],
    rejects: [
      "def future_safe(function):\n    return function\n\n@future_safe\nasync def fetch_user(user_id: int) -> dict:\n    return await client.get_user(user_id)",
    ],
  },
  {
    library: RETURNS,
    patternKey: "call:Failure:*",
    matches: [
      "from returns.result import Failure, Success\n\ndef find_user(user_id: int):\n    return Failure(\"User was not found\")",
    ],
    rejects: [
      "def Failure(error):\n    return error\n\ndef find_user(user_id: int):\n    return Failure(\"User was not found\")",
    ],
  },
]

const TENACITY = "Tenacity"

export const tenacityFixtures: readonly PatternFixture[] = [
  {
    library: TENACITY,
    patternKey: "decorator:retry:*",
    matches: [
      "from tenacity import retry, stop_after_attempt\n\n@retry(stop=stop_after_attempt(3), before_sleep=reconnect, retry_error_callback=return_last_value)\ndef fetch_orders():\n    return client.get(\"/orders\")",
      "from tenacity import retry\n\n@retry(before=log_attempt, after=log_elapsed)\ndef fetch_orders():\n    return client.get(\"/orders\")",
    ],
    rejects: [
      "def retry(*parts, **options):\n    return parts\n\n@retry(stop=stop_after_attempt(3), before_sleep=reconnect, retry_error_callback=return_last_value)\ndef fetch_orders():\n    return client.get(\"/orders\")",
    ],
  },
  {
    library: TENACITY,
    patternKey: "factory:Retrying:*",
    matches: [
      "from tenacity import Retrying, stop_after_attempt\n\nretryer = Retrying(stop=stop_after_attempt(3), reraise=True, before_sleep=reconnect)",
    ],
    rejects: [
      "def Retrying(*parts, **options):\n    return parts\n\nretryer = Retrying(stop=stop_after_attempt(3), reraise=True, before_sleep=reconnect)",
    ],
  },
  {
    library: TENACITY,
    patternKey: "factory:Retrying:*>called",
    matches: [
      "from tenacity import Retrying, stop_after_attempt\n\nretryer = Retrying(stop=stop_after_attempt(3), reraise=True)\nretryer(never_good_enough, \"I really do try\")",
    ],
    rejects: [
      "retryer = LocalRegistry()\nretryer(never_good_enough, \"I really do try\")",
    ],
  },
  {
    library: TENACITY,
    patternKey: "factory:AsyncRetrying:*",
    matches: [
      "from tenacity import AsyncRetrying, stop_after_attempt\n\nasync def fetch_orders():\n    async for attempt in AsyncRetrying(stop=stop_after_attempt(3), after=log_elapsed):\n        with attempt:\n            return await client.get(\"/orders\")",
    ],
    rejects: [
      "def AsyncRetrying(*parts, **options):\n    return parts\n\nasync def fetch_orders():\n    async for attempt in AsyncRetrying(stop=stop_after_attempt(3), after=log_elapsed):\n        with attempt:\n            return await client.get(\"/orders\")",
    ],
  },
]

const BACKOFF = "backoff"

export const backoffFixtures: readonly PatternFixture[] = [
  {
    library: BACKOFF,
    patternKey: "decorator:on_exception:*",
    matches: [
      "import backoff\n\n@backoff.on_exception(backoff.expo, requests.exceptions.RequestException, max_time=300, giveup=fatal_code)\ndef get_url(url):\n    return requests.get(url)",
      "import backoff\n\n@backoff.on_exception(backoff.expo, ValueError, on_success=report_success, on_backoff=report_backoff, on_giveup=report_giveup)\ndef get_url(url):\n    return requests.get(url)",
    ],
    rejects: [
      "backoff = LocalRegistry()\n\n@backoff.on_exception(backoff.expo, requests.exceptions.RequestException, max_time=300, giveup=fatal_code)\ndef get_url(url):\n    return requests.get(url)",
    ],
  },
  {
    library: BACKOFF,
    patternKey: "decorator:on_predicate:*",
    matches: [
      "import backoff\n\n@backoff.on_predicate(backoff.fibo, lambda x: x == [], max_value=13, on_backoff=report_backoff)\ndef poll_for_messages(queue):\n    return queue.get()",
    ],
    rejects: [
      "backoff = LocalRegistry()\n\n@backoff.on_predicate(backoff.fibo, lambda x: x == [], max_value=13, on_backoff=report_backoff)\ndef poll_for_messages(queue):\n    return queue.get()",
    ],
  },
]

const PYBREAKER = "PyBreaker"

export const pyBreakerFixtures: readonly PatternFixture[] = [
  {
    library: PYBREAKER,
    patternKey: "factory:CircuitBreaker:*",
    matches: [
      "import pybreaker\n\ndb_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)",
    ],
    rejects: [
      "def CircuitBreaker(*parts, **options):\n    return parts\n\ndb_breaker = CircuitBreaker(fail_max=5, reset_timeout=60)",
    ],
  },
  {
    library: PYBREAKER,
    patternKey: "factory:CircuitBreaker:*>call:call:*",
    matches: [
      "import pybreaker\n\ndb_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)\nupdated_customer = db_breaker.call(update_customer, my_customer)",
    ],
    rejects: [
      "db_breaker = LocalRegistry()\nupdated_customer = db_breaker.call(update_customer, my_customer)",
    ],
  },
  {
    library: PYBREAKER,
    patternKey: "factory:CircuitBreaker:*>call:call_async:*",
    matches: [
      "import pybreaker\n\ndb_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)\nupdated_customer = db_breaker.call_async(async_update, my_customer)",
    ],
    rejects: [
      "db_breaker = LocalRegistry()\nupdated_customer = db_breaker.call_async(async_update, my_customer)",
    ],
  },
  {
    library: PYBREAKER,
    patternKey: "factory:CircuitBreaker:*>call:calling:*",
    matches: [
      "import pybreaker\n\ndb_breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)\nwith db_breaker.calling():\n    update_customer(my_customer)",
    ],
    rejects: [
      "db_breaker = LocalRegistry()\nwith db_breaker.calling():\n    update_customer(my_customer)",
    ],
  },
  {
    library: PYBREAKER,
    patternKey: "class:CircuitBreakerListener:*",
    matches: [
      "import pybreaker\n\nclass DBListener(pybreaker.CircuitBreakerListener):\n    def before_call(self, cb, func, *args, **kwargs):\n        pass\n\n    def state_change(self, cb, old_state, new_state):\n        logging.info(new_state)\n\n    def failure(self, cb, exc):\n        report(exc)\n\n    def success(self, cb):\n        pass",
    ],
    rejects: [
      "class CircuitBreakerListener:\n    pass\n\nclass DBListener(CircuitBreakerListener):\n    def state_change(self, cb, old_state, new_state):\n        logging.info(new_state)",
    ],
  },
]

const RETRY = "retry"

export const retryFixtures: readonly PatternFixture[] = [
  {
    library: RETRY,
    patternKey: "decorator:retry:*",
    matches: [
      "from retry import retry\n\n@retry(ZeroDivisionError, tries=3, delay=2)\ndef make_trouble():\n    return 1 / 0",
    ],
    rejects: [
      "def retry(*parts, **options):\n    return lambda function: function\n\n@retry(ZeroDivisionError, tries=3, delay=2)\ndef make_trouble():\n    return 1 / 0",
    ],
  },
  {
    library: RETRY,
    patternKey: "call:retry_call:*",
    matches: [
      "from retry.api import retry_call\n\nresult = retry_call(make_trouble, fargs=[\"http://ipinfo.io/\"], fkwargs={\"info\": \"ip\"}, tries=3)",
      "from retry.api import retry_call\n\nresult = retry_call(f=make_trouble, tries=3)",
    ],
    rejects: [
      "def retry_call(f, **options):\n    return f()\n\nresult = retry_call(make_trouble, fargs=[\"http://ipinfo.io/\"], fkwargs={\"info\": \"ip\"}, tries=3)",
    ],
  },
]
