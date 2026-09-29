import * as crypto from "node:crypto"
import { errorFields, log } from "../utils/log"

/**
 * Work an agent starts and comes back to.
 *
 * A walk of a real change parses every file it touches and searches the tree
 * once per declaration it climbs from. That is fast per step and unbounded in
 * steps: a pull request with sixty changed declarations across a large
 * repository takes longer than a client will hold a tool call open, and an
 * agent cut off mid-scaffold cannot tell a slow one from a broken one.
 *
 * So a scaffold starts, says so, and is polled. Nothing is lost by the wait:
 * the document being filled in is already open in the panel, so a reader
 * watches it arrive rather than waiting for it.
 *
 * In memory, and deliberately. A job is meaningful only to the server process
 * that is running it — the parsers it has loaded, the files it has cached, the
 * document it is amending all belong to that process — so a job that outlived
 * it would be an id pointing at nothing. An agent polling across a restart is
 * told the job is unknown, which is true.
 */

export type JobState = "running" | "done" | "failed"

export type Job = {
  id: string
  /**
   * Which document this is scaffolding, when it is scaffolding one.
   *
   * A job used to be anonymous, and that is what let an agent read a document
   * out from under its own scaffold: the read returned the opening with no
   * sections, which is exactly what a scaffold that found nothing returns. The
   * two have to be told apart by the tools rather than by the agent
   * remembering to poll, so the document says which job is still writing it.
   */
  subject?: string
  state: JobState
  /** What it is doing now, in the words the poll will report. */
  step: string
  done: number
  total: number
  /** Set when it failed, and then the only thing worth reading. */
  error?: string
  /**
   * What could not be read, kept rather than replaced.
   *
   * The degraded state has to survive the walk to be reported at the end: a
   * scaffold rich for one language and quietly empty for another is worse than
   * no scaffold at all, and this is where the "quietly" comes out.
   */
  notes: string[]
}

export type Report = (update: {
  step?: string
  done?: number
  total?: number
  note?: string
}) => void

const jobs = new Map<string, Job>()

/**
 * How many finished jobs to keep.
 *
 * Enough that an agent polling a little late still gets its answer, and few
 * enough that a long-lived server does not accumulate them. Running jobs are
 * never evicted: one of those is still writing a document.
 */
const KEEP = 32

function evict(): void {
  const finished = [...jobs.values()].filter((job) => job.state !== "running")
  if (finished.length <= KEEP) return
  for (const job of finished.slice(0, finished.length - KEEP)) jobs.delete(job.id)
}

/** Starts the work, and hands back the job before it has done any of it. */
export function startJob(
  run: (report: Report) => Promise<void>,
  /** The document being written, so a read of it can say it is not ready. */
  subject?: string,
): Job {
  const job: Job = {
    id: crypto.randomBytes(8).toString("hex"),
    ...(subject === undefined ? {} : { subject }),
    state: "running",
    step: "starting",
    done: 0,
    total: 0,
    notes: [],
  }
  jobs.set(job.id, job)
  evict()
  const began = Date.now()
  const where = { job: job.id, ...(subject === undefined ? {} : { subject }) }
  log("info", "job.start", where)

  // Each new step once, not every count inside it: the log should say where
  // a job spent its time and where it stopped.
  const report: Report = (update) => {
    if (update.step !== undefined && update.step !== job.step) {
      job.step = update.step
      log("info", "job.step", { ...where, step: update.step, ms: Date.now() - began })
    }
    if (update.done !== undefined) job.done = update.done
    if (update.total !== undefined) job.total = update.total
    if (update.note !== undefined) {
      job.notes.push(update.note)
      log("info", "job.note", { ...where, note: update.note })
    }
  }

  // Never awaited: the whole point is that the caller returns now. Both
  // outcomes are recorded, because a job that stayed "running" after a throw
  // would have an agent polling it until it gave up.
  void run(report).then(
    () => {
      // The step is left as the work last set it. `state` already says it
      // finished, and replacing the step with "finished" would throw away the
      // one line that says what it got through.
      job.state = "done"
      log("info", "job.done", { ...where, ms: Date.now() - began, notes: job.notes.length })
    },
    (cause: unknown) => {
      job.state = "failed"
      job.error = cause instanceof Error ? cause.message : String(cause)
      log("error", "job.failed", { ...where, ms: Date.now() - began, step: job.step, ...errorFields(cause) })
    },
  )

  return job
}

export function jobStatus(id: string): Job | undefined {
  return jobs.get(id)
}

/**
 * Waits a little for a job, and gives up without disturbing it.
 *
 * Almost every scaffold finishes in seconds, and making the agent poll for
 * something already done is ceremony — a round trip, a wait, and a second call
 * to learn what the first could have said. So the tool that starts one waits a
 * short while first.
 *
 * The job is not cancelled and not awaited beyond the budget: a slow one keeps
 * running and stays pollable, which is the case the job shape exists for. A
 * client cuts off a tool call that runs too long, and an agent cut off mid-call
 * cannot tell a slow scaffold from a broken one.
 *
 * Polled rather than promise-chained because a job is a plain record with no
 * completion hook, and adding one to serve a wait nobody is guaranteed to make
 * would put the machinery in the wrong place.
 */
export async function settleWithin(id: string, budgetMs: number): Promise<Job | undefined> {
  const until = Date.now() + budgetMs
  for (;;) {
    const job = jobs.get(id)
    if (job === undefined || job.state !== "running") return job
    if (Date.now() >= until) return job
    await new Promise((settle) => setTimeout(settle, 50))
  }
}

/**
 * The scaffold still writing this document, if one is.
 *
 * What makes the wait enforceable rather than merely instructed. Reading a
 * half-written document returns an opening with no sections, and an agent that
 * has not waited reads that as a scaffold which found nothing — then writes the
 * structure by hand, which is the one thing the whole derivation exists to
 * stop. The tools ask this first and refuse, so the mistake is not available.
 */
export function runningJob(subject: string): Job | undefined {
  for (const job of jobs.values()) {
    if (job.state === "running" && job.subject === subject) return job
  }
  return undefined
}

/**
 * The latest scaffold for a subject, when it failed.
 *
 * `start` waits 60 seconds and then hands back "running". A job that failed
 * after that used to vanish from every answer: `runningJob` no longer found
 * it, so `read` returned the opening as if the scaffold had finished with
 * nothing, and the reason was kept here and never said. Jobs are kept in the
 * order they started, so the last one for a subject is the one that counts; a
 * newer `start` replaces a failure with its own job.
 */
export function failedJob(subject: string): Job | undefined {
  let last: Job | undefined
  for (const job of jobs.values()) {
    if (job.subject === subject) last = job
  }
  return last?.state === "failed" ? last : undefined
}

