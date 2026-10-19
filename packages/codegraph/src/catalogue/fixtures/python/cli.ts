import type { PatternFixture } from "@/catalogue/types"

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

const DOCOPT = "docopt"

export const docoptFixtures: readonly PatternFixture[] = [
  {
    library: DOCOPT,
    patternKey: "call:docopt:*",
    matches: [
      "from docopt import docopt\n\nif __name__ == \"__main__\":\n    arguments = docopt(__doc__, version=\"Naval Fate 2.0\")",
    ],
    rejects: [
      "def docopt(*parts, **options):\n    return parts\n\nif __name__ == \"__main__\":\n    arguments = docopt(__doc__, version=\"Naval Fate 2.0\")",
    ],
  },
]

const PYTHON_FIRE = "Python Fire"

export const pythonFireFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_FIRE,
    patternKey: "call:Fire:*",
    matches: [
      "import fire\n\ndef hello(name=\"World\"):\n    return \"Hello %s!\" % name\n\nif __name__ == \"__main__\":\n    fire.Fire(hello)",
      "from fire import Fire\n\nclass Calculator:\n    def add(self, x, y):\n        return x + y\n\nFire(component=Calculator)",
      "import fire\n\nfire.Fire({\"add\": add, \"multiply\": multiply})",
    ],
    rejects: [
      "def Fire(*parts, **options):\n    return parts\n\nFire(hello)",
    ],
  },
]
