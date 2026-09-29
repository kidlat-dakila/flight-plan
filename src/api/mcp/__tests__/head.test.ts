import * as assert from "assert"
import * as os from "node:os"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { headSha, walkthroughRepository } from "../head"
import { writeDocument } from "../document"

/**
 * Reading the commit a checkout is on, and deciding whether a walkthrough may
 * be checked against it.
 *
 * The decision is the point. A walkthrough names the commit it was written
 * against, and checking it against a working tree on some other commit reports
 * every line number as wrong — which refuses the write, because a missing path
 * is an error. So the tree is used only when it is sitting on that commit, and
 * the agent is told plainly when it is not.
 */
/** A walkthrough naming a range `a.ts` does not have. */
function document(sha: string): string {
  return JSON.stringify({
    schema: 1,
    meta: { kind: "walkthrough", repo: "o/r", at: { pr: 7 }, head: sha },
    title: "One",
    contextBody: {
      context: "A fixture.",
      overview: [{ when: "a", then: "b" }],
      implementation: [{ label: "a.ts", items: [{ text: "Added it." }] }],
    },
    diagram: { absent: "This fixture has no flow." },
    codeWalkthrough: {
      files: [
        {
          path: "a.ts",
          summary: [],
          waypoints: [
            {
              id: "one",
              title: "One",
              reading: "It does.",
              code: {
                kind: "ref",
                lang: "ts",
                path: "a.ts",
                target: { focus: [5, 9] },
              },
            },
          ],
        },
      ],
    },
  })
}

suite("the commit a checkout is on", () => {
  const root = path.join(os.tmpdir(), "flight-plan-head-test")
  const git = path.join(root, ".git")
  const SHA = "9b8ab31000000000000000000000000000000000"
  const OTHER = "1111111111111111111111111111111111111111"

  const reset = async () => {
    await fs.rm(root, { recursive: true, force: true })
    await fs.mkdir(path.join(git, "refs", "heads"), { recursive: true })
  }

  suite("headSha", () => {
    test("reads a detached HEAD, which is the commit itself", async () => {
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      assert.strictEqual(await headSha(root), SHA)
    })

    test("follows a symbolic HEAD to the loose ref it names", async () => {
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), "ref: refs/heads/feature/a\n", "utf8")
      await fs.mkdir(path.join(git, "refs", "heads", "feature"), { recursive: true })
      await fs.writeFile(path.join(git, "refs", "heads", "feature", "a"), `${SHA}\n`, "utf8")
      assert.strictEqual(await headSha(root), SHA)
    })

    test("falls back to packed-refs when the loose ref was packed away", async () => {
      // A checkout that has been garbage collected has no file under
      // `refs/heads`, which is the case a naive reader reports as "no commit".
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), "ref: refs/heads/main\n", "utf8")
      await fs.writeFile(
        path.join(git, "packed-refs"),
        `# pack-refs with: peeled fully-peeled sorted\n${OTHER} refs/remotes/origin/main\n${SHA} refs/heads/main\n`,
        "utf8",
      )
      assert.strictEqual(await headSha(root), SHA)
    })

    test("answers null when there is no .git at all", async () => {
      await fs.rm(root, { recursive: true, force: true })
      await fs.mkdir(root, { recursive: true })
      assert.strictEqual(await headSha(root), null)
    })
  })

  suite("walkthroughRepository", () => {
    test("checks against the tree when it sits on the named commit", async () => {
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      await fs.writeFile(path.join(root, "a.ts"), "one\ntwo\n", "utf8")

      const outcome = await walkthroughRepository(root, SHA)
      assert.ok(outcome.ok, JSON.stringify(outcome))
      assert.strictEqual(outcome.repo.head, SHA)
      assert.strictEqual(await outcome.repo.readFile("a.ts"), "one\ntwo\n")
    })

    test("matches an abbreviated head against the full commit", async () => {
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      const outcome = await walkthroughRepository(root, SHA.slice(0, 8))
      assert.ok(outcome.ok, JSON.stringify(outcome))
    })

    test("says so when the commit was never fetched", async () => {
      // Not "the checkout is elsewhere", which is ordinary and fine. This
      // fixture is a bare HEAD file with no object database behind it, so the
      // commit genuinely is not here and there is nothing to read.
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${OTHER}\n`, "utf8")

      const outcome = await walkthroughRepository(root, SHA)
      assert.ok(!outcome.ok)
      assert.strictEqual(outcome.reason, "unfetched")
      assert.strictEqual(outcome.on, OTHER)
    })

    test("says so when no window has the repository open", async () => {
      const outcome = await walkthroughRepository(null, SHA)
      assert.ok(!outcome.ok)
      assert.strictEqual(outcome.reason, "no-checkout")
    })

    test("says so when the document names no commit", async () => {
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      const outcome = await walkthroughRepository(root, undefined)
      assert.ok(!outcome.ok)
      assert.strictEqual(outcome.reason, "no-head")
    })

    test("reads no file outside the checkout", async () => {
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      const outcome = await walkthroughRepository(root, SHA)
      assert.ok(outcome.ok)
      assert.strictEqual(await outcome.repo.readFile("../elsewhere.ts"), null)
    })

    test("its tree is what turns a wrong line range into a refusal", async () => {
      // The point of the wiring, end to end: before it, a walkthrough naming a
      // range past the end of a file was stored and the reader found out.
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      await fs.writeFile(path.join(root, "a.ts"), "one\ntwo\n", "utf8")

      const outcome = await walkthroughRepository(root, SHA)
      assert.ok(outcome.ok)
      const checked = await writeDocument(document(SHA), "walkthrough", outcome.repo, null, {
        findSymbol: null,
      })
      assert.ok(!checked.ok)
      assert.ok(
        !checked.ok && checked.message.includes("past the end"),
        checked.ok ? "" : checked.message,
      )
    })

    test("stores nothing when there is no tree to check against", async () => {
      // The mirror, and the line the JSON path draws differently from the one
      // it replaced. Markdown stored the document unchecked and said so; a
      // stored JSON document must carry a resolved range for every reference,
      // so there is no unchecked form of it to fall back on.
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${OTHER}\n`, "utf8")

      const outcome = await walkthroughRepository(root, SHA)
      assert.ok(!outcome.ok)
      const checked = await writeDocument(document(SHA), "walkthrough", null, null, {
        findSymbol: null,
      })
      assert.ok(!checked.ok)
      assert.ok(
        !checked.ok && checked.message.includes("no VS Code window"),
        checked.ok ? "" : checked.message,
      )
    })

    test("reports no changed files, so the coverage checks stay off", async () => {
      // There is no diff here. Coverage and the "not about this pull request"
      // error both need one, and inventing an empty answer for them would be
      // worse than leaving them off.
      await reset()
      await fs.writeFile(path.join(git, "HEAD"), `${SHA}\n`, "utf8")
      const outcome = await walkthroughRepository(root, SHA)
      assert.ok(outcome.ok)
      assert.deepStrictEqual(await outcome.repo.changedFiles(), [])
    })
  })
})
