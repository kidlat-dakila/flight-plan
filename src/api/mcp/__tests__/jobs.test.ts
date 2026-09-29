import * as assert from "assert"
import { failedJob, jobStatus, runningJob, settleWithin, startJob } from "../jobs"

/**
 * Work an agent starts and comes back to.
 *
 * Measured: a call-graph question costs about two hundred milliseconds against
 * TypeScript and near three seconds against Pylance. A pull request with sixty
 * changed declarations is therefore twelve seconds or three minutes depending
 * on the language, and three minutes is not a tool call — a client cuts it off,
 * and the agent is left unable to tell a slow scaffold from a broken one.
 *
 * So the scaffold starts and says it started. The document it is filling in is
 * already open in the panel, so the reader watches it arrive rather than
 * waiting for it.
 */

const settled = async (id: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (jobStatus(id)?.state !== "running") return
    await new Promise((wait) => setTimeout(wait, 5))
  }
  throw new Error("the job never settled")
}

suite("a job the agent polls", () => {
  test("is running before the work has finished", async () => {
    let release = (): void => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    const job = startJob(async () => await held)
    // The point of the whole shape: this is true *now*, not in three minutes.
    assert.strictEqual(job.state, "running")
    assert.strictEqual(jobStatus(job.id)?.state, "running")

    release()
    await settled(job.id)
    assert.strictEqual(jobStatus(job.id)?.state, "done")
  })

  test("carries what the work says it is doing", async () => {
    const job = startJob(async (report) => {
      report({ step: "reading the diff", done: 0, total: 3 })
      report({ step: "walking src/a.ts", done: 1, total: 3 })
    })
    await settled(job.id)

    const status = jobStatus(job.id)
    assert.strictEqual(status?.step, "walking src/a.ts")
    assert.strictEqual(status?.done, 1)
    assert.strictEqual(status?.total, 3)
  })

  test("keeps what could not be read, rather than only the last of it", async () => {
    // The degraded state has to survive the walk to be reported at the end. A
    // scaffold rich for one language and quietly empty for another is worse
    // than no scaffold, and this is where the "quietly" is removed.
    const job = startJob(async (report) => {
      report({ note: "no language server for lib/order.rb" })
      report({ note: "no language server for config/routes.rb" })
    })
    await settled(job.id)

    assert.deepStrictEqual(jobStatus(job.id)?.notes, [
      "no language server for lib/order.rb",
      "no language server for config/routes.rb",
    ])
  })

  test("fails with the reason, rather than staying busy forever", async () => {
    const job = startJob(async () => {
      throw new Error("the commit is not in this checkout")
    })
    await settled(job.id)

    const status = jobStatus(job.id)
    assert.strictEqual(status?.state, "failed")
    assert.match(status?.error ?? "", /not in this checkout/)
  })

  test("does not report one job's progress under another's name", async () => {
    const first = startJob(async (report) => {
      report({ step: "first" })
    })
    const second = startJob(async (report) => {
      report({ step: "second" })
    })
    await settled(first.id)
    await settled(second.id)

    assert.notStrictEqual(first.id, second.id)
    assert.strictEqual(jobStatus(first.id)?.step, "first")
    assert.strictEqual(jobStatus(second.id)?.step, "second")
  })

  test("says nothing about a job it has never heard of", () => {
    // An agent that polls an id from a server that has since restarted gets a
    // plain answer rather than an invented one.
    assert.strictEqual(jobStatus("not-a-job"), undefined)
  })
})

/**
 * Which document a scaffold is still writing.
 *
 * The failure this exists for: an agent that did not wait read the document,
 * got the opening with no sections, and took that for a scaffold which found
 * nothing — then wrote the structure by hand, which is the one thing the whole
 * derivation exists to stop. The tools ask this before they answer, so the
 * misreading is not available rather than merely discouraged.
 */
suite("the scaffold still writing a document", () => {
  test("names the running job for that document and nothing else", async () => {
    let finish = (): void => undefined
    const job = startJob(
      async () => await new Promise<void>((settle) => (finish = settle)),
      "walkthrough:acme/shop#4",
    )

    assert.strictEqual(runningJob("walkthrough:acme/shop#4")?.id, job.id)
    // A different document is not this one, and a document with no job is not
    // waiting for anything.
    assert.strictEqual(runningJob("walkthrough:acme/shop#5"), undefined)
    assert.strictEqual(runningJob("plan:acme/shop:sweep"), undefined)

    finish()
    await settled(job.id)
    assert.strictEqual(runningJob("walkthrough:acme/shop#4"), undefined)
  })

  test("stops naming a job that failed, so the refusal does not outlive it", async () => {
    // A failed scaffold is reported by start. Holding the read shut
    // after it would leave the document unreadable with nothing to wait for.
    const job = startJob(async () => {
      throw new Error("no worktree")
    }, "plan:acme/shop:sweep")

    await settled(job.id)
    assert.strictEqual(jobStatus(job.id)?.state, "failed")
    assert.strictEqual(runningJob("plan:acme/shop:sweep"), undefined)
  })

  test("keeps a failure after start stopped waiting, until a newer start", async () => {
    // start waits 60 s, then says "running"; a job that fails later must
    // still be said by read, or the opening reads as a scaffold that found
    // nothing.
    const failing = startJob(async () => {
      throw new Error("out of memory")
    }, "walkthrough:acme/shop#9")
    await settled(failing.id)
    assert.strictEqual(failedJob("walkthrough:acme/shop#9")?.error, "out of memory")
    assert.strictEqual(failedJob("walkthrough:acme/shop#10"), undefined)

    const retry = startJob(async () => undefined, "walkthrough:acme/shop#9")
    await settled(retry.id)
    assert.strictEqual(failedJob("walkthrough:acme/shop#9"), undefined)
  })

  test("leaves a job with no subject out of it", async () => {
    // Not every job scaffolds a document, and one that does not should never
    // hold a read shut.
    const job = startJob(async () => undefined)
    await settled(job.id)
    assert.strictEqual(jobStatus(job.id)?.subject, undefined)
  })
})

suite("waiting for a job instead of polling it", () => {
  test("returns as soon as the work finishes", async () => {
    const job = startJob(async () => {
      await new Promise((settle) => setTimeout(settle, 20))
    })
    const started = Date.now()
    const settled = await settleWithin(job.id, 5_000)
    assert.strictEqual(settled?.state, "done")
    assert.ok(Date.now() - started < 1_000, "it waited far longer than the work took")
  })

  test("gives up on the budget and leaves the job running", async () => {
    let release = (): void => undefined
    const job = startJob(async () => {
      await new Promise<void>((settle) => {
        release = settle
      })
    })

    const settled = await settleWithin(job.id, 60)
    // Still running, and still pollable: a slow scaffold is the case the job
    // shape exists for, and giving up on the wait must not disturb it.
    assert.strictEqual(settled?.state, "running")
    assert.strictEqual(jobStatus(job.id)?.state, "running")

    release()
    await new Promise((settle) => setTimeout(settle, 20))
    assert.strictEqual(jobStatus(job.id)?.state, "done")
  })

  test("reports a failure rather than waiting out the budget", async () => {
    const job = startJob(async () => {
      throw new Error("no grammar")
    })
    const settled = await settleWithin(job.id, 5_000)
    assert.strictEqual(settled?.state, "failed")
    assert.match(settled?.error ?? "", /no grammar/)
  })

  test("says nothing about a job it has never heard of", async () => {
    assert.strictEqual(await settleWithin("nope", 50), undefined)
  })
})
