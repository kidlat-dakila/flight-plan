import * as assert from "assert"

import { YOU, describeRow, groupByAuthor } from "../prGrouping"


/*
 * Grouping the review list by author.
 *
 * The rule with a decision in it is the order. The list already sorts itself by
 * what is waiting for the reader, and grouping must not throw that away and
 * replace it with an alphabet.
 */
suite("groupByAuthor", () => {
  const row = (author: string, reason = "review-requested") => ({ author, reason })

  test("keeps the order the authors first appeared in", () => {
    const groups = groupByAuthor([
      row("ada"),
      row("bo"),
      row("ada"),
      row("zoe"),
    ])
    assert.deepStrictEqual(
      groups.map((group) => group.author),
      ["ada", "bo", "zoe"],
    )
    assert.deepStrictEqual(groups[0]?.rows.length, 2)
  })

  test("puts your own group last, whoever else is in the list", () => {
    const groups = groupByAuthor([row("you", "mine"), row("ada"), row("bo")])
    assert.deepStrictEqual(
      groups.map((group) => group.author),
      ["ada", "bo", "you"],
    )
    assert.strictEqual(groups[2]?.mine, true)
  })

  test("one row of your own makes the group yours", () => {
    // The same author appears twice when a change of yours also asks for your
    // review, and the group is still yours.
    const groups = groupByAuthor([row("you", "review-requested"), row("you", "mine")])
    assert.strictEqual(groups[0]?.mine, true)
    assert.strictEqual(groups[0]?.rows.length, 2)
  })

  test("a pinned row is grouped like any other", () => {
    const groups = groupByAuthor([row("ada", "pinned"), row("ada")])
    assert.deepStrictEqual(groups.length, 1)
    assert.strictEqual(groups[0]?.mine, false)
  })

  test("no rows, no groups", () => {
    assert.deepStrictEqual(groupByAuthor([]), [])
  })

  test("names your own group without naming you", () => {
    assert.strictEqual(YOU, "You")
  })
})

/*
 * The dim text after a row's title.
 *
 * Grouping drops the author from it, because the group's label already says
 * who wrote it. Joined from parts for that reason: a row that lost the author
 * used to render `draft ·  · no walkthrough`.
 */
suite("describe", () => {
  const row = (over: Record<string, unknown> = {}, walkthrough = "present") => ({
    author: "ada",
    reason: "review-requested",
    isDraft: false,
    walkthrough,
    ...over,
  })

  test("names the author when the list is flat", () => {
    assert.strictEqual(describeRow(row(), false), "ada")
  })

  test("says yours for your own, still only when flat", () => {
    assert.strictEqual(describeRow(row({ reason: "mine" }), false), "yours")
    assert.strictEqual(describeRow(row({ reason: "mine" }), true), "")
  })

  test("drops the author when grouped, and keeps the rest", () => {
    assert.strictEqual(describeRow(row({}, "absent"), true), "no walkthrough")
  })

  test("joins a draft change and a missing walkthrough with one separator", () => {
    // The bug this function was rewritten for: two separators and no author.
    assert.strictEqual(
      describeRow(row({ isDraft: true }, "absent"), true),
      "draft · no walkthrough",
    )
    assert.strictEqual(
      describeRow(row({ isDraft: true }, "absent"), false),
      "draft · ada · no walkthrough",
    )
  })

  test("says nothing for a published walkthrough in a group", () => {
    assert.strictEqual(describeRow(row(), true), "")
  })
})
