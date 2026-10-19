import type { PatternFixture } from "@/catalogue/types"

const SUBPROCESS = "subprocess"

const MULTIPROCESSING = "multiprocessing"

const MULTIPROCESSING_POOL_KEY = "factory:Pool:*"

const MULTIPROCESSING_POOL = "from multiprocessing import Pool\n\npool = Pool(processes=4)"

const MULTIPROCESSING_LOCAL_POOL = "pool = LocalRegistry()"

const subprocessCallFixture = (name: string, call: string): PatternFixture => ({
  library: SUBPROCESS,
  patternKey: `call:${name}:*`,
  matches: [`import subprocess\n\nresult = subprocess.${call}`, `from subprocess import ${name}\n\nresult = ${call}`],
  rejects: [`def ${name}(*parts, **options):\n    return parts\n\nresult = ${call}`],
})

const multiprocessingPoolFixture = (call: string): PatternFixture => ({
  library: MULTIPROCESSING,
  patternKey: `${MULTIPROCESSING_POOL_KEY}>call:${call.slice(0, call.indexOf("("))}:*`,
  matches: [`${MULTIPROCESSING_POOL}\nresult = pool.${call}`],
  rejects: [`${MULTIPROCESSING_LOCAL_POOL}\nresult = pool.${call}`],
})

export const subprocessFixtures: readonly PatternFixture[] = [
  subprocessCallFixture("run", "run([\"ls\", \"-l\"], capture_output=True, check=True)"),
  subprocessCallFixture("Popen", "Popen([\"ls\", \"-l\"], stdout=PIPE)"),
  subprocessCallFixture("call", "call([\"ls\", \"-l\"])"),
  subprocessCallFixture("check_call", "check_call([\"ls\", \"-l\"])"),
  subprocessCallFixture("check_output", "check_output([\"echo\", \"Hello World!\"], text=True)"),
]

export const multiprocessingFixtures: readonly PatternFixture[] = [
  {
    library: MULTIPROCESSING,
    patternKey: "call:Process:*",
    matches: [
      "from multiprocessing import Process\n\np = Process(target=f, args=(\"bob\",))",
      "import multiprocessing as mp\n\np = mp.Process(target=f, args=(\"bob\",))",
    ],
    rejects: ["def Process(*parts, **options):\n    return parts\n\np = Process(target=f, args=(\"bob\",))"],
  },
  {
    library: MULTIPROCESSING,
    patternKey: MULTIPROCESSING_POOL_KEY,
    matches: [MULTIPROCESSING_POOL, "import multiprocessing\n\npool = multiprocessing.Pool(4)"],
    rejects: ["def Pool(*parts, **options):\n    return parts\n\npool = Pool(processes=4)"],
  },
  multiprocessingPoolFixture("apply(f, (10,))"),
  multiprocessingPoolFixture("map(f, range(10))"),
  multiprocessingPoolFixture("imap(f, range(10))"),
  multiprocessingPoolFixture("imap_unordered(f, range(10))"),
  multiprocessingPoolFixture("starmap(func=f, iterable=pairs)"),
  multiprocessingPoolFixture("apply_async(f, (10,), callback=lambda value: collect(value), error_callback=lambda error: report(error))"),
  multiprocessingPoolFixture("map_async(f, range(10), callback=lambda values: collect(values), error_callback=lambda error: report(error))"),
  multiprocessingPoolFixture("starmap_async(f, pairs, callback=lambda values: collect(values), error_callback=lambda error: report(error))"),
]
