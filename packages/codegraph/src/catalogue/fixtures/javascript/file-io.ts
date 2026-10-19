import type { PatternFixture } from "@/catalogue/types"

const NODE_FS_NAMES: readonly string[] = [
  "readFile",
  "readFileSync",
  "writeFile",
  "writeFileSync",
  "appendFile",
  "appendFileSync",
  "readdir",
  "readdirSync",
  "mkdir",
  "mkdirSync",
  "rename",
  "renameSync",
  "rm",
  "rmSync",
  "unlink",
  "unlinkSync",
  "stat",
  "statSync",
  "existsSync",
  "createReadStream",
  "createWriteStream",
]

const FILE_PATH = "\"uploads/report.csv\""

const ARCHIVER = "Archiver"

const ARCHIVER_METHOD_CALLS: readonly (readonly [string, string])[] = [
  ["append", `archive.append("report", { name: "report.txt" })`],
  ["file", `archive.file(${FILE_PATH}, { name: "report.csv" })`],
  ["directory", "archive.directory(\"uploads/\", \"uploads\")"],
  ["glob", "archive.glob(\"*.csv\", { cwd: \"uploads\" })"],
  ["finalize", "await archive.finalize()"],
]

const ARCHIVER_FACTORIES: readonly (readonly [string, string])[] = [
  ["default", "import archiver from \"archiver\"\nconst archive = archiver(\"zip\", { zlib: { level: 9 } })"],
  ["ZipArchive", "import { ZipArchive } from \"archiver\"\nconst archive = new ZipArchive({ zlib: { level: 9 } })"],
  ["TarArchive", "import { TarArchive } from \"archiver\"\nconst archive = new TarArchive({ gzip: true })"],
]

const ARCHIVER_LOCAL = "const archive = makeLocalArchive()"

const archiverFactoryFixtures = ([factory, made]: readonly [string, string]): PatternFixture[] => [
  {
    library: ARCHIVER,
    patternKey: `factory:${factory}:*`,
    matches: [made],
    rejects: [made.replace(/^import .*\n/, `const ${factory === "default" ? "archiver" : factory} = makeLocalArchive\n`)],
  },
  ...ARCHIVER_METHOD_CALLS.map(([name, call]) => ({
    library: ARCHIVER,
    patternKey: `factory:${factory}:*>call:${name}:*`,
    matches: [`${made}\n${call}`],
    rejects: [`${ARCHIVER_LOCAL}\n${call}`],
  })),
]

export const archiverFixtures: readonly PatternFixture[] = ARCHIVER_FACTORIES.flatMap(archiverFactoryFixtures)

const CHOKIDAR = "Chokidar"

const CHOKIDAR_FACTORIES: readonly (readonly [string, string])[] = [
  ["watch", "import chokidar from \"chokidar\"\nconst watcher = chokidar.watch(\"uploads\", { ignoreInitial: true })"],
  ["FSWatcher", "import { FSWatcher } from \"chokidar\"\nconst watcher = new FSWatcher({ ignoreInitial: true })"],
]

const CHOKIDAR_LOCAL = "const watcher = makeLocalWatcher()"

const chokidarFactoryFixtures = ([factory, made]: readonly [string, string]): PatternFixture[] => [
  {
    library: CHOKIDAR,
    patternKey: `factory:${factory}:*`,
    matches: [made, ...(factory === "watch" ? ["import { watch } from \"chokidar\"\nconst watcher = watch(\"uploads\")"] : [])],
    rejects: [`const ${factory} = makeLocalWatcher\nconst watcher = ${factory === "watch" ? "watch(\"uploads\")" : "new FSWatcher()"}`],
  },
  {
    library: CHOKIDAR,
    patternKey: `factory:${factory}:*>call:on:*`,
    matches: [`${made}\nwatcher.on("add", (path) => importUpload(path))`],
    rejects: [`${CHOKIDAR_LOCAL}\nwatcher.on("add", (path) => importUpload(path))`],
  },
  {
    library: CHOKIDAR,
    patternKey: `factory:${factory}:*>call:add:*`,
    matches: [`${made}\nwatcher.add(["imports", "exports"])`],
    rejects: [`${CHOKIDAR_LOCAL}\nwatcher.add(["imports", "exports"])`],
  },
]

export const chokidarFixtures: readonly PatternFixture[] = CHOKIDAR_FACTORIES.flatMap(chokidarFactoryFixtures)

const FS_EXTRA = "fs-extra"

const FS_EXTRA_NAMES: readonly string[] = [
  "copy",
  "copySync",
  "emptyDir",
  "emptyDirSync",
  "ensureFile",
  "ensureFileSync",
  "ensureDir",
  "ensureDirSync",
  "mkdirp",
  "mkdirs",
  "move",
  "moveSync",
  "outputFile",
  "outputFileSync",
  "outputJson",
  "outputJsonSync",
  "pathExists",
  "pathExistsSync",
  "readJson",
  "readJsonSync",
  "remove",
  "removeSync",
  "writeJson",
  "writeJsonSync",
]

const fsExtraFixture = (name: string): PatternFixture => ({
  library: FS_EXTRA,
  patternKey: `call:${name}:*`,
  matches: [
    `import fs from "fs-extra"\nawait fs.${name}(${FILE_PATH})`,
    `const fs = require("fs-extra")\nfs.${name}(${FILE_PATH})`,
    `import { ${name} } from "fs-extra"\nawait ${name}(${FILE_PATH})`,
  ],
  rejects: [`const fs = makeLocalStore()\nawait fs.${name}(${FILE_PATH})`],
})

export const fsExtraFixtures: readonly PatternFixture[] = [...FS_EXTRA_NAMES, ...NODE_FS_NAMES].map(fsExtraFixture)

const GLOB = "glob"

const GLOB_CALLS: readonly (readonly [string, string])[] = [
  ["glob", "import { glob } from \"glob\"\nconst files = await glob(\"uploads/**/*.csv\")"],
  ["globSync", "import { globSync } from \"glob\"\nconst files = globSync(\"uploads/**/*.csv\")"],
  ["globStream", "import { globStream } from \"glob\"\nconst files = globStream(\"uploads/**/*.csv\")"],
  ["globStreamSync", "import { globStreamSync } from \"glob\"\nconst files = globStreamSync(\"uploads/**/*.csv\")"],
  ["globIterate", "import { globIterate } from \"glob\"\nconst files = globIterate(\"uploads/**/*.csv\")"],
  ["globIterateSync", "import { globIterateSync } from \"glob\"\nconst files = globIterateSync(\"uploads/**/*.csv\")"],
  ["sync", "const glob = require(\"glob\")\nconst files = glob.sync(\"uploads/**/*.csv\")"],
  ["glob.sync", "import { glob } from \"glob\"\nconst files = glob.sync(\"uploads/**/*.csv\")"],
  ["default", "const glob = require(\"glob\")\nglob(\"uploads/**/*.csv\", (error, files) => importAll(files))"],
]

const globCallFixture = ([name, code]: readonly [string, string]): PatternFixture => ({
  library: GLOB,
  patternKey: `call:${name}:*`,
  matches: [code],
  rejects: [code.replace(/^.*\n/, "const glob = makeLocalFinder()\n")],
})

const GLOB_CLASS_KEY = "factory:Glob:*"

const GLOB_MADE = "import { Glob } from \"glob\"\nconst finder = new Glob(\"uploads/**/*.csv\", {})"

const GLOB_LOCAL = "const finder = makeLocalFinder()"

const GLOB_CLASS_CALLS: readonly (readonly [string, string])[] = [
  ["walk", "const files = await finder.walk()"],
  ["walkSync", "const files = finder.walkSync()"],
  ["stream", "const files = finder.stream()"],
  ["iterate", "const files = finder.iterate()"],
]

export const globFixtures: readonly PatternFixture[] = [
  ...GLOB_CALLS.map(globCallFixture),
  {
    library: GLOB,
    patternKey: GLOB_CLASS_KEY,
    matches: [GLOB_MADE],
    rejects: ["const Glob = makeLocalFinder\nconst finder = new Glob(\"uploads/**/*.csv\", {})"],
  },
  ...GLOB_CLASS_CALLS.map(([name, call]) => ({
    library: GLOB,
    patternKey: `${GLOB_CLASS_KEY}>call:${name}:*`,
    matches: [`${GLOB_MADE}\n${call}`],
    rejects: [`${GLOB_LOCAL}\n${call}`],
  })),
]

const MULTER = "Multer"

const multerMethodFixture = (call: string): PatternFixture => ({
  library: MULTER,
  patternKey: `factory:default:*>call:${call.slice(0, call.indexOf("("))}:*`,
  matches: [`const multer = require("multer")\nconst upload = multer({ dest: "uploads/" })\napp.post("/profile", upload.${call}, saveProfile)`],
  rejects: [`const upload = makeLocalRegistry()\napp.post("/profile", upload.${call}, saveProfile)`],
})

export const multerFixtures: readonly PatternFixture[] = [
  {
    library: MULTER,
    patternKey: "factory:default:*",
    matches: ["import multer from \"multer\"\nconst upload = multer({ dest: \"uploads/\", fileFilter: (req, file, cb) => cb(null, true) })"],
    rejects: ["const multer = (options) => options\nconst upload = multer({ dest: \"uploads/\" })"],
  },
  ...["single(\"avatar\")", "array(\"photos\", 12)", "fields([{ name: \"avatar\", maxCount: 1 }])", "none()", "any()"].map(multerMethodFixture),
  {
    library: MULTER,
    patternKey: "factory:diskStorage:*",
    matches: ["const multer = require(\"multer\")\nconst storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, \"/tmp/my-uploads\"), filename: (req, file, cb) => cb(null, file.fieldname) })"],
    rejects: ["const multer = makeLocalRegistry()\nconst storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, \"/tmp/my-uploads\") })"],
  },
  {
    library: MULTER,
    patternKey: "call:memoryStorage:*",
    matches: ["import multer from \"multer\"\nconst storage = multer.memoryStorage()"],
    rejects: ["const multer = makeLocalRegistry()\nconst storage = multer.memoryStorage()"],
  },
]
