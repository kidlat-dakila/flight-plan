import { execFile } from "node:child_process"
import { promisify } from "node:util"
import gitUrlParse from "git-url-parse"

const run = promisify(execFile)

const GIT_COMMAND_TIMEOUT_MS = 10_000

export interface Remote {
  host: string
  owner: string
  name: string
  fullName: string
}

function parseUrl(url: string): ReturnType<typeof gitUrlParse> | null {
  try {
    return gitUrlParse(url)
  } catch {
    return null
  }
}

export function parseRemote(url: string): Remote | null {
  const trimmed = url.trim()
  if (trimmed === "") return null

  const parsed = parseUrl(trimmed)
  if (parsed === null) return null

  const host = parsed.resource
  const owner = parsed.owner
  const name = parsed.name
  if (host === "" || owner === "" || name === "") return null

  return { host, owner, name, fullName: `${owner}/${name}` }
}

async function remoteNames(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await run("git", ["remote"], { cwd, timeout: GIT_COMMAND_TIMEOUT_MS })
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
  } catch {
    return []
  }
}

async function remoteUrl(cwd: string, name: string): Promise<string | null> {
  try {
    const { stdout } = await run("git", ["remote", "get-url", name], {
      cwd,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    })
    return stdout.trim()
  } catch {
    return null
  }
}

async function firstRemote(cwd: string, names: readonly string[]): Promise<Remote | null> {
  const name = names.at(0)
  if (name === undefined) return null
  const url = await remoteUrl(cwd, name)
  const parsed = url === null ? null : parseRemote(url)
  return parsed ?? (await firstRemote(cwd, names.slice(1)))
}

export async function readRemote(cwd: string): Promise<Remote | null> {
  const names = await remoteNames(cwd)
  const ordered = names.includes("origin")
    ? ["origin", ...names.filter((name) => name !== "origin")]
    : names
  return await firstRemote(cwd, ordered)
}

export async function repoName(cwd: string): Promise<string | null> {
  return (await readRemote(cwd))?.fullName ?? null
}
