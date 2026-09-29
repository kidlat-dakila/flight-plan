import * as assert from "assert"
import * as vscode from "vscode"

/**
 * The only suite that needs a real VS Code.
 *
 * It used to be most of this file's length. Symbols at a commit, call
 * hierarchy through a worktree, incoming calls, Pylance's semantics, what a
 * provider will and will not answer for — every one of those suites measured a
 * language server, and every one of them is gone because nothing asks a
 * language server any more. The scaffold's own end-to-end test went with them,
 * to `scaffoldEndToEnd.test.ts`, where it runs under vitest against a real git
 * repository and no editor at all.
 *
 * What is left is what genuinely cannot be checked without an extension host:
 * that the contributed commands register, that the setup view opens, and that
 * every welcome screen matches a state the code can produce. Run with
 * `pnpm run test:vscode`, which downloads a VS Code build.
 *
 * Still thin, and worth saying plainly rather than leaving something here to
 * look like coverage. What is not yet written: that the walkthrough panel
 * answers a `readFile` message, and that the setup view's actions reach the
 * filesystem.
 */
suite("extension host", () => {
  /**
   * Every command the manifest promises is actually registered.
   *
   * Read from `package.json` rather than listed here, because a hand-written
   * list only ever covers the commands somebody remembered to add to it — and
   * the one most likely to be missing is the one added last. A contributed
   * command that nothing registers is invisible until a user clicks it and gets
   * "command not found", which looks like the extension being broken rather
   * than like one missing line.
   */
  test("every contributed command is registered on activation", async () => {
    const extension = vscode.extensions.all.find((candidate) =>
      candidate.packageJSON.name === "flight-plan",
    )
    assert.ok(extension !== undefined, "the extension is not installed")
    await extension.activate()

    const manifest = extension.packageJSON as {
      contributes?: { commands?: { command: string }[] }
    }
    const contributed = (manifest.contributes?.commands ?? []).map(
      (entry) => entry.command,
    )
    assert.ok(contributed.length > 0, "the manifest contributes no commands")

    const registered = new Set(await vscode.commands.getCommands(true))
    const missing = contributed.filter((command) => !registered.has(command))
    assert.deepStrictEqual(
      missing,
      [],
      `contributed but never registered: ${missing.join(", ")}`,
    )
  })

  /**
   * The setup view opens.
   *
   * More than it sounds. Building its state resolves the plugin location, reads
   * the installed version, probes every agent, resolves the server URL, and —
   * since the adapter chooser arrived — reads five Markdown guides out of
   * `resources/git-adapter` and builds a tab for each. All of that runs before a
   * single pixel is drawn, and a missing resource or a throw in any of it
   * leaves the reader with an empty panel and nothing in the log.
   *
   * The guides are the part most likely to break silently: they are files, they
   * are addressed by a path built at runtime, and `.vscodeignore` decides
   * whether they exist in a packaged build at all.
   */
  test("the setup view opens, guides and all", async () => {
    await vscode.commands.executeCommand("flightPlan.openSetup")
    // Executing without throwing is the assertion. A webview's contents are not
    // reachable from here, so claiming to check them would be theatre; what
    // this does prove is that every read behind the view succeeded.
    assert.ok(true)
  })

  /**
   * The per-host guides are present and are about the host they name.
   *
   * Read from the extension's own installed directory, which is the path the
   * view uses, so this fails the same way the view would if `.vscodeignore`
   * ever stopped shipping them.
   */
  test("every adapter tab has a guide that ships with the extension", async () => {
    const extension = vscode.extensions.all.find((candidate) =>
      candidate.packageJSON.name === "flight-plan",
    )
    assert.ok(extension !== undefined)

    const expected: Record<string, string> = {
      git: "git",
      gh: "GitHub CLI",
      github: "token",
      gitlab: "read_api",
      bitbucket: "API token",
    }
    for (const [id, needle] of Object.entries(expected)) {
      const file = vscode.Uri.joinPath(
        extension.extensionUri,
        "resources",
        "forge",
        `${id}.md`,
      )
      const bytes = await vscode.workspace.fs.readFile(file)
      const text = Buffer.from(bytes).toString("utf8")
      assert.ok(text.length > 200, `${id}.md is too short to be a guide`)
      assert.ok(
        text.toLowerCase().includes(needle.toLowerCase()),
        `${id}.md does not mention ${needle}`,
      )
    }
  })

  /**
   * The context keys the welcome screens match on.
   *
   * Every `viewsWelcome` entry is gated on a value of `flightPlan.prs` or
   * `flightPlan.planList`, and a value the code never sets is a screen nobody
   * can ever see. The manifest and the two tree views have to agree on the
   * vocabulary, and nothing else checks that they do.
   */
  test("every welcome screen matches a state the code can produce", () => {
    const extension = vscode.extensions.all.find((candidate) =>
      candidate.packageJSON.name === "flight-plan",
    )
    assert.ok(extension !== undefined)

    const manifest = extension.packageJSON as {
      contributes?: { viewsWelcome?: { when?: string }[] }
    }
    const produced: Record<string, string[]> = {
      "flightPlan.prs": [
        "loading",
        "noFolder",
        "empty",
        "gitOnly",
        "noCli",
        "auth",
        "noRepo",
        "hostMismatch",
        "error",
      ],
      "flightPlan.planList": [
        "loading",
        "noFolder",
        "empty",
        "noRepo",
        "error",
      ],
    }

    const orphans: string[] = []
    for (const entry of manifest.contributes?.viewsWelcome ?? []) {
      const match = /^(flightPlan\.\w+) == (\w+)$/.exec(entry.when ?? "")
      if (match === null) continue
      const [, key, value] = match
      if (key === undefined || value === undefined) continue
      if (!(produced[key] ?? []).includes(value)) {
        orphans.push(`${key} == ${value}`)
      }
    }
    assert.deepStrictEqual(
      orphans,
      [],
      `welcome screens gated on states nothing sets: ${orphans.join(", ")}`,
    )
  })
})
