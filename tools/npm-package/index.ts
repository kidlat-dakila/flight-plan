import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { builtinModules } from "node:module"
import { join } from "node:path"
import { z } from "zod"
import {
  BACKEND_FOLDER_NAME,
  externalPackagesOf,
  LICENSE_NAME,
  planPackageManifest,
  PUBLISHED_BUNDLE_FOLDER_NAME,
  README_NAME,
  WEB_FOLDER_NAME,
} from "./utils/package-manifest"

const MANIFEST_NAME = "package.json"
const METADATA_NAME = "meta.json"
const PACKAGE_PATH = ["dist", "package"] as const
const BUILT_WEB_PATH = ["dist", "apps", "frontend"] as const
const BUILT_PUBLISHED_BUNDLE_PATH = ["dist", "apps", "published-review"] as const
const JSON_INDENT = 2

const rootManifestSchema = z.object({
  version: z.string(),
  description: z.string(),
  license: z.string(),
  engines: z.record(z.string(), z.string()),
  dependencies: z.record(z.string(), z.string()),
})

const buildMetadataSchema = z.object({
  outputs: z.record(
    z.string(),
    z.object({ imports: z.array(z.object({ path: z.string(), external: z.boolean().optional() })) }),
  ),
})

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"))

const copyFolder = async (sourcePath: string, targetPath: string): Promise<void> => {
  await mkdir(targetPath, { recursive: true })
  const entries = await readdir(sourcePath, { withFileTypes: true })
  await Promise.all(
    entries.map(async (entry) => {
      const copy = entry.isDirectory() ? copyFolder : copyFile
      await copy(join(sourcePath, entry.name), join(targetPath, entry.name))
    }),
  )
}

const replaceFolder = async (sourcePath: string, targetPath: string): Promise<void> => {
  await rm(targetPath, { recursive: true, force: true })
  await copyFolder(sourcePath, targetPath)
}

const assemblePackage = async (workspacePath: string): Promise<string> => {
  const packagePath = join(workspacePath, ...PACKAGE_PATH)
  const metadataPath = join(packagePath, BACKEND_FOLDER_NAME, METADATA_NAME)
  const root = rootManifestSchema.parse(await readJson(join(workspacePath, MANIFEST_NAME)))
  const metadata = buildMetadataSchema.parse(await readJson(metadataPath))
  const plan = planPackageManifest(root, externalPackagesOf(metadata, builtinModules))
  if (plan.kind === "rejected") throw new Error(plan.message)
  await Promise.all([
    writeFile(join(packagePath, MANIFEST_NAME), `${JSON.stringify(plan.manifest, null, JSON_INDENT)}\n`),
    replaceFolder(join(workspacePath, ...BUILT_WEB_PATH), join(packagePath, WEB_FOLDER_NAME)),
    replaceFolder(join(workspacePath, ...BUILT_PUBLISHED_BUNDLE_PATH), join(packagePath, PUBLISHED_BUNDLE_FOLDER_NAME)),
    copyFile(join(workspacePath, README_NAME), join(packagePath, README_NAME)),
    copyFile(join(workspacePath, LICENSE_NAME), join(packagePath, LICENSE_NAME)),
    rm(metadataPath),
  ])
  return `Assembled ${plan.manifest.name}@${plan.manifest.version} in ${packagePath}`
}

assemblePackage(process.cwd())
  .then((report) => {
    console.log(report)
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
