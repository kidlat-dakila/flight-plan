import type { CallPattern, CatalogueLibrary, MethodPattern } from "@/catalogue/types"

const FILE_IO = "file-io"

const NODE_FS_CALLS: readonly CallPattern[] = [
  { kind: "call", name: "readFile", slots: [], classifies: FILE_IO },
  { kind: "call", name: "readFileSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "writeFile", slots: [], classifies: FILE_IO },
  { kind: "call", name: "writeFileSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "appendFile", slots: [], classifies: FILE_IO },
  { kind: "call", name: "appendFileSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "readdir", slots: [], classifies: FILE_IO },
  { kind: "call", name: "readdirSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "mkdir", slots: [], classifies: FILE_IO },
  { kind: "call", name: "mkdirSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "rename", slots: [], classifies: FILE_IO },
  { kind: "call", name: "renameSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "rm", slots: [], classifies: FILE_IO },
  { kind: "call", name: "rmSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "unlink", slots: [], classifies: FILE_IO },
  { kind: "call", name: "unlinkSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "stat", slots: [], classifies: FILE_IO },
  { kind: "call", name: "statSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "existsSync", slots: [], classifies: FILE_IO },
  { kind: "call", name: "createReadStream", slots: [], classifies: FILE_IO },
  { kind: "call", name: "createWriteStream", slots: [], classifies: FILE_IO },
]

const ARCHIVER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "append", slots: [], classifies: FILE_IO },
  { kind: "call", name: "file", slots: [], classifies: FILE_IO },
  { kind: "call", name: "directory", slots: [], classifies: FILE_IO },
  { kind: "call", name: "glob", slots: [], classifies: FILE_IO },
  { kind: "call", name: "finalize", slots: [], classifies: FILE_IO },
]

const CHOKIDAR_WATCHER_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
  { kind: "call", name: "add", slots: [], classifies: FILE_IO },
]

export const archiverLibrary: CatalogueLibrary = {
  name: "Archiver",
  specifiers: ["archiver"],
  documentedVersion: "8.0",
  category: "file-io",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "default", methods: ARCHIVER_METHODS },
    { kind: "factory", name: "ZipArchive", methods: ARCHIVER_METHODS },
    { kind: "factory", name: "TarArchive", methods: ARCHIVER_METHODS },
  ],
}

export const chokidarLibrary: CatalogueLibrary = {
  name: "Chokidar",
  specifiers: ["chokidar"],
  documentedVersion: "5.0",
  category: "file-io",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "factory", name: "watch", classifies: FILE_IO, methods: CHOKIDAR_WATCHER_METHODS },
    { kind: "factory", name: "FSWatcher", classifies: FILE_IO, methods: CHOKIDAR_WATCHER_METHODS },
  ],
}

export const fsExtraLibrary: CatalogueLibrary = {
  name: "fs-extra",
  specifiers: ["fs-extra"],
  documentedVersion: "11.4",
  category: "file-io",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "copy", slots: [], classifies: FILE_IO },
    { kind: "call", name: "copySync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "emptyDir", slots: [], classifies: FILE_IO },
    { kind: "call", name: "emptyDirSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "ensureFile", slots: [], classifies: FILE_IO },
    { kind: "call", name: "ensureFileSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "ensureDir", slots: [], classifies: FILE_IO },
    { kind: "call", name: "ensureDirSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "mkdirp", slots: [], classifies: FILE_IO },
    { kind: "call", name: "mkdirs", slots: [], classifies: FILE_IO },
    { kind: "call", name: "move", slots: [], classifies: FILE_IO },
    { kind: "call", name: "moveSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "outputFile", slots: [], classifies: FILE_IO },
    { kind: "call", name: "outputFileSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "outputJson", slots: [], classifies: FILE_IO },
    { kind: "call", name: "outputJsonSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "pathExists", slots: [], classifies: FILE_IO },
    { kind: "call", name: "pathExistsSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "readJson", slots: [], classifies: FILE_IO },
    { kind: "call", name: "readJsonSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "remove", slots: [], classifies: FILE_IO },
    { kind: "call", name: "removeSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "writeJson", slots: [], classifies: FILE_IO },
    { kind: "call", name: "writeJsonSync", slots: [], classifies: FILE_IO },
    ...NODE_FS_CALLS,
  ],
}

export const globLibrary: CatalogueLibrary = {
  name: "glob",
  specifiers: ["glob"],
  documentedVersion: "13.0",
  category: "file-io",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "glob", slots: [], classifies: FILE_IO },
    { kind: "call", name: "globSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "globStream", slots: [], classifies: FILE_IO },
    { kind: "call", name: "globStreamSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "globIterate", slots: [], classifies: FILE_IO },
    { kind: "call", name: "globIterateSync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "sync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "glob.sync", slots: [], classifies: FILE_IO },
    { kind: "call", name: "default", slots: [], classifies: FILE_IO },
    {
      kind: "factory",
      name: "Glob",
      classifies: FILE_IO,
      methods: [
        { kind: "call", name: "walk", slots: [], classifies: FILE_IO },
        { kind: "call", name: "walkSync", slots: [], classifies: FILE_IO },
        { kind: "call", name: "stream", slots: [], classifies: FILE_IO },
        { kind: "call", name: "iterate", slots: [], classifies: FILE_IO },
      ],
    },
  ],
}

export const multerLibrary: CatalogueLibrary = {
  name: "Multer",
  specifiers: ["multer"],
  documentedVersion: "2.0",
  category: "file-io",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      slots: [{ at: "fileFilter", runs: "event" }],
      classifies: FILE_IO,
      methods: [
        { kind: "call", name: "single", slots: [], classifies: FILE_IO },
        { kind: "call", name: "array", slots: [], classifies: FILE_IO },
        { kind: "call", name: "fields", slots: [], classifies: FILE_IO },
        { kind: "call", name: "none", slots: [], classifies: FILE_IO },
        { kind: "call", name: "any", slots: [], classifies: FILE_IO },
      ],
    },
    { kind: "factory", name: "diskStorage", slots: [{ at: "destination", runs: "event" }, { at: "filename", runs: "event" }], classifies: FILE_IO, methods: [] },
    { kind: "call", name: "memoryStorage", slots: [], classifies: FILE_IO },
  ],
}
