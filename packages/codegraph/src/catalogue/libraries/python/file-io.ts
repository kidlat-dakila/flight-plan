import type { CatalogueLibrary, ClassMember, MethodPattern } from "@/catalogue/types"

const FILE_IO = "file-io"

const PATH_PATH_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "read_text", slots: [], classifies: FILE_IO },
  { kind: "call", name: "read_bytes", slots: [], classifies: FILE_IO },
  { kind: "call", name: "write_text", slots: [], classifies: FILE_IO },
  { kind: "call", name: "write_bytes", slots: [], classifies: FILE_IO },
  { kind: "call", name: "lines", slots: [], classifies: FILE_IO },
  { kind: "call", name: "write_lines", slots: [], classifies: FILE_IO },
  { kind: "call", name: "open", slots: [], classifies: FILE_IO },
  { kind: "call", name: "remove", slots: [], classifies: FILE_IO },
  { kind: "call", name: "rmtree", slots: [], classifies: FILE_IO },
  { kind: "call", name: "mkdir", slots: [], classifies: FILE_IO },
  { kind: "call", name: "makedirs", slots: [], classifies: FILE_IO },
  { kind: "call", name: "copy", slots: [], classifies: FILE_IO },
  { kind: "call", name: "move", slots: [], classifies: FILE_IO },
  { kind: "call", name: "files", slots: [], classifies: FILE_IO },
]

const PYFILESYSTEM_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "readtext", slots: [], classifies: FILE_IO },
  { kind: "call", name: "writetext", slots: [], classifies: FILE_IO },
  { kind: "call", name: "readbytes", slots: [], classifies: FILE_IO },
  { kind: "call", name: "writebytes", slots: [], classifies: FILE_IO },
  { kind: "call", name: "open", slots: [], classifies: FILE_IO },
  { kind: "call", name: "remove", slots: [], classifies: FILE_IO },
  { kind: "call", name: "makedirs", slots: [], classifies: FILE_IO },
  { kind: "call", name: "listdir", slots: [], classifies: FILE_IO },
  { kind: "call", name: "copy", slots: [], classifies: FILE_IO },
  { kind: "call", name: "move", slots: [], classifies: FILE_IO },
]

const UNIPATH_PATH_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "read_file", slots: [], classifies: FILE_IO },
  { kind: "call", name: "write_file", slots: [], classifies: FILE_IO },
  { kind: "call", name: "mkdir", slots: [], classifies: FILE_IO },
  { kind: "call", name: "remove", slots: [], classifies: FILE_IO },
  { kind: "call", name: "rename", slots: [], classifies: FILE_IO },
  { kind: "call", name: "rmtree", slots: [], classifies: FILE_IO },
  { kind: "call", name: "copy", slots: [], classifies: FILE_IO },
  { kind: "call", name: "move", slots: [], classifies: FILE_IO },
  { kind: "call", name: "listdir", slots: [], classifies: FILE_IO },
]

const WATCHDOG_HANDLER_MEMBERS: readonly ClassMember[] = [
  { name: "on_any_event", runs: "event" },
  { name: "on_created", runs: "event" },
  { name: "on_modified", runs: "event" },
  { name: "on_deleted", runs: "event" },
  { name: "on_moved", runs: "event" },
  { name: "on_attrib", runs: "event" },
  { name: "on_opened", runs: "event" },
  { name: "on_closed", runs: "event" },
  { name: "on_closed_no_write", runs: "event" },
]

export const pathLibrary: CatalogueLibrary = {
  name: "path",
  specifiers: ["path"],
  documentedVersion: "17.1",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [{ kind: "factory", name: "Path", methods: PATH_PATH_METHODS }],
}

export const pyFilesystemLibrary: CatalogueLibrary = {
  name: "PyFilesystem2",
  specifiers: ["fs", "fs.osfs"],
  documentedVersion: "2.4",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "open_fs", methods: PYFILESYSTEM_METHODS },
    { kind: "factory", name: "OSFS", methods: PYFILESYSTEM_METHODS },
  ],
}

export const pythonMagicLibrary: CatalogueLibrary = {
  name: "python-magic",
  specifiers: ["magic"],
  documentedVersion: "0.4",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "from_file", slots: [], classifies: FILE_IO },
    { kind: "call", name: "from_descriptor", slots: [], classifies: FILE_IO },
    { kind: "factory", name: "Magic", methods: [{ kind: "call", name: "from_file", slots: [], classifies: FILE_IO }] },
  ],
}

export const unipathLibrary: CatalogueLibrary = {
  name: "Unipath",
  specifiers: ["unipath"],
  documentedVersion: "1.1",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [{ kind: "factory", name: "Path", methods: UNIPATH_PATH_METHODS }],
}

export const watchdogLibrary: CatalogueLibrary = {
  name: "watchdog",
  specifiers: ["watchdog.events", "watchdog.observers"],
  documentedVersion: "6.0",
  category: "file-io",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "class", name: "FileSystemEventHandler", members: WATCHDOG_HANDLER_MEMBERS, methods: [] },
    { kind: "class", name: "PatternMatchingEventHandler", members: WATCHDOG_HANDLER_MEMBERS, methods: [] },
    { kind: "class", name: "RegexMatchingEventHandler", members: WATCHDOG_HANDLER_MEMBERS, methods: [] },
    { kind: "factory", name: "Observer", methods: [{ kind: "call", name: "schedule", slots: [], classifies: FILE_IO }] },
  ],
}
