import * as assert from "assert"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { receive } from "../channel"
import { gitAdapterFor, parseGitAdapterSelection, setGitAdapterSelection } from "../../../utils/git-adapter/helpers/session"

/**
 * The `{adapter}` line: the extension hands the server its adapter, and a
 * line that is not one changes nothing.
 */
suite("control channel, server end", () => {
  let root = ""

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "fp-channel-"))
  })
  afterAll(async () => {
    setGitAdapterSelection(null)
    await fs.rm(root, { recursive: true, force: true })
  })

  test("parses a selection and drops a malformed one", () => {
    assert.deepStrictEqual(parseGitAdapterSelection({ id: "github", baseUrl: "", username: "", secret: "t" }), {
      id: "github",
      baseUrl: "",
      username: "",
      secret: "t",
    })
    assert.strictEqual(parseGitAdapterSelection({ id: "sourceforge" }), null)
    assert.strictEqual(parseGitAdapterSelection("github"), null)
    assert.strictEqual(parseGitAdapterSelection({ id: "gitlab", secret: "" })?.secret, null)
  })

  test("uses plain git until a selection arrives, then the one sent", async () => {
    const before = await gitAdapterFor(root)
    assert.ok(before.ok, "plain git needs no remote and no credential")
    assert.strictEqual(before.gitAdapter.id, "git")

    receive(JSON.stringify({ forge: { id: "github", baseUrl: "", username: "", secret: "t" } }))
    const after = await gitAdapterFor(root)
    // No remote in this folder, so GitHub refuses: the point is that it was asked.
    assert.strictEqual(after.ok, false)

    receive("not json {forge")
    receive(JSON.stringify({ forge: { id: "nope" } }))
    assert.strictEqual((await gitAdapterFor(root)).ok, false, "a bad line keeps the gitAdapter that was there")

    receive(JSON.stringify({ forge: null }))
    assert.strictEqual((await gitAdapterFor(root)).ok, true, "null goes back to plain git")
  })
})
