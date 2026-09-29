import * as assert from "assert"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import {
  groupPlansByBranch,
  planSummaryOf,
  visiblePlans,
  type PlanRow,
} from "../planGrouping"
import { createStorage, type StorageConfig } from "../../../api/mcp/storage"

const row = (
  name: string,
  branch: string | null,
  archived = false,
): PlanRow => ({ name, title: name, branch, archived })

suite("plans view", () => {
  suite("grouping by branch", () => {
    test("keeps the order the rows arrived in", () => {
      // The list is newest first, so the branch you last wrote a plan on has to
      // stay at the top rather than being sorted alphabetically away from it.
      const groups = groupPlansByBranch([
        row("z", "feature/z"),
        row("a", "feature/a"),
        row("z2", "feature/z"),
      ])
      assert.deepStrictEqual(
        groups.map((g) => g.branch),
        ["feature/z", "feature/a"],
      )
    })

    test("puts every plan of a branch under it", () => {
      const groups = groupPlansByBranch([
        row("one", "feature/x"),
        row("two", "feature/y"),
        row("three", "feature/x"),
      ])
      const x = groups.find((g) => g.branch === "feature/x")
      assert.deepStrictEqual(x?.rows.map((r) => r.name), ["one", "three"])
    })

    test("files plans with no branch last", () => {
      // They have the least to say about where they belong, so they should not
      // sit above branches that do.
      const groups = groupPlansByBranch([
        row("loose", null),
        row("placed", "feature/x"),
      ])
      assert.deepStrictEqual(
        groups.map((g) => g.branch),
        ["feature/x", null],
      )
    })

    test("returns nothing for no rows", () => {
      assert.deepStrictEqual(groupPlansByBranch([]), [])
    })
  })

  suite("archived rows", () => {
    const rows = [row("live", "b"), row("old", "b", true)]

    test("are hidden by default", () => {
      assert.deepStrictEqual(
        visiblePlans(rows, false).map((r) => r.name),
        ["live"],
      )
    })

    test("are shown when the toggle is on", () => {
      assert.strictEqual(visiblePlans(rows, true).length, 2)
    })

    test("does not mutate what it was given", () => {
      visiblePlans(rows, true).push(row("extra", "b"))
      assert.strictEqual(rows.length, 2)
    })
  })

  suite("a plan's title and branch", () => {
    const plan = (meta: Record<string, unknown>) =>
      JSON.stringify({
        schema: 1,
        meta: { kind: "plan", repo: "acme/storefront", name: "sweep", ...meta },
        title: "Release lapsed reservations",
        contextBody: { context: "Why." },
        diagram: { absent: "None." },
        codeWalkthrough: { files: [] },
        sources: {},
      })

    test("come from the stored JSON", () => {
      assert.deepStrictEqual(planSummaryOf(plan({ branch: "sweep-reservations" })), {
        title: "Release lapsed reservations",
        branch: "sweep-reservations",
      })
    })

    test("has no branch when the plan records none", () => {
      assert.strictEqual(planSummaryOf(plan({}))?.branch, null)
    })

    test("is null for a file that is not a stored plan", () => {
      assert.strictEqual(planSummaryOf("# A Markdown plan"), null)
      assert.strictEqual(planSummaryOf(plan({ kind: "wiki", path: "a.ts" })), null)
    })
  })

  suite("the archive sidecar", () => {
    let root = ""
    let config: StorageConfig

    beforeAll(async () => {
      root = await fs.mkdtemp(path.join(os.tmpdir(), "flightplan-plans-"))
      config = {
        walkthroughRoot: path.join(root, "w"),
        planRoot: path.join(root, "p"),
      }
    })

    afterAll(async () => {
      await fs.rm(root, { recursive: true, force: true })
    })

    test("starts empty", async () => {
      const storage = createStorage(config)
      assert.deepStrictEqual(await storage.archivedPlans("o/r"), [])
    })

    test("archives and unarchives one plan", async () => {
      const storage = createStorage(config)
      await storage.writePlan("o/r", "one", "# One")
      await storage.setPlanArchived("o/r", "one", true)
      assert.deepStrictEqual(await storage.archivedPlans("o/r"), ["one"])
      await storage.setPlanArchived("o/r", "one", false)
      assert.deepStrictEqual(await storage.archivedPlans("o/r"), [])
    })

    test("keeps other archived plans when one is added", async () => {
      const storage = createStorage(config)
      await storage.setPlanArchived("o/r", "a", true)
      await storage.setPlanArchived("o/r", "b", true)
      assert.deepStrictEqual((await storage.archivedPlans("o/r")).sort(), ["a", "b"])
      await storage.setPlanArchived("o/r", "a", false)
      assert.deepStrictEqual(await storage.archivedPlans("o/r"), ["b"])
    })

    test("keeps the sidecar out of the plan list", async () => {
      // Plans and the sidecar are both `.json` in one directory, so the list
      // skips dot-files: the sidecar must never be mistaken for a plan.
      const storage = createStorage(config)
      await storage.writePlan("o/listed", "one", "{}")
      await storage.setPlanArchived("o/listed", "one", true)
      assert.deepStrictEqual(await storage.listPlans("o/listed"), ["one"])
    })

    test("creates a plan, then replaces it under the same name", async () => {
      // `update-plan` is the one plan write, so a second write is a new
      // version of the plan rather than a refusal.
      const storage = createStorage(config)
      assert.strictEqual(await storage.writePlan("o/versions", "one", "{}"), true)
      assert.strictEqual(await storage.writePlan("o/versions", "one", "{\"v\":2}"), false)
      assert.strictEqual(await storage.readPlan("o/versions", "one"), "{\"v\":2}")
    })

    test("stores a plan as JSON under its name", async () => {
      const storage = createStorage(config)
      await storage.writePlan("o/stored", "one", "{}")
      const text = await fs.readFile(path.join(config.planRoot, "o", "stored", "one.json"), "utf8")
      assert.strictEqual(text, "{}")
    })

    test("refuses a name that is not a plan name", async () => {
      const storage = createStorage(config)
      await assert.rejects(storage.setPlanArchived("o/r", "../escape", true))
    })

    test("treats a corrupt sidecar as nothing archived", async () => {
      // Failing the other way would hide every plan with no way to get them
      // back from inside the view.
      const storage = createStorage(config)
      await storage.setPlanArchived("o/r", "one", true)
      await fs.writeFile(
        path.join(config.planRoot, "o", "r", ".archived.json"),
        "{not json",
        "utf8",
      )
      assert.deepStrictEqual(await storage.archivedPlans("o/r"), [])
    })
  })
})
