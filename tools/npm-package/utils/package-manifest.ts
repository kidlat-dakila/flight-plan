export const PACKAGE_NAME = "@kidlat-dakila/flightplan"
export const COMMAND_NAME = "flightplan"
export const BACKEND_FOLDER_NAME = "backend"
export const WEB_FOLDER_NAME = "frontend"
export const PUBLISHED_BUNDLE_FOLDER_NAME = "published-review"
export const README_NAME = "README.md"
export const LICENSE_NAME = "LICENSE.md"

const ENTRY_FILE_NAME = "main.js"
const SCOPE_MARK = "@"
const NODE_SCHEME = "node:"
const RELATIVE_MARK = "."
const ABSOLUTE_MARK = "/"
const SCOPED_NAME_PARTS = 2
const UNSCOPED_NAME_PARTS = 1

export interface Repository {
  readonly type: string
  readonly url: string
}

export interface RootManifest {
  readonly version: string
  readonly repository: Repository
  readonly description: string
  readonly license: string
  readonly engines: Readonly<Record<string, string>>
  readonly dependencies: Readonly<Record<string, string>>
}

export interface BuildMetadata {
  readonly outputs: Readonly<Record<string, { readonly imports: readonly BundleImport[] }>>
}

interface BundleImport {
  readonly path: string
  readonly external?: boolean | undefined
}

export interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly description: string
  readonly repository: Repository
  readonly license: string
  readonly engines: Readonly<Record<string, string>>
  readonly bin: Readonly<Record<string, string>>
  readonly files: readonly string[]
  readonly publishConfig: { readonly access: "public" }
  readonly dependencies: Readonly<Record<string, string>>
}

export type ManifestPlan
  = | { readonly kind: "built", readonly manifest: PackageManifest }
    | { readonly kind: "rejected", readonly message: string }

const isFilePath = (path: string): boolean => path.startsWith(RELATIVE_MARK) || path.startsWith(ABSOLUTE_MARK)

const packageNameOf = (path: string): string =>
  path
    .split("/")
    .slice(0, path.startsWith(SCOPE_MARK) ? SCOPED_NAME_PARTS : UNSCOPED_NAME_PARTS)
    .join("/")

const isBuiltin = (path: string, builtinModules: readonly string[]): boolean =>
  path.startsWith(NODE_SCHEME) || builtinModules.includes(packageNameOf(path))

export const externalPackagesOf = (metadata: BuildMetadata, builtinModules: readonly string[]): readonly string[] => {
  const paths = Object.values(metadata.outputs)
    .flatMap((output) => output.imports)
    .filter((bundleImport) => bundleImport.external === true)
    .map((bundleImport) => bundleImport.path)
    .filter((path) => !isFilePath(path) && !isBuiltin(path, builtinModules))
  return [...new Set(paths.map(packageNameOf))].sort()
}

const undeclaredMessage = (names: readonly string[]): string =>
  `The bundle loads ${names.join(", ")} at run time, but the root package.json does not list ${names.length === 1 ? "it" : "them"} under dependencies.`

export const planPackageManifest = (root: RootManifest, externalPackages: readonly string[]): ManifestPlan => {
  const undeclared = externalPackages.filter((name) => !Object.hasOwn(root.dependencies, name))
  if (undeclared.length > 0) return { kind: "rejected", message: undeclaredMessage(undeclared) }
  return {
    kind: "built",
    manifest: {
      name: PACKAGE_NAME,
      version: root.version,
      description: root.description,
      repository: root.repository,
      license: root.license,
      engines: root.engines,
      bin: { [COMMAND_NAME]: `${BACKEND_FOLDER_NAME}/${ENTRY_FILE_NAME}` },
      files: [BACKEND_FOLDER_NAME, WEB_FOLDER_NAME, PUBLISHED_BUNDLE_FOLDER_NAME],
      publishConfig: { access: "public" },
      dependencies: Object.fromEntries(
        Object.entries(root.dependencies).filter(([name]) => externalPackages.includes(name)),
      ),
    },
  }
}
