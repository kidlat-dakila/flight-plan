import { extensionOf } from "./start/file-kinds"

export const FILE_ICONS = [
  "typescript",
  "javascript",
  "react",
  "python",
  "go",
  "rust",
  "ruby",
  "java",
  "kotlin",
  "swift",
  "csharp",
  "php",
  "c",
  "cpp",
  "vue",
  "svelte",
  "html",
  "css",
  "sass",
  "shell",
  "json",
  "yaml",
  "toml",
  "markdown",
  "docker",
  "file",
] as const

export type FileIconKind = (typeof FILE_ICONS)[number]

export interface FileIcon {
  readonly kind: FileIconKind
  readonly label: string
}

const ICON_LABELS: Readonly<Record<FileIconKind, string>> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  react: "React",
  python: "Python",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  csharp: "C#",
  php: "PHP",
  c: "C",
  cpp: "C++",
  vue: "Vue",
  svelte: "Svelte",
  html: "HTML",
  css: "CSS",
  sass: "Sass",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  toml: "TOML",
  markdown: "Markdown",
  docker: "Docker",
  file: "File",
}

const ICON_BY_EXTENSION: ReadonlyMap<string, FileIconKind> = new Map(Object.entries({
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "react",
  jsx: "react",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  pyi: "python",
  go: "go",
  rs: "rust",
  rb: "ruby",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  cs: "csharp",
  php: "php",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  vue: "vue",
  svelte: "svelte",
  html: "html",
  htm: "html",
  css: "css",
  scss: "sass",
  sass: "sass",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  dockerfile: "docker",
} satisfies Record<string, FileIconKind>))

const ICON_BY_FILE_NAME: ReadonlyMap<string, FileIconKind> = new Map(Object.entries({
  dockerfile: "docker",
  containerfile: "docker",
} satisfies Record<string, FileIconKind>))

const PATH_SEPARATOR = "/"
const FALLBACK_ICON: FileIconKind = "file"

const fileNameOf = (path: string): string => path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1).toLowerCase()

const iconKindOf = (path: string): FileIconKind =>
  ICON_BY_FILE_NAME.get(fileNameOf(path)) ?? ICON_BY_EXTENSION.get(extensionOf(path)) ?? FALLBACK_ICON

export const fileIconOf = (path: string): FileIcon => {
  const kind = iconKindOf(path)
  return { kind, label: ICON_LABELS[kind] }
}
