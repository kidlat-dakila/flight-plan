import type { PatternFixture } from "@/catalogue/types"

const FILE_PATH = "\"uploads/report.csv\""

const LOCAL_PATH = `report = LocalPath(${FILE_PATH})`

const madeMethodFixture = (library: string, factoryKey: string, made: string, local: string) => (name: string): PatternFixture => ({
  library,
  patternKey: `${factoryKey}>call:${name}:*`,
  matches: [`${made}\nreport.${name}()`],
  rejects: [`${local}\nreport.${name}()`],
})

const PATH = "path"

const PATH_PATH_KEY = "factory:Path:*"

const PATH_PATH = `from path import Path\n\nreport = Path(${FILE_PATH})`

const PATH_PATH_METHOD_NAMES: readonly string[] = [
  "read_text",
  "read_bytes",
  "write_text",
  "write_bytes",
  "lines",
  "write_lines",
  "open",
  "remove",
  "rmtree",
  "mkdir",
  "makedirs",
  "copy",
  "move",
  "files",
]

export const pathFixtures: readonly PatternFixture[] = [
  { library: PATH, patternKey: PATH_PATH_KEY, matches: [PATH_PATH], rejects: [LOCAL_PATH] },
  ...PATH_PATH_METHOD_NAMES.map(madeMethodFixture(PATH, PATH_PATH_KEY, PATH_PATH, LOCAL_PATH)),
]

const PYFILESYSTEM = "PyFilesystem2"

const PYFILESYSTEM_METHOD_NAMES: readonly string[] = [
  "readtext",
  "writetext",
  "readbytes",
  "writebytes",
  "open",
  "remove",
  "makedirs",
  "listdir",
  "copy",
  "move",
]

const PYFILESYSTEM_FACTORIES: readonly (readonly [string, string])[] = [
  ["open_fs", "from fs import open_fs\n\nreport = open_fs(\"~/uploads\")"],
  ["OSFS", "from fs.osfs import OSFS\n\nreport = OSFS(\"~/uploads\")"],
]

const PYFILESYSTEM_LOCAL = "report = LocalFilesystem(\"~/uploads\")"

const pyFilesystemFactoryFixtures = ([factory, made]: readonly [string, string]): PatternFixture[] => [
  {
    library: PYFILESYSTEM,
    patternKey: `factory:${factory}:*`,
    matches: [made, ...(factory === "open_fs" ? ["import fs\n\nreport = fs.open_fs(\"~/uploads\")"] : [])],
    rejects: [PYFILESYSTEM_LOCAL],
  },
  ...PYFILESYSTEM_METHOD_NAMES.map(madeMethodFixture(PYFILESYSTEM, `factory:${factory}:*`, made, PYFILESYSTEM_LOCAL)),
]

export const pyFilesystemFixtures: readonly PatternFixture[] = PYFILESYSTEM_FACTORIES.flatMap(pyFilesystemFactoryFixtures)

const PYTHON_MAGIC = "python-magic"

const PYTHON_MAGIC_LOCAL = "magic = LocalDetector()"

export const pythonMagicFixtures: readonly PatternFixture[] = [
  {
    library: PYTHON_MAGIC,
    patternKey: "call:from_file:*",
    matches: [`import magic\n\nkind = magic.from_file(${FILE_PATH}, mime=True)`, `from magic import from_file\n\nkind = from_file(${FILE_PATH})`],
    rejects: [`${PYTHON_MAGIC_LOCAL}\n\nkind = magic.from_file(${FILE_PATH}, mime=True)`],
  },
  {
    library: PYTHON_MAGIC,
    patternKey: "call:from_descriptor:*",
    matches: ["import magic\n\nkind = magic.from_descriptor(report.fileno())"],
    rejects: [`${PYTHON_MAGIC_LOCAL}\n\nkind = magic.from_descriptor(report.fileno())`],
  },
  {
    library: PYTHON_MAGIC,
    patternKey: "factory:Magic:*",
    matches: ["import magic\n\ndetector = magic.Magic(mime=True)"],
    rejects: ["detector = LocalDetector(mime=True)"],
  },
  {
    library: PYTHON_MAGIC,
    patternKey: "factory:Magic:*>call:from_file:*",
    matches: [`import magic\n\ndetector = magic.Magic(mime=True)\nkind = detector.from_file(${FILE_PATH})`],
    rejects: [`detector = LocalDetector(mime=True)\nkind = detector.from_file(${FILE_PATH})`],
  },
]

const UNIPATH = "Unipath"

const UNIPATH_PATH = `from unipath import Path\n\nreport = Path(${FILE_PATH})`

const UNIPATH_METHOD_NAMES: readonly string[] = ["read_file", "write_file", "mkdir", "remove", "rename", "rmtree", "copy", "move", "listdir"]

export const unipathFixtures: readonly PatternFixture[] = [
  { library: UNIPATH, patternKey: PATH_PATH_KEY, matches: [UNIPATH_PATH], rejects: [LOCAL_PATH] },
  ...UNIPATH_METHOD_NAMES.map(madeMethodFixture(UNIPATH, PATH_PATH_KEY, UNIPATH_PATH, LOCAL_PATH)),
]

const WATCHDOG = "watchdog"

const watchdogHandlerFixture = (name: string): PatternFixture => ({
  library: WATCHDOG,
  patternKey: `class:${name}:*`,
  matches: [`from watchdog.events import ${name}\n\nclass UploadHandler(${name}):\n    def on_created(self, event):\n        import_upload(event.src_path)`],
  rejects: ["class UploadHandler(LocalHandler):\n    def on_created(self, event):\n        import_upload(event.src_path)"],
})

const WATCHDOG_OBSERVER = "from watchdog.observers import Observer\n\nobserver = Observer()"

const WATCHDOG_LOCAL_OBSERVER = "observer = LocalObserver()"

const WATCHDOG_SCHEDULE = "observer.schedule(UploadHandler(), \"uploads\", recursive=True)"

export const watchdogFixtures: readonly PatternFixture[] = [
  ...["FileSystemEventHandler", "PatternMatchingEventHandler", "RegexMatchingEventHandler"].map(watchdogHandlerFixture),
  { library: WATCHDOG, patternKey: "factory:Observer:*", matches: [WATCHDOG_OBSERVER], rejects: [WATCHDOG_LOCAL_OBSERVER] },
  {
    library: WATCHDOG,
    patternKey: "factory:Observer:*>call:schedule:*",
    matches: [`${WATCHDOG_OBSERVER}\n${WATCHDOG_SCHEDULE}`],
    rejects: [`${WATCHDOG_LOCAL_OBSERVER}\n${WATCHDOG_SCHEDULE}`],
  },
]
