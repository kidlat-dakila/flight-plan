import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { promisify } from "node:util"
import { onTestFinished } from "vitest"

const run = promisify(execFile)

export async function repositoryWithBranch(prefix: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  onTestFinished(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })
  const at = async (args: string[]): Promise<unknown> => await run("git", args, { cwd: root })
  await at(["init", "-q", "-b", "main"])
  await at(["config", "user.email", "nobody@example.com"])
  await at(["config", "user.name", "Nobody"])
  await fs.writeFile(path.join(root, "a.ts"), "a\n")
  await at(["add", "."])
  await at(["commit", "-qm", "first"])
  await at(["checkout", "-q", "-b", "topic"])
  await fs.writeFile(path.join(root, "a.ts"), "b\n")
  await at(["commit", "-qam", "second"])
  await at(["checkout", "-q", "main"])
  return root
}
