import type { PatternFixture } from "@/catalogue/types"

const DELEGATOR_PY = "delegator.py"

export const delegatorPyFixtures: readonly PatternFixture[] = [
  {
    library: DELEGATOR_PY,
    patternKey: "call:run:*",
    matches: [
      "import delegator\n\nc = delegator.run(\"long-running-process\", block=False)",
    ],
    rejects: [
      "delegator = LocalRegistry()\n\nc = delegator.run(\"long-running-process\", block=False)",
    ],
  },
  {
    library: DELEGATOR_PY,
    patternKey: "call:chain:*",
    matches: [
      "import delegator\n\nc = delegator.chain(\"fortune | cowsay\")",
    ],
    rejects: [
      "delegator = LocalRegistry()\n\nc = delegator.chain(\"fortune | cowsay\")",
    ],
  },
]

const PEXPECT = "Pexpect"

const PEXPECT_CHILD = "import pexpect\n\nchild = pexpect.spawn(\"ftp ftp.openbsd.org\")"

const PEXPECT_POPEN_CHILD = "from pexpect.popen_spawn import PopenSpawn\n\nchild = PopenSpawn(\"ftp ftp.openbsd.org\")"

const PEXPECT_LOCAL_CHILD = "child = LocalRegistry()"

const pexpectMethodFixture = (factoryKey: string, made: string, call: string): PatternFixture => ({
  library: PEXPECT,
  patternKey: `${factoryKey}>call:${call.slice(0, call.indexOf("("))}:*`,
  matches: [`${made}\nchild.${call}`],
  rejects: [`${PEXPECT_LOCAL_CHILD}\nchild.${call}`],
})

export const pexpectFixtures: readonly PatternFixture[] = [
  {
    library: PEXPECT,
    patternKey: "factory:spawn:*",
    matches: [PEXPECT_CHILD, "from pexpect import spawn\n\nchild = spawn(\"ftp ftp.openbsd.org\")"],
    rejects: ["def spawn(*parts, **options):\n    return parts\n\nchild = spawn(\"ftp ftp.openbsd.org\")"],
  },
  pexpectMethodFixture("factory:spawn:*", PEXPECT_CHILD, "expect(\"Name .*: \")"),
  pexpectMethodFixture("factory:spawn:*", PEXPECT_CHILD, "expect_exact(\"ftp> \")"),
  pexpectMethodFixture("factory:spawn:*", PEXPECT_CHILD, "send(\"anonymous\\n\")"),
  pexpectMethodFixture("factory:spawn:*", PEXPECT_CHILD, "sendline(\"anonymous\")"),
  pexpectMethodFixture("factory:spawn:*", PEXPECT_CHILD, "interact()"),
  {
    library: PEXPECT,
    patternKey: "factory:PopenSpawn:*",
    matches: [PEXPECT_POPEN_CHILD],
    rejects: ["def PopenSpawn(*parts, **options):\n    return parts\n\nchild = PopenSpawn(\"ftp ftp.openbsd.org\")"],
  },
  pexpectMethodFixture("factory:PopenSpawn:*", PEXPECT_POPEN_CHILD, "expect(\"Name .*: \")"),
  pexpectMethodFixture("factory:PopenSpawn:*", PEXPECT_POPEN_CHILD, "expect_exact(\"ftp> \")"),
  pexpectMethodFixture("factory:PopenSpawn:*", PEXPECT_POPEN_CHILD, "send(\"anonymous\\n\")"),
  pexpectMethodFixture("factory:PopenSpawn:*", PEXPECT_POPEN_CHILD, "sendline(\"anonymous\")"),
  {
    library: PEXPECT,
    patternKey: "call:run:*",
    matches: ["import pexpect\n\noutput = pexpect.run(\"ls -la\")"],
    rejects: ["pexpect = LocalRegistry()\n\noutput = pexpect.run(\"ls -la\")"],
  },
]

const PLUMBUM = "Plumbum"

export const plumbumFixtures: readonly PatternFixture[] = [
  {
    library: PLUMBUM,
    patternKey: "call:*@plumbum.cmd:*",
    matches: [
      "from plumbum.cmd import ls\nls(\"-a\")",
      "from plumbum.cmd import grep\ngrep[\"-r\", \"TODO\"]()",
    ],
    rejects: [
      "def ls(*args):\n    return args\nls(\"-a\")",
    ],
  },
  {
    library: PLUMBUM,
    patternKey: "call:local:*",
    matches: [
      "from plumbum import local\n\nls = local[\"ls\"]\noutput = ls(\"-a\")",
      "from plumbum import local\n\nlocal[\"c:\\\\windows\\\\notepad.exe\"]()",
    ],
    rejects: [
      "local = LocalRegistry()\n\nls = local[\"ls\"]\noutput = ls(\"-a\")",
    ],
  },
  {
    library: PLUMBUM,
    patternKey: "factory:SshMachine:*",
    matches: [
      "from plumbum import SshMachine\n\nremote = SshMachine(\"somehost\", user=\"john\", keyfile=\"/path/to/idrsa\")",
    ],
    rejects: [
      "def SshMachine(*parts, **options):\n    return parts\n\nremote = SshMachine(\"somehost\", user=\"john\", keyfile=\"/path/to/idrsa\")",
    ],
  },
  {
    library: PLUMBUM,
    patternKey: "factory:SshMachine:*>called",
    matches: [
      "from plumbum import SshMachine\n\nremote = SshMachine(\"somehost\", user=\"john\", keyfile=\"/path/to/idrsa\")\nr_ls = remote[\"ls\"]\noutput = r_ls(\"-a\")",
    ],
    rejects: [
      "remote = LocalRegistry()\nr_ls = remote[\"ls\"]\noutput = r_ls(\"-a\")",
    ],
  },
]

const SARGE = "sarge"

const SARGE_COMMAND = "from sarge import Command\n\ncommand = Command(\"echo foo\", stdout=Capture())"

const SARGE_PIPELINE = "from sarge import Pipeline\n\npipeline = Pipeline(\"echo foo | tr a-z A-Z\")"

const sargeCallFixture = (name: string, call: string): PatternFixture => ({
  library: SARGE,
  patternKey: `call:${name}:*`,
  matches: [`import sarge\n\nresult = sarge.${call}`, `from sarge import ${name}\n\nresult = ${call}`],
  rejects: [`def ${name}(*parts, **options):\n    return parts\n\nresult = ${call}`],
})

export const sargeFixtures: readonly PatternFixture[] = [
  sargeCallFixture("run", "run(\"echo foo; echo bar\", async_=True)"),
  sargeCallFixture("capture_stdout", "capture_stdout(\"ls -la\")"),
  sargeCallFixture("get_stdout", "get_stdout(\"echo foo; echo bar\")"),
  sargeCallFixture("capture_stderr", "capture_stderr(\"ls missing\")"),
  sargeCallFixture("get_stderr", "get_stderr(\"ls missing\")"),
  sargeCallFixture("capture_both", "capture_both(\"ls -la missing\")"),
  sargeCallFixture("get_both", "get_both(\"ls -la missing\")"),
  {
    library: SARGE,
    patternKey: "factory:Command:*",
    matches: [SARGE_COMMAND],
    rejects: ["def Command(*parts, **options):\n    return parts\n\ncommand = Command(\"echo foo\", stdout=Capture())"],
  },
  {
    library: SARGE,
    patternKey: "factory:Command:*>call:run:*",
    matches: [`${SARGE_COMMAND}\ncommand.run(async_=True)`],
    rejects: ["command = LocalRegistry()\ncommand.run(async_=True)"],
  },
  {
    library: SARGE,
    patternKey: "factory:Pipeline:*",
    matches: [SARGE_PIPELINE],
    rejects: ["def Pipeline(*parts, **options):\n    return parts\n\npipeline = Pipeline(\"echo foo | tr a-z A-Z\")"],
  },
  {
    library: SARGE,
    patternKey: "factory:Pipeline:*>call:run:*",
    matches: [`${SARGE_PIPELINE}\npipeline.run()`],
    rejects: ["pipeline = LocalRegistry()\npipeline.run()"],
  },
]

const SH = "sh"

export const shFixtures: readonly PatternFixture[] = [
  {
    library: SH,
    patternKey: "call:*:*",
    matches: [
      "from sh import git\ngit(\"status\", _out=print_line)",
      "import sh\nsh.ls(\"-l\", \"/tmp\")",
    ],
    rejects: [
      "def git(*args):\n    return args\ngit(\"status\")",
    ],
  },
  {
    library: SH,
    patternKey: "factory:Command:*",
    matches: [
      "from sh import Command\n\nifconfig = Command(\"/sbin/ifconfig\")",
      "import sh\n\nls = sh.Command(\"ls\")",
    ],
    rejects: [
      "def Command(*parts, **options):\n    return parts\n\nifconfig = Command(\"/sbin/ifconfig\")",
    ],
  },
  {
    library: SH,
    patternKey: "factory:Command:*>called",
    matches: [
      "from sh import Command\n\nifconfig = Command(\"/sbin/ifconfig\")\nifconfig(\"eth0\", _out=lambda line: report(line), _err=lambda line: warn(line), _done=lambda cmd, success, exit_code: finish(exit_code))",
    ],
    rejects: [
      "ifconfig = LocalRegistry()\nifconfig(\"eth0\", _out=lambda line: report(line), _err=lambda line: warn(line), _done=lambda cmd, success, exit_code: finish(exit_code))",
    ],
  },
]
