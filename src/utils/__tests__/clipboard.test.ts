import * as assert from "assert"
import {
  documentReference,
  generationPrompt,
  planPrompts,
  walkthroughPrompts,
} from "../clipboard"
import { TOOL_NAMES } from "../../api/mcp/contract"

suite("what the title bar copies", () => {
  suite("the document reference", () => {
    test("names the tool that can fetch it", () => {
      assert.strictEqual(
        documentReference("create:owner/repo@order-stock-guard", "read"),
        "[mcp:read] create:owner/repo@order-stock-guard",
      )
    })

    test("omits the hint for a document on the reader's own disk", () => {
      // A Markdown file opened straight from the editor is not in storage, so
      // there is no MCP tool to name and the bare path is what an assistant in
      // the same workspace needs.
      assert.strictEqual(documentReference("docs/notes.md", ""), "docs/notes.md")
      assert.strictEqual(documentReference("docs/notes.md", "  "), "docs/notes.md")
    })
  })

  suite("prompts per kind", () => {
    test("a plan's prompts name the plan and the tool that stores it", () => {
      const prompts = planPrompts("owner/repo", "mcp-consumer-guide-tool")
      for (const prompt of [prompts.update, prompts.regenerate]) {
        // No plan skill exists, so the prompt names the plan by the ref `read`
        // takes and starts from the writing rules.
        assert.ok(prompt.includes("create:owner/repo@mcp-consumer-guide-tool"))
        assert.ok(prompt.includes("get-instructions"))
        assert.ok(prompt.includes('"mcp-consumer-guide-tool"'))
        // `update-plan` is the one tool that stores a plan, new or not.
        assert.ok(prompt.includes("update-plan"))
        assert.ok(prompt.includes("open-plan"))
        assert.ok(prompt.includes("working tree"))
      }
    })

    test("a plan's regenerate prompt overrides rather than edits", () => {
      const { regenerate } = planPrompts("owner/repo", "thing")
      assert.ok(regenerate.includes("again from scratch"))
      assert.ok(regenerate.includes("ignore what is stored"))
    })

    test("a walkthrough's prompts address it by number", () => {
      const prompts = walkthroughPrompts("owner/repo", { kind: "pr", number: 412 })
      for (const prompt of [prompts.update, prompts.regenerate]) {
        assert.ok(prompt.startsWith("/flightplan:review owner/repo#412"), prompt)
        // Both say how to store, because the two are different jobs: one
        // amends what is there section by section, the other discards it.
        assert.ok(prompt.includes("call complete"), prompt)
      }
    })

    test("refreshing preserves, starting over does not", () => {
      const prompts = walkthroughPrompts("owner/repo", { kind: "pr", number: 1 })
      assert.ok(prompts.update.includes("keep the parts I have edited"))
      assert.ok(prompts.regenerate.includes("from scratch"))
      assert.ok(!prompts.regenerate.includes("keep the parts"))
      // Discarding has to be asked for. Refreshing must never reach the one
      // argument that throws a reviewed walkthrough away.
      assert.ok(prompts.regenerate.includes("start with reset"))
      assert.ok(!prompts.update.includes("reset"))
    })

    test("there is one skill for a pull request, and it is review", () => {
      // The skills that once refreshed or generated a walkthrough are gone:
      // nothing should invoke a slash command by those names any more.
      const all = [
        generationPrompt("owner/repo", { kind: "pr", number: 7 }),
        ...Object.values(walkthroughPrompts("owner/repo", { kind: "pr", number: 7 })),
      ]
      for (const prompt of all) {
        assert.ok(prompt.startsWith("/flightplan:review owner/repo#7"), prompt)
        assert.ok(!prompt.includes("/flightplan:update-pr-description"), prompt)
        assert.ok(!prompt.includes("/flightplan:generate-pr-description"), prompt)
      }
    })
  })
})

suite("no prompt names a tool or skill that does not exist", () => {
  // These strings reach an agent. A name that is not registered sends it
  // looking for a tool it cannot call, which is how every one of these prompts
  // went stale once already.
  const all = [
    generationPrompt("owner/repo", { kind: "pr", number: 7 }),
    ...Object.values(walkthroughPrompts("owner/repo", { kind: "pr", number: 7 })),
    ...Object.values(walkthroughPrompts("owner/repo", { kind: "branch", name: "x" })),
    ...Object.values(planPrompts("owner/repo", "thing")),
  ]

  test("every skill named is one the plugin ships", () => {
    for (const prompt of all) {
      for (const [, skill] of prompt.matchAll(/\/flightplan:([a-z-]+)/g)) {
        assert.strictEqual(skill, "review", prompt)
      }
    }
  })

  test("every hyphenated tool-like name is a registered tool", () => {
    const known = new Set<string>(TOOL_NAMES)
    for (const prompt of all) {
      for (const [name] of prompt.matchAll(/\b[a-z]+(?:-[a-z]+)+\b/g)) {
        if (name.startsWith("flightplan")) continue
        assert.ok(known.has(name), `${name} in: ${prompt}`)
      }
    }
  })
})
