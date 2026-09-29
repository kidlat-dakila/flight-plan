import * as fs from "node:fs/promises"
import * as path from "node:path"
import {
  DEFAULT_SECTIONS,
  type Sections,
  type ToggleableBody,
} from "../../lib/schemas/defaultProfile"
import type { InstructionReader } from "../../lib/schemas/resolveInstruction"
import { shippedInstructions } from "../../lib/schemas/shippedInstructions"

/**
 * User instruction profiles, on disk.
 *
 * A profile is a named set of the instruction markdown files, plus a section
 * on/off manifest. The **default profile is not a profile directory** — it is
 * the shipped instruction files, and it is read-only. A custom profile is a
 * directory of the same files under `<base>/<name>/`, with a `profile.json`
 * manifest; any file it does not carry falls back to the shipped default.
 *
 * The active profile is a global-per-user choice, held in `<base>/active.json`.
 * Both the extension (settings UI) and the MCP server (agent lookup) construct a
 * store over the same base directory.
 */

export const DEFAULT_PROFILE = "default"

/** Where profiles live: beside the server's global storage, like plans. */
export function profilesDir(serverDirectory: string): string {
  return path.join(serverDirectory, "..", "profiles")
}

const MANIFEST = "profile.json"
const ACTIVE = "active.json"
const PROFILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

export class ProfileError extends Error {}

/** Every `.md` file under a directory, as paths relative to it. */
async function walkMarkdown(dir: string): Promise<string[]> {
  const out: string[] = []
  const walk = async (current: string, prefix: string): Promise<void> => {
    let entries: import("node:fs").Dirent[]
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) await walk(path.join(current, entry.name), rel)
      else if (entry.name.endsWith(".md")) out.push(rel)
    }
  }
  await walk(dir, "")
  return out
}

export class ProfileStore {
  constructor(private readonly base: string) {}

  private profileDir(name: string): string {
    return path.join(this.base, name)
  }

  async list(): Promise<string[]> {
    let entries: string[] = []
    try {
      const dirents = await fs.readdir(this.base, { withFileTypes: true })
      entries = dirents.filter((d) => d.isDirectory()).map((d) => d.name)
    } catch {
      // No base directory yet: only the shipped default exists.
    }
    return [DEFAULT_PROFILE, ...entries.filter((n) => n !== DEFAULT_PROFILE).sort()]
  }

  async activeName(): Promise<string> {
    try {
      const raw = await fs.readFile(path.join(this.base, ACTIVE), "utf8")
      const name = (JSON.parse(raw) as { active?: unknown }).active
      if (typeof name === "string" && (await this.list()).includes(name)) return name
    } catch {
      // Unset or unreadable: fall back to the default.
    }
    return DEFAULT_PROFILE
  }

  async setActive(name: string): Promise<void> {
    if (!(await this.list()).includes(name)) {
      throw new ProfileError(`No profile named "${name}".`)
    }
    await fs.mkdir(this.base, { recursive: true })
    await fs.writeFile(
      path.join(this.base, ACTIVE),
      `${JSON.stringify({ active: name }, null, 2)}\n`,
      "utf8",
    )
  }

  async create(name: string): Promise<void> {
    if (name === DEFAULT_PROFILE) {
      throw new ProfileError(`"${DEFAULT_PROFILE}" is reserved.`)
    }
    if (!PROFILE_NAME_PATTERN.test(name)) {
      throw new ProfileError(
        `Invalid profile name "${name}". Letters, digits, dot, dash and underscore only.`,
      )
    }
    const dir = this.profileDir(name)
    try {
      await fs.access(dir)
      throw new ProfileError(`A profile named "${name}" already exists.`)
    } catch (error) {
      if (error instanceof ProfileError) throw error
    }
    // Copy the shipped default set verbatim, so a profile is self-contained.
    for (const [relPath, body] of Object.entries(shippedInstructions().instructions)) {
      const target = path.join(dir, relPath)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, body, "utf8")
    }
    await this.writeManifest(name, DEFAULT_SECTIONS)
  }

  async sections(name: string): Promise<Sections> {
    if (name === DEFAULT_PROFILE) return { ...DEFAULT_SECTIONS }
    try {
      const raw = await fs.readFile(path.join(this.profileDir(name), MANIFEST), "utf8")
      const parsed = (JSON.parse(raw) as { sections?: Partial<Sections> }).sections ?? {}
      return {
        diagram: parsed.diagram ?? DEFAULT_SECTIONS.diagram,
        blast: parsed.blast ?? DEFAULT_SECTIONS.blast,
        codeWalkthrough: parsed.codeWalkthrough ?? DEFAULT_SECTIONS.codeWalkthrough,
      }
    } catch {
      return { ...DEFAULT_SECTIONS }
    }
  }

  async setSection(name: string, body: ToggleableBody, on: boolean): Promise<void> {
    this.requireCustom(name)
    const current = await this.sections(name)
    await this.writeManifest(name, { ...current, [body]: on })
  }

  async write(name: string, relPath: string, content: string): Promise<void> {
    this.requireCustom(name)
    if (shippedInstructions().instructions[relPath] === undefined) {
      throw new ProfileError(`"${relPath}" is not an editable instruction file.`)
    }
    const target = path.join(this.profileDir(name), relPath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, content, "utf8")
  }

  /**
   * A synchronous reader for a profile: the shipped defaults, overlaid with
   * every file the profile carries (field instructions and enum-option meanings
   * alike). Synchronous so it feeds the pure `resolveConfigurations`;
   * the async I/O happens once, here. Returns `undefined` for an unknown path.
   */
  async loadReader(name: string): Promise<InstructionReader> {
    const map: Record<string, string> = { ...shippedInstructions().instructions }
    if (name !== DEFAULT_PROFILE) {
      for (const relPath of await walkMarkdown(this.profileDir(name))) {
        // The manifest is not an instruction file.
        if (relPath === MANIFEST) continue
        map[relPath] = await fs.readFile(path.join(this.profileDir(name), relPath), "utf8")
      }
    }
    return (relPath) => map[relPath]
  }

  private requireCustom(name: string): void {
    if (name === DEFAULT_PROFILE) {
      throw new ProfileError("The default profile is read-only. Create a profile to edit it.")
    }
  }

  private async writeManifest(name: string, sections: Sections): Promise<void> {
    const dir = this.profileDir(name)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      path.join(dir, MANIFEST),
      `${JSON.stringify({ version: 1, sections }, null, 2)}\n`,
      "utf8",
    )
  }
}
