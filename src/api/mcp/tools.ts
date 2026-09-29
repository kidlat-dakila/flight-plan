import * as fs from "node:fs/promises"
import { errorFields, log } from "../utils/log"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { readConfig } from "./config"
import { ProfileStore, profilesDir } from "./profiles"
import { descriptionRead } from "../../lib/schemas/defaultProfile"
import { resolveConfigurations } from "../../lib/schemas/resolveConfigurations"
import {
  configurationIndex,
  nearPaths,
  resolveSome,
} from "../../lib/schemas/configurationIndex"
import { readCheckouts } from "./checkouts"
import { createStorage, type WalkthroughKey } from "./storage"
import { readRepoFile } from "../../utils/repo"
import { walkthroughRepository } from "./head"
import type { Kind, Repository } from "./repository"
import { writeDocument } from "./document"
import { pullRequestFacts } from "../utils/pr/facts"
import { tell } from "./channel"
import { formatId, walkthroughName } from "./documentId"
import { amendDocument, stillDrafting } from "./amend"
import {
  fillNodes,
  fillWaypoints,
  reorderFiles,
  withPositions,
} from "./fill"
import { changesOf } from "./changes"
import { blobsFor, coveredCode, type Covered } from "./covered"
import {
  lineageOfNode,
  lineageOfWaypoint,
  nodeById,
  overviewOf,
  unfilledOf,
  unresolvedById,
} from "./projection"
import { failedJob, runningJob, settleWithin, startJob } from "./jobs"
import { buildScaffold, type ScaffoldResult } from "./scaffold"
import { buildReach } from "./reach"
import { assessBlast, fillBlastProse, resolveBlastUnproven } from "./blastFill"
import { checkBlast } from "../../lib/schemas/diagram/blast"
import { resolveChange } from "./resolveChange"
import { planIdOf, planRef, planTargetOf, type PlanTarget } from "./identity"
import { WORK_KINDS } from "../utils/document/worklist"
import { storedDocument, type StoredDocument } from "../../lib/schemas/document/stored"
import type { DocumentInput } from "../../lib/schemas/document/schema"
import type { OpenRequest } from "./control"
import {
  BRANCH_DESCRIPTION,
  PLAN_DOCUMENT_DESCRIPTION,
  PLAN_NAME_DESCRIPTION,
  REPO_DESCRIPTION,
} from "./contract"

/**
 * The Flight Plan tools.
 *
 * Bundled inside the VS Code extension rather than published to a registry. The
 * reason is version lock: the skills call these tools, and if the two came from
 * different places a skill calling a signature the installed server no longer
 * has would fail in a way that looks like the agent being stupid.
 *
 * Every handler resolves the configuration afresh, so the storage location can
 * change in Settings without restarting anything.
 */

const repo = z.string().describe(REPO_DESCRIPTION)
const pr = z
  .number()
  .int()
  .positive()
  .optional()
  .describe("Pull request number. Give this or a branch, not both.")
const branch = z.string().min(1).optional().describe(BRANCH_DESCRIPTION)
/**
 * How prose names code, said in the place an agent reads before it writes.
 *
 * A `code:` link and not a field of ids. A link is a path and lines: the lines
 * are looked up in the diff first and on the mainline otherwise, so one rule
 * answers every reference. The label is the anchor and backticks are what make
 * it one, so the reference repairs itself when the file is edited above it, and
 * every link is checked against the repository when the document is written.
 */
const CODE_LINK_FORM =
  "Name the code it comes from with a `code:` link, which is a path and lines: " +
  "[`hasStock()`](code:src/api/stock.ts#L300-320). A fragment that names a " +
  "symbol is refused. Backticks around the identifier are what anchor the link, " +
  "the path is repository-relative, and the lines are read on the branch for a " +
  "file this change touches and on origin/main for every other. " +
  "There is no field of ids; a scenario or item carrying one is refused."

const planName = z.string().describe(PLAN_NAME_DESCRIPTION)
const planDocument = z.string().describe(PLAN_DOCUMENT_DESCRIPTION)

/**
 * What a walkthrough is filed under, from whichever of the two was given.
 *
 * Exactly one, and the refusal says so rather than silently preferring the
 * number. An agent that sends both has misunderstood which change it is
 * describing, and picking one for it would file the walkthrough somewhere the
 * next call cannot find it.
 */
function walkthroughKey(
  pull: number | undefined,
  branchName: string | undefined,
): WalkthroughKey {
  if (pull !== undefined && branchName !== undefined) {
    throw new Error(
      "Give a pull request number or a branch, not both. They name different " +
        "things and a walkthrough is filed under one of them.",
    )
  }
  if (pull !== undefined) return { kind: "pr", number: pull }
  if (branchName !== undefined && branchName.trim() !== "") {
    return { kind: "branch", name: branchName.trim() }
  }
  throw new Error(
    "Give a pull request number, or a branch when the change has no pull " +
      "request yet.",
  )
}

/** How a walkthrough's subject reads back to the agent that filed it. */
function keyLabel(repoName: string, key: WalkthroughKey): string {
  return key.kind === "pr"
    ? `${repoName}#${String(key.number)}`
    : `${repoName} on ${key.name}`
}

/** Directory the bundled server was copied into; the config sits beside it. */
function serverDirectory(): string {
  return path.dirname(fileURLToPath(import.meta.url))
}

/**
 * Asks the extension to open something.
 *
 * A line on stdout, which works because the extension spawns this process and
 * reads its output, and because the HTTP transport left stdout free: under stdio
 * it was the protocol itself and this channel could not have existed.
 *
 * Fire and forget. The tool must not wait for a window that may not be there,
 * and an agent stalled on a tool call is worse than an unopened document, so it
 * reports what it asked for rather than what happened.
 */
function requestOpen(request: OpenRequest): void {
  tell({ open: request })
}

/**
 * Refuses a write whose document would not render correctly.
 *
 * The refusal is the point, and it was asked for explicitly: an assistant that
 * submits a broken walkthrough should be told at the moment of submitting,
 * while it still has the document in hand and can fix one field. Storing it and
 * reporting later means the reader finds out instead.
 *
 * Warnings are returned alongside a successful write rather than blocking it.
 * Coverage and context references are judgements the author is allowed to make
 * differently; a wrong line range is not.
 */
async function checked(
  body: string,
  kind: Kind,
  repo?: Repository,
  /** The checkout, for the diff a walkthrough needs. */
  root?: string | null,
): Promise<{ refusal: Result | null; warnings: string; stored: string }> {
  const outcome = await writeDocument(body, kind, repo ?? null, root ?? null)
  if (!outcome.ok) {
    return { refusal: failure(new Error(outcome.message)), warnings: "", stored: body }
  }
  return { refusal: null, warnings: outcome.warnings, stored: outcome.stored }
}

/**
 * The commit a document names, in `meta.head`.
 *
 * Read before the document is validated, because it decides which checkout
 * the rest of the checks run against.
 */
function headOf(body: string): string | undefined {
  try {
    const meta = (JSON.parse(body) as { meta?: { head?: unknown } }).meta
    return typeof meta?.head === "string" ? meta.head : undefined
  } catch {
    return undefined
  }
}

/**
 * Says so when the positions in a plan could not be verified.
 *
 * Appended to a *successful* write, because the write is genuinely fine and
 * refusing it would leave the agent with nowhere to put the plan. But silence
 * here would be the worst outcome: an unchecked plan looks exactly like a
 * checked one, and the reader would find out by writing code in the wrong
 * place.
 */
function unchecked(tree: Repository | null): string {
  return tree === null
    ? "\n\nThe positions were not checked: no VS Code window has this repository open, so there was no working tree to check them against. Open the repository in VS Code and update the plan to have them verified."
    : ""
}

type Result = {
  content: { type: "text"; text: string }[]
  isError?: boolean
}

function text(value: string): Result {
  return { content: [{ type: "text", text: value }] }
}

/**
 * Turns a thrown error into a tool result the agent can act on.
 *
 * Returned rather than thrown, and phrased as an instruction, because an agent
 * given "use the matching update tool" recovers in one step, while an agent
 * given a stack trace regenerates everything.
 */
function failure(cause: unknown): Result {
  const message = cause instanceof Error ? cause.message : String(cause)
  return { content: [{ type: "text", text: message }], isError: true }
}

async function storage() {
  return createStorage(await readConfig(serverDirectory()))
}

/**
 * The working tree a plan is checked against.
 *
 * The current branch, as the user asked for: a plan proposes code they are
 * about to write, so the only substrate that means anything is the one under
 * their editor. Not a commit, not the pull request head, not `origin/main`.
 *
 * Null when no window has the repository open. A plan is then stored with its
 * positions unchecked, which is worse than checking them and better than
 * checking them against some other tree.
 */

async function checkoutRoot(repo: string): Promise<string | null> {
  const checkouts = await readCheckouts(serverDirectory())
  return checkouts[repo] ?? null
}

async function workingTree(repo: string): Promise<Repository | null> {
  const root = await checkoutRoot(repo)
  if (root === null) return null

  const branch = await currentBranch(root)
  return {
    head: branch ?? "the current branch",
    // Through `readRepoFile`, so a path in a plan cannot read outside the
    // checkout. A plan is a document, and a document that names paths is
    // untrusted input for exactly the same reason a walkthrough is.
    readFile: async (file) => readRepoFile(root, file).catch(() => null),
    // Empty, which disables the coverage checks. Right for a plan: there is no
    // diff yet, so there is nothing it could have failed to cover.
    changedFiles: async () => [],
  }
}

/** The checked-out branch, read from `.git` without spawning anything. */
async function currentBranch(root: string): Promise<string | null> {
  try {
    const head = await fs.readFile(path.join(root, ".git", "HEAD"), "utf8")
    const match = /^ref: refs\/heads\/(.+)$/m.exec(head.trim())
    // A detached HEAD gives a bare SHA, which is a fine thing to report.
    return match?.[1] ?? head.trim().slice(0, 8)
  } catch {
    return null
  }
}

/**
 * Every tool call, logged: which tool, which document, how long, and what it
 * refused with. Not the arguments' content — a document is the agent's work
 * and the reader's code — only `plan` and `section`, which say which one.
 */
function logCalls(server: McpServer): void {
  const register = server.registerTool.bind(server) as (name: string, config: unknown, cb: unknown) => unknown
  ;(server as unknown as { registerTool: typeof register }).registerTool = (name, config, cb) => {
    const handler = cb as (args: Record<string, unknown>, extra: unknown) => Promise<{ isError?: boolean; content?: unknown[] }>
    const logged = async (args: Record<string, unknown>, extra: unknown) => {
      const began = Date.now()
      const which = {
        tool: name,
        ...(typeof args["plan"] === "string" ? { plan: args["plan"] } : {}),
        ...(typeof args["section"] === "string" ? { section: args["section"] } : {}),
      }
      try {
        const result = await handler(args, extra)
        const ms = Date.now() - began
        if (result.isError === true) {
          const text = (result.content ?? [])
            .map((part) => (typeof part === "object" && part !== null && "text" in part ? String((part as { text: unknown }).text) : ""))
            .join(" ")
          log("warn", "tool.refused", { ...which, ms, error: text.slice(0, 1000) })
        } else {
          log("info", "tool", { ...which, ms })
        }
        return result
      } catch (cause) {
        log("error", "tool.threw", { ...which, ms: Date.now() - began, ...errorFields(cause) })
        throw cause
      }
    }
    return register(name, config, logged)
  }
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "flightplan", version: "0.0.1" })
  logCalls(server)

  /*
   * Building a walkthrough a piece at a time.
   *
   * A walkthrough of a real change takes an agent minutes to write, and under
   * one big write the reader sees nothing for all of them and then everything
   * at once. These tools store the first piece immediately and add to it, so a
   * reader can start on the context while the tour is still being written.
   *
   * Two things make that safe. Each piece is resolved and checked when it
   * lands, so a broken reference is reported on the call that introduced it
   * rather than at the end. And the rules a *finished* document must pass —
   * it has an overview, it has waypoints — are held back for `complete-…`,
   * because a document being written breaks all of them by definition.
   *
   * The document says which state it is in, and the panel draws an indicator
   * from it: a reader who cannot tell a half-written document from a finished
   * one reads a gap as an omission.
   */

  /**
   * Reads a draft, applies one change, and stores the result.
   *
   * One helper for both kinds, because the differences between them are two
   * closures and a label. A walkthrough reads its files at the commit it names;
   * a plan reads the working tree, because it is about code the reader is about
   * to write.
   */
  type Draft = {
    kind: Kind
    /** How the document reads back to the agent that filed it. */
    label: string
    read: () => Promise<string | null>
    write: (body: string) => Promise<void>
    /** Which tool would have created it, named in the refusal when none has. */
    begin: string
  }

  const amend = async (
    r: string,
    draft: Draft,
    change: (document: DocumentInput) => DocumentInput,
    what: string,
    options: { complete?: boolean } = {},
  ): Promise<Result> => {
    const current = await draft.read()
    if (current === null) {
      return failure(
        new Error(`Nothing exists for ${draft.label} yet. Call ${draft.begin} first.`),
      )
    }

    const root = await checkoutRoot(r)
    const tree =
      draft.kind === "walkthrough"
        ? await walkthroughRepository(root, headOf(current))
        : null
    const repo =
      draft.kind === "walkthrough"
        ? tree !== null && tree.ok
          ? tree.repo
          : null
        : await workingTree(r)

    const outcome = await amendDocument(
      current,
      draft.kind,
      options.complete === true ? change : (document) => stillDrafting(change(document)),
      repo,
      root,
    )
    if (!outcome.ok) return failure(new Error(outcome.message))

    await draft.write(outcome.stored)
    return text(`${what} for ${draft.label}.${outcome.warnings}`)
  }

  /**
   * A file section added, or replaced when the file already has one.
   *
   * Replacing rather than appending, so a second call for the same path is a
   * correction rather than a duplicate -- which is what an agent that noticed a
   * mistake in a waypoint it just wrote will do.
   */
  /**
   * What a document is, while its scaffold is still writing it.
   *
   * Named per document rather than per job, because the tools that need to ask
   * have the document in hand and not the job id.
   */
  const scaffolding = (subject: string): string | null => {
    const job = runningJob(subject)
    if (job === undefined) return null
    const progress = job.total > 0 ? ` (${String(job.done)}/${String(job.total)})` : ""
    return (
      `The scaffold for this document is still running: ${job.step}${progress}. ` +
      `It has written nothing yet, so what is stored is the opening and no sections — ` +
      `which is not the same as a scaffold that found nothing. ` +
      `Call read again in a few seconds, until it says ready. ` +
      `Do not write the structure by hand in the meantime.`
    )
  }

  const walkthroughSubject = (r: string, key: WalkthroughKey): string =>
    `walkthrough:${keyLabel(r, key)}`

  /** The two drafts, each naming where it is read and written. */
  const walkthroughDraft = async (r: string, key: WalkthroughKey): Promise<Draft> => {
    const store = await storage()
    return {
      kind: "walkthrough",
      label: keyLabel(r, key),
      read: () => store.readWalkthrough(r, key),
      write: (body) => store.updateWalkthrough(r, key, body),
      begin: "start",
    }
  }

  const planDraft = async (r: string, name: string): Promise<Draft> => {
    const store = await storage()
    return {
      kind: "plan",
      label: `the plan "${name}" for ${r}`,
      read: () => store.readPlan(r, name),
      write: (body) => store.updatePlan(r, name, body),
      begin: "update-plan",
    }
  }

  /*
   * The six.
   *
   * One verb each for starting, reading, working and finishing, and the whole
   * argument for them is what the agent no longer has to do. The surface they
   * replace had sixteen tools for one document and exactly one way to read it,
   * which returned everything — so an agent orienting itself paid twice for
   * the prose it had just written, and went to `git` for the only thing it
   * actually needed.
   *
   * The division that matters is not read against write. It is **derived
   * against authored**: the scaffold owns the structure, the agent owns the
   * prose, and nothing here lets either write the other's half. `update-nodes`
   * has no field for a child, a path or a parent, so restructuring stays
   * unsayable rather than refused — the one guarantee that makes a scaffolded
   * board worth trusting.
   */

  /** Which document a call is about. A plan has no branch; a review has no name. */
  const documentType = z
    .enum(["review", "create"])
    .describe(
      "`review` for a walkthrough of a change that exists, `create` for a plan " +
        "of code that does not exist yet.",
    )
  const namedPlan = z
    .string()
    .optional()
    .describe(`For \`create\` only. ${PLAN_NAME_DESCRIPTION}`)

  /**
   * The draft a reference names.
   *
   * A plan is keyed by a name and a walkthrough by a pull request or a branch,
   * and that is not an inconsistency to paper over: a plan describes code that
   * does not exist, so there is no change to point at. The reference carries
   * which of the two it is, so nothing here has to work it out from which
   * fields happened to be filled in.
   */
  const targetDraft = async (target: PlanTarget): Promise<Draft> =>
    target.kind === "create"
      ? await planDraft(target.repo, target.name)
      : await walkthroughDraft(target.repo, target.key)

  const targetSubject = (target: PlanTarget): string =>
    target.kind === "create"
      ? `plan:${target.repo}:${target.name}`
      : walkthroughSubject(target.repo, target.key)

  /**
   * The stored document, parsed, with the half-scaffolded case named.
   *
   * Asked before the read and not after, for the reason the surface this
   * replaces gave: a document whose scaffold has not finished reads as an empty
   * one, and those two states are indistinguishable from the answer unless the
   * answer distinguishes them.
   */
  const storedOf = async (
    target: PlanTarget,
  ): Promise<{ doc: StoredDocument; draft: Draft } | { error: string }> => {
    const waiting = scaffolding(targetSubject(target))
    if (waiting !== null) return { error: waiting }

    const draft = await targetDraft(target)
    const body = await draft.read()
    if (body === null) {
      return {
        error: `Nothing exists for ${draft.label} yet. Call ${draft.begin} first.`,
      }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return {
        error: `${draft.label} is not valid JSON, so it cannot be read back. Start it again.`,
      }
    }
    const read = storedDocument.safeParse(parsed)
    if (!read.success) {
      return {
        error: `${draft.label} could not be read back: ${read.error.issues[0]?.message ?? "it does not match the schema"}`,
      }
    }
    return { doc: read.data, draft }
  }

  const json = (value: unknown): Result => text(JSON.stringify(value, null, 2))

  server.registerTool(
    "update-plan",
    {
      title: "Write an implementation plan",
      description:
        "Stores a whole plan, checked against the working tree: creates it, or " +
        "replaces the one with that name. To change a plan that exists, read it " +
        "first and build on what is there. A plan is written whole rather than " +
        "filled in, because nothing scaffolds it: its code does not exist yet, so " +
        "there is no structure to derive and no ids to write onto.",
      inputSchema: { repo, name: planName, document: planDocument },
    },
    async ({ repo: r, name, document: body }) => {
      try {
        const tree = await workingTree(r)
        const checks = await checked(body, "plan", tree ?? undefined, await checkoutRoot(r))
        if (checks.refusal !== null) return checks.refusal
        const created = await (await storage()).writePlan(r, name, checks.stored)
        return text(
          `${created ? "Created" : "Replaced"} the plan "${name}" for ${r}.${unchecked(tree)}${checks.warnings}`,
        )
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "list-plans",
    {
      title: "List implementation plans",
      description:
        "Plan names for a repository, oldest first. Use it to find a plan whose " +
        "name you do not know.",
      inputSchema: { repo },
    },
    async ({ repo: r }) => {
      try {
        const names = await (await storage()).listPlans(r)
        return text(
          names.length === 0
            ? `No plans exist for ${r} yet.`
            : names.map((name) => `- ${name}`).join("\n"),
        )
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "open-plan",
    {
      title: "Open an implementation plan in the editor",
      description:
        "Asks VS Code to open a plan. Never blocks, and cannot know whether a " +
        "window acted.",
      inputSchema: { repo, name: planName },
    },
    async ({ repo: r, name }) => {
      try {
        const found = await (await storage()).readPlan(r, name)
        if (found === null) {
          return failure(
            new Error(
              `No plan named "${name}" exists for ${r} yet, so there is nothing to open.`,
            ),
          )
        }
        requestOpen({ kind: "plan", repo: r, name })
        return text(`Asked VS Code to open the plan "${name}" for ${r}.`)
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  /*
   * A fence, typed where the call is made.
   *
   * These were `z.record(z.string(), z.unknown())` — a free-form object with
   * the real shape written down 500 lines away in a reference file. An agent
   * that has not read that file invents a shape and the tool takes it, which
   * is the purest way a surface can teach something false. The document
   * refuses it later, and "later" is after the whole call.
   *
   * Mirrors `document/schema.ts` rather than importing it: the schemas there
   * are the authored shapes and these are the same shapes as an MCP argument,
   * which has no `.strict()` and no cross-field refinements. What must not
   * drift is the field names, and a test holds those against the document.
   */
  const lineRangeArg = z
    .union([
      z.tuple([z.number().int().positive(), z.number().int().positive()]),
      z.object({ from: z.number().int().positive(), to: z.number().int().positive() }),
    ])
    .describe("An inclusive line range, as [from, to] or { from, to }.")

  const fenceArg = z
    .discriminatedUnion("kind", [
      z.object({
        kind: z.literal("ref"),
        lang: z.string().describe("The file's extension, for highlighting."),
        path: z.string().describe("Repository-relative path."),
        target: z
          .union([
            z.object({
              symbol: z
                .string()
                .describe("A declaration's own name. Preferred: it survives the file moving."),
            }),
            z.object({ focus: lineRangeArg }),
          ])
          .describe("A symbol where one exists, a line range where none does."),
        covers: z
          .array(z.number().int().min(0))
          .optional()
          .describe("Which hunks of this file the card explains, by index."),
      }),
      z.object({
        kind: z.literal("proposal"),
        lang: z.string(),
        path: z.string(),
        position: z
          .discriminatedUnion("kind", [
            z.object({ kind: z.literal("after"), line: z.number().int().positive() }),
            z.object({ kind: z.literal("before"), line: z.number().int().positive() }),
            z.object({ kind: z.literal("replace"), lines: lineRangeArg }),
            z.object({ kind: z.literal("new") }),
          ])
          .describe("Where the proposed body goes. `new` means the file does not exist."),
        body: z.string().describe("Complete code somebody will type, not a sketch."),
        marks: z
          .array(lineRangeArg)
          .optional()
          .describe("Counted from the first proposed line, not from the file."),
      }),
    ])
    .describe("Code that exists (`ref`), or code being proposed (`proposal`).")

  server.registerTool(
    "start",
    {
      title: "Start a flight plan",
      description:
        "Begins a walkthrough of a change, or a plan for code that does not exist " +
        "yet, and opens it for the reader at once. Scaffolds the structure from " +
        "the diff and the call graph, waits for it, and returns the overview — so " +
        "there is nothing to poll and nothing to read afterwards. It returns a " +
        "`plan` reference; every other tool takes that and nothing else. Call " +
        "this first, then work the list from `nodes`, then `complete`.",
      inputSchema: {
        repo,
        type: documentType,
        pr,
        branch,
        name: namedPlan,
        context: z
          .string()
          .describe(
            "Why anyone should care, in five sentences at most. No identifiers " +
              "and no paths: those belong in the sections below it.",
          ),
        head: z
          .string()
          .optional()
          .describe(
            "Only if you already have it. Otherwise it is looked up: a branch's " +
              "tip from git, a pull request's head from the host.",
          ),
        base: z
          .string()
          .optional()
          .describe(
            "Only if you already have it. Otherwise it is the merge base with " +
              "trunk, worked out from the checkout.",
          ),
        title: z
          .string()
          .optional()
          .describe(
            "Only if you already have it. Otherwise it is the pull request's own " +
              "title, or a branch's tip commit subject. Never an improved one.",
          ),
        reset: z
          .object({
            confirm: z.literal(true),
            discarding: z
              .string()
              .describe(
                "What is about to be thrown away, in your own words. Echoed back " +
                  "so the call cannot be made without having looked.",
              ),
          })
          .optional()
          .describe(
            "Discards an existing document and starts again. Only when the user " +
              "has asked to start over in as many words — it throws away whatever " +
              "a human has edited.",
          ),
      },
    },
    async ({ repo: r, type, pr: n, branch: b, name, context, head: given, base: from, title: named, reset }) => {
      try {
        const root = await checkoutRoot(r)
        if (root === null) {
          return failure(
            new Error(
              `No window has ${r} open, so there is no checkout to read from. Open it in VS Code, or pass head, base and title yourself.`,
            ),
          )
        }

        /*
         * A plan is not started, it is written.
         *
         * `start` exists to scaffold a structure and hand back the gaps in it,
         * and a plan has neither: its code does not exist, so there is no diff
         * to derive from. Saying that here, with the call that does work, is
         * worth more than a type this tool quietly accepts and mishandles.
         */
        if (type === "create") {
          return failure(
            new Error(
              "A plan is written whole rather than started and filled in: nothing scaffolds it, because its code does not exist yet. Use update-plan with the complete document. `read` and `nodes` work on a plan once it exists.",
            ),
          )
        }

        const key = walkthroughKey(n, b)
        const target: PlanTarget = { kind: "review", repo: r, key }
        const change = await resolveChange({
          root,
          repo: r,
          pr: n,
          branch: b,
          head: given,
          base: from,
          title: named,
          lookUpPullRequest: (repo, pr) => pullRequestFacts(serverDirectory(), repo, pr),
        })
        const at = change.head
        const base = change.base
        const title = change.title

        const opening: Record<string, unknown> = {
          schema: 1,
          meta: {
            kind: "walkthrough",
            repo: r,
            at: n === undefined ? { branch: b } : { pr: n },
            head: at,
            ...(base === undefined ? {} : { base }),
            status: "drafting",
          },
          title,
          contextBody: { context },
          diagram: { absent: "Not drawn yet." },
          codeWalkthrough: { files: [] },
        }

        const tree = await walkthroughRepository(root, at)
        const outcome = await writeDocument(
          JSON.stringify(opening),
          "walkthrough",
          tree.ok ? tree.repo : null,
          root,
        )
        if (!outcome.ok) return failure(new Error(outcome.message))

        const store = await storage()
        if (reset !== undefined) await store.updateWalkthrough(r, key, outcome.stored)
        else await store.createWalkthrough(r, key, outcome.stored)
        // Opened now rather than at the end: the context is the part a reader
        // can act on soonest, and waiting means they see nothing until the
        // whole tour is written.
        requestOpen({ kind: "walkthrough", repo: r, ref: key })

        const draft = await walkthroughDraft(r, key)
        const job = startJob(async (report) => {
          /*
           * Whatever had to be worked around to name the change, said first.
           *
           * `resolveChange` returns these and nothing used to read them, so a
           * base that fell back to trunk — which on a stacked pull request puts
           * the commits of the ones below it into this diff — was a silent
           * substitution. They ride the scaffold's own notes, which `start`
           * already hands back.
           */
          for (const note of change.notes) report({ note })
          // The reach (diagram + blast) from `src/lib/codegraph`, and the
          // walkthrough sections from the scaffold, in that order so the reach's
          // reading order flows into the sections.
          // Throws when the walk cannot draw the boards; the job then fails
          // with that error, before anything is written.
          const reach = await buildReach({ root, base, head: at, title, report })
          /*
           * The diagram and the blast are written whatever happens to the
           * sections. A failure here is kept, the boards are stored, and then
           * the job fails with it, so `read` says why the sections are missing.
           */
          let sections: ScaffoldResult["sections"] | null = null
          let sectionsFailed: unknown = null
          try {
            sections = (await buildScaffold({ root, repo: r, head: at, base, report, order: reach.order })).sections
          } catch (cause) {
            sectionsFailed = cause
          }
          const amended = await amend(
            r,
            draft,
            (document) => ({
              ...document,
              diagram: reach.diagram as unknown as DocumentInput["diagram"],
              blast: reach.blast as unknown as DocumentInput["blast"],
              codeWalkthrough: {
                ...document.codeWalkthrough,
                files: (sections ?? document.codeWalkthrough.files) as unknown as DocumentInput["codeWalkthrough"]["files"],
              },
            }),
            "Scaffolded",
          )
          if (amended.isError === true) {
            throw new Error(
              amended.content.map((part) => ("text" in part ? part.text : "")).join(" "),
            )
          }
          if (sectionsFailed !== null) throw sectionsFailed
        }, targetSubject(target))

        /*
         * Waited for, not handed back as a job.
         *
         * A change in a large repository can take several seconds, nearly all
         * of it search, and an agent that has to poll for that is an agent
         * with a step in its loop that exists for the server's convenience. So
         * this blocks — and when the budget is blown it says so rather than
         * failing, because the alternative on a large repository is a timeout
         * that discards work already done.
         */
        const settled = await settleWithin(job.id, 60_000)
        if (settled?.state === "failed") {
          return json({
            plan: planIdOf(target),
            started: true,
            scaffold: "failed",
            why: settled.error ?? "no reason given",
            head: at,
            ...(base === undefined ? {} : { base }),
            title,
            next: "The opening is stored and open for the reader. The structure did not build, so there is nothing to fill in.",
          })
        }
        if (settled?.state !== "done") {
          return json({
            plan: planIdOf(target),
            started: true,
            scaffold: "running",
            head: at,
            ...(base === undefined ? {} : { base }),
            title,
            next: `Still building after 60s. Call read with section "overview" until it says ready.`,
          })
        }

        const found = await storedOf(target)
        if ("error" in found) return failure(new Error(found.error))
        return json({
          plan: planIdOf(target),
          started: true,
          scaffold: "ready",
          notes: settled.notes,
          overview: overviewOf(found.doc, 1),
          next: 'Pass `plan` to every other call. Read the change with read { section: "diff" }, then work the list from nodes { unfilled: true }.',
        })
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "read",
    {
      title: "Read one part of a flight plan",
      description:
        "Returns one section of a stored document. `overview` is the skeleton — " +
        "ids, titles, sources and what is still unwritten, with no prose — and is " +
        "what to read to get oriented. `diff` is the whole change, per file, with " +
        "the node ids that cover each one. `full` returns everything and is for " +
        "reading a document before changing one that already exists, so human " +
        "edits survive; do not use it to get oriented.",
      inputSchema: {
        plan: planRef,
        section: z
          .enum(["overview", "full", "diagram", "code-walkthrough", "findings", "diff"])
          .describe("Which part to return."),
        depth: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("For `overview`: how many levels of children to walk. Default 1."),
        diff: z
          .object({
            paths: z
              .array(z.string())
              .optional()
              .describe("Limit to these files. Omit for every changed file."),
            limit: z.number().int().positive().optional().describe("Files per page. Default 25."),
            after: z.string().optional().describe("The `next` from the previous page."),
          })
          .optional()
          .describe("For `diff` only. Ignored by every other section."),
      },
    },
    async ({ plan, section, depth, diff }) => {
      try {
        const target = planTargetOf(plan)
        const r = target.repo
        const found = await storedOf(target)
        if ("error" in found) return failure(new Error(found.error))
        const doc = found.doc

        if (section === "overview") {
          // A scaffold that failed after `start` stopped waiting says so here,
          // where the agent was told to poll, rather than reading as empty.
          const failed = failedJob(targetSubject(target))
          if (failed === undefined) return json(overviewOf(doc, depth ?? 1))
          return json({
            scaffold: "failed",
            why: failed.error ?? "no reason given",
            next: "The structure did not build, so what is stored is the opening only. Call start again with reset to retry, or write the sections by hand.",
            ...overviewOf(doc, depth ?? 1),
          })
        }
        if (section === "full") return json(doc)
        if (section === "diagram") return json(doc.diagram)
        if (section === "findings") return json(doc.findings ?? [])
        if (section === "code-walkthrough") return json(doc.codeWalkthrough)

        const root = await checkoutRoot(r)
        if (root === null) {
          return failure(
            new Error(`No window has ${r} open, so there is no checkout to read the change from.`),
          )
        }
        const changes = await changesOf(root, doc, diff ?? {})
        if ("error" in changes) return failure(new Error(changes.error))
        return json(changes)
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "nodes",
    {
      title: "Read cards and nodes, or what is left to write",
      description:
        "Selects by id, or by what is still missing. Each item comes back with " +
        "the code it covers, what the change did to those lines, its ancestors " +
        "with the unrelated siblings dropped, and `needs` — which says what to " +
        "write. Work `unfilled` until `total` is zero; there is no page cursor, " +
        "because the list shrinks as you fill it.",
      inputSchema: {
        plan: planRef,
        ids: z
          .array(z.string())
          .optional()
          .describe("Waypoint, node or unresolved-call ids. Omit to ask for `unfilled`."),
        unfilled: z
          .boolean()
          .optional()
          .describe("Return the next items that still need writing."),
        /*
         * Taken from the worklist rather than written out again.
         *
         * A hand-kept copy of this list is a list that goes stale silently: a
         * kind added to the worklist is work an agent can be told about and
         * cannot ask for, which reads as the filter being broken.
         */
        needs: z
          .array(z.enum(WORK_KINDS))
          .optional()
          .describe(
            "For `unfilled`: only these kinds of work. `verdict` is the blast " +
              "radius: what the change does to each declaration that uses it; " +
              "`label` is a diagram node still carrying the declaration name " +
              "the scaffold wrote.",
          ),
        lineage: z
          .boolean()
          .optional()
          .describe("Ancestors of each item. Default true for `ids`, false for `unfilled`."),
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("For `unfilled`: how many to return. Default 10."),
        maxLines: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Most lines of code per item. Default 120; the rest is counted, not sent."),
      },
    },
    async ({ plan, ids, unfilled, needs, lineage, limit, maxLines }) => {
      try {
        const target = planTargetOf(plan)
        const r = target.repo
        const found = await storedOf(target)
        if ("error" in found) return failure(new Error(found.error))
        const doc = found.doc

        if ((ids === undefined || ids.length === 0) && unfilled !== true) {
          return failure(
            new Error(
              "Give `ids` for particular cards, or `unfilled: true` for what is left to write.",
            ),
          )
        }

        const root = await checkoutRoot(r)
        const blobs =
          root === null || doc.meta.kind !== "walkthrough"
            ? null
            : await blobsFor(root, doc)

        const withCode = async (
          path: string | undefined,
          lines: { from: number; to: number } | undefined,
        ): Promise<Covered | undefined> => {
          if (blobs === null || path === undefined || lines === undefined) return undefined
          return await coveredCode(doc, blobs, path, [lines.from, lines.to], maxLines ?? 120)
        }

        if (ids !== undefined && ids.length > 0) {
          const wantLineage = lineage ?? true
          const items = []
          for (const id of ids) {
            const asWaypoint = lineageOfWaypoint(doc, id)
            if (asWaypoint !== null) {
              const chain = asWaypoint.chain
              const self = chain[chain.length - 1]
              items.push({
                id,
                kind: "waypoint" as const,
                file: asWaypoint.path,
                node: self,
                ...(wantLineage ? { lineage: chain.slice(0, -1) } : {}),
                code: await withCode(self?.path, self?.lines),
              })
              continue
            }
            const asNode = lineageOfNode(doc, id)
            if (asNode !== null) {
              const self = asNode[asNode.length - 1]
              items.push({
                id,
                kind: "node" as const,
                node: nodeById(doc, id),
                ...(wantLineage ? { lineage: asNode.slice(0, -1) } : {}),
                code: await withCode(self?.path, self?.lines),
              })
              continue
            }
            items.push({ id, kind: "unknown" as const, node: null })
          }
          return json({ items })
        }

        const wanted = new Set(needs ?? ["reading", "title"])
        const work = unfilledOf(doc).filter(
          (one) => one.id !== undefined && wanted.has(one.needs as never),
        )
        const page = work.slice(0, limit ?? 10)
        const wantLineage = lineage ?? false

        const items = []
        for (const one of page) {
          const id = one.id ?? ""
          const asWaypoint = lineageOfWaypoint(doc, id)
          if (asWaypoint !== null) {
            const chain = asWaypoint.chain
            const self = chain[chain.length - 1]
            items.push({
              id,
              kind: "waypoint" as const,
              needs: one.needs,
              file: asWaypoint.path,
              node: self,
              ...(wantLineage ? { lineage: chain.slice(0, -1) } : {}),
              code: await withCode(self?.path, self?.lines),
            })
            continue
          }
          const asNode = lineageOfNode(doc, id)
          if (asNode !== null) {
            const self = asNode[asNode.length - 1]
            items.push({
              id,
              kind: "node" as const,
              needs: one.needs,
              node: nodeById(doc, id),
              ...(wantLineage ? { lineage: asNode.slice(0, -1) } : {}),
              code: await withCode(self?.path, self?.lines),
            })
            continue
          }
          items.push({
            id,
            kind: "answer" as const,
            needs: one.needs,
            node: unresolvedById(doc, id),
          })
        }

        /*
         * A total and no cursor.
         *
         * The collection shrinks as it is worked, so an offset into it skips
         * whatever moved up while the agent was writing. "The next few, and how
         * many are left" cannot do that, and it needs no state on either side.
         */
        return json({ items, total: work.length, remaining: work.length - page.length })
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "update-document",
    {
      title: "Write a flight plan's document-wide prose",
      description:
        "The parts that are not cards: the context, the two indexes into the tour, " +
        "the findings, and the order a reader walks the files in. Every field is " +
        "optional and only what is given is written.",
      inputSchema: {
        plan: planRef,
        context: z
          .string()
          .optional()
          .describe(
            "Why anyone should care, in five sentences at most. No identifiers and no paths.",
          ),
        overview: z
          .array(
            z.object({
              when: z
                .string()
                .describe("A situation, in the reader's terms. Not a code path."),
              then: z.string().describe("What a person or another system can observe."),
            }),
          )
          .optional()
          .describe(`One per scenario a reader would notice. ${CODE_LINK_FORM}`),
        implementation: z
          .array(
            z.object({
              label: z.string().describe("The place: a path, a directory, or an area."),
              path: z.string().optional().describe("Set when the label is a real path."),
              items: z
                .array(z.object({ text: z.string() }))
                .min(1)
                .describe("One per change a reader would notice, each opening with the verb."),
            }),
          )
          .optional()
          .describe("One group per place, in the order the tour walks them."),
        findings: z
          .array(
            z.object({
              id: z.string(),
              kind: z.enum(["bug", "risk", "nit", "question"]),
              title: z.string(),
              reading: z.string(),
              trace: z
                .array(z.string())
                .optional()
                .describe("The steps that prove it. A question carries none."),
              code: fenceArg.nullable(),
              solution: z
                .object({
                  lang: z.string(),
                  body: z
                    .string()
                    .describe(
                      "What the lines this finding's code names should say instead, " +
                        "whole. It replaces them, so it names no path and no position " +
                        "-- the finding's code is the position. The reader can preview " +
                        "it against the real file.",
                    ),
                })
                .optional()
                .describe(
                  "A fix for the lines this finding's code names. Required on a bug, " +
                    "a risk and a nit when their code is a reference; refused on a " +
                    "`question`, and where code is null or a proposal.",
                ),
            }),
          )
          .optional()
          .describe(
            "Most severe first: bug, then risk, then nit, then question. Replaces " +
              "the list; omit the field when there is nothing to report.",
          ),
        order: z
          .object({
            files: z
              .array(z.string())
              .optional()
              .describe("Every file exactly once. One left out is refused, not dropped."),
          })
          .optional()
          .describe("The order a reader walks the files in."),
      },
    },
    async ({ plan, context, overview, implementation, findings, order }) => {
      try {
        const target = planTargetOf(plan)
        const r = target.repo
        const waiting = scaffolding(targetSubject(target))
        if (waiting !== null) return failure(new Error(waiting))
        const draft = await targetDraft(target)

        return await amend(
          r,
          draft,
          (document) => {
            let next = document
            if (context !== undefined) {
              next = { ...next, contextBody: { ...next.contextBody, context } }
            }
            if (overview !== undefined) {
              next = {
                ...next,
                contextBody: {
                  ...next.contextBody,
                  overview: overview as unknown as DocumentInput["contextBody"]["overview"],
                },
              }
            }
            if (implementation !== undefined) {
              next = {
                ...next,
                contextBody: {
                  ...next.contextBody,
                  implementation:
                    implementation as unknown as DocumentInput["contextBody"]["implementation"],
                },
              }
            }
            if (findings !== undefined) {
              next = { ...next, findings: findings as unknown as DocumentInput["findings"] }
            }
            if (order?.files !== undefined) {
              const { document: reordered, unknown } = reorderFiles(next, order.files)
              if (unknown.length > 0) {
                throw new Error(
                  `This document has no file section for ${unknown.join(", ")}. Read the overview for the paths it does have.`,
                )
              }
              const have = next.codeWalkthrough.files.length
              if (order.files.length !== have) {
                throw new Error(
                  `An order has to name every file exactly once: ${String(have)} sections, ${String(order.files.length)} named. One left out would be dropped rather than left where it was.`,
                )
              }
              next = reordered
            }
            return next
          },
          "Wrote the document",
        )
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "update-nodes",
    {
      title: "Write the prose onto cards and nodes",
      description:
        "Writes titles, readings, labels and descriptions by id, in one batch. " +
        "Three lists, and each one names where its work goes: `waypoints` for " +
        "the tour, `nodes` for the diagram board, `blast` for the blast radius " +
        "-- an unproven call is answered through `blast[].answer`, not a list " +
        "of its own. It cannot add, remove or reparent anything, and it cannot " +
        "set `changed`, which comes from the diff. A batch is all or nothing: " +
        "one bad id writes none of it and names the one.",
      inputSchema: {
        plan: planRef,
        waypoints: z
          .array(
            z.object({
              id: z.string().describe("The waypoint's id, as the scaffold wrote it."),
              title: z
                .string()
                .optional()
                .describe("Why the reader is being shown this code, not which code it is."),
              reading: z.string().optional(),
              findings: z
                .array(
                  z.object({
                    id: z.string().describe("A new id for this finding, unique in the document."),
                    kind: z.enum(["bug", "risk", "nit", "question"]),
                    title: z.string(),
                    reading: z.string(),
                    trace: z
                      .array(z.string())
                      .optional()
                      .describe(
                        "The steps that prove it, one per line. Not on a " +
                          "`question`: there is no claim to prove.",
                      ),
                    solution: z
                      .object({
                        lang: z.string(),
                        body: z
                          .string()
                          .describe(
                            "What this waypoint's lines should say instead, whole. " +
                              "It replaces the lines the card covers, so it names no " +
                              "path and no position -- the card is the position. The " +
                              "reader can preview it against the real file.",
                          ),
                      })
                      .optional()
                      .describe(
                        "A fix for this card's lines. Required on a bug, a risk " +
                          "and a nit when the card references code; refused on a " +
                          "`question`, and where the card has no code or proposes " +
                          "it: there is nothing to replace.",
                      ),
                  }),
                )
                .optional()
                .describe(
                  "What is wrong with this code. On the card it is about, so a " +
                    "reviewer meets the claim with the code rather than in a " +
                    "list at the end. A card shows one chip, the highest kind.",
                ),
              needsAttention: z
                .string()
                .optional()
                .describe(
                  "Why a reviewer must not skim this one. Write it when your " +
                    "reading of the code says this card is where the change is " +
                    "most likely to be wrong, or most easily misread -- and " +
                    "leave it off otherwise, because a flag on every card " +
                    "points at nothing. The text is the reasoning, not a " +
                    "restatement of the title; it is shown under a Needs " +
                    "Attention heading on the card.",
                ),
              position: z
                .number()
                .int()
                .positive()
                .optional()
                .describe(
                  "Where this card ends up among its siblings, counting from 1. " +
                    "The others shift to make room. Top-level cards of one file " +
                    "only: a nested id is refused, which is what stops an order " +
                    "from reparenting anything.",
                ),
            }),
          )
          .optional(),
        nodes: z
          .array(
            z.object({
              id: z.string().describe("The node's id, as the scaffold wrote it."),
              label: z
                .string()
                .optional()
                .describe(
                  "What this code does, not which code it is. The scaffold " +
                    "leaves the declaration name here as a placeholder, and a " +
                    "board still carrying them is refused by complete.",
                ),
              sublabel: z
                .string()
                .optional()
                .describe(
                  "The identifier the label leaves out. The scaffold already " +
                    "wrote it; there is rarely a reason to change it.",
                ),
              description: z.string().optional(),
            }),
          )
          .optional()
          .describe("The diagram board. An unproven call is answered in `blast`, not here."),
        blast: z
          .array(
            z.object({
              id: z.string().describe("The blast-radius node's id, as the walk wrote it."),
              changeType: z
                .enum(["breaks", "behaviour-changes", "unaffected"])
                .optional()
                .describe(
                  "On a dependent only. What the change does to it. `unaffected` " +
                    "marks it a stop: everything the change can only reach " +
                    "*through* it is then unaffected too, derived rather than " +
                    "written, so one reading covers a whole branch.",
                ),
              effect: z
                .string()
                .optional()
                .describe(
                  "On a dependent only. One line saying what the change does to " +
                    "it, measured against the `contract` of whatever it uses. The " +
                    "verdict is the finding; this is the evidence.",
                ),
              contract: z
                .object({
                  before: z
                    .string()
                    .nullable()
                    .describe("Its surface before, or null if it did not exist."),
                  now: z.string().describe("Its surface after the change."),
                })
                .optional()
                .describe(
                  "On a changed declaration only. What anyone using it has to " +
                    "know: its surface, not its insides. Every dependent's verdict " +
                    "is judged against this, so it is written once here rather " +
                    "than restated by each of them.",
                ),
              label: z.string().optional(),
              sublabel: z.string().optional(),
              tag: z.string().optional(),
              description: z.string().optional(),
              answer: z
                .discriminatedUnion("kind", [
                  z.object({
                    kind: z.literal("targets"),
                    targets: z
                      .array(z.object({ path: z.string(), symbol: z.string() }))
                      .min(1),
                  }),
                  z.object({
                    kind: z.literal("runtime"),
                    note: z
                      .string()
                      .describe("What chooses the target while the program runs."),
                  }),
                ])
                .optional()
                .describe("For a node marked `unproven`: what the use actually reaches."),
            }),
          )
          .optional()
          .describe(
            "The blast radius: what the change does to each declaration that uses " +
              "it. Work this before the prose — how far the change reaches is the " +
              "thing worth knowing before describing it.",
          ),
      },
    },
    async ({ plan, waypoints, nodes, blast }) => {
      try {
        const target = planTargetOf(plan)
        const r = target.repo
        const waiting = scaffolding(targetSubject(target))
        if (waiting !== null) return failure(new Error(waiting))
        if (waypoints === undefined && nodes === undefined && blast === undefined) {
          return failure(
            new Error("Nothing to write. Give waypoints, nodes or blast."),
          )
        }
        const draft = await targetDraft(target)

        return await amend(
          r,
          draft,
          (document) => {
            let next = document

            if (waypoints !== undefined) {
              /*
               * The binding checked here rather than at the gate.
               *
               * A node whose `waypoint` names nothing is knowable the moment it
               * is written, and a whole document refused at the end for it costs
               * every other write in the batch. This is the same principle the
               * code-link verification already holds to: check the prose against
               * the document at the moment it is written.
               */
              const { document: filled, unknown } = fillWaypoints(
                next,
                waypoints.map((one) => ({
                  id: one.id,
                  ...(one.title === undefined ? {} : { title: one.title }),
                  ...(one.reading === undefined ? {} : { reading: one.reading }),
                  ...(one.needsAttention === undefined
                    ? {}
                    : { needsAttention: one.needsAttention }),
                  ...(one.findings === undefined ? {} : { findings: one.findings }),
                })),
              )
              if (unknown.length > 0) {
                throw new Error(
                  `This document has no waypoint with the id ${unknown.join(", ")}. Read the overview for the ids it does have; nothing was written.`,
                )
              }
              next = filled

              const moves = waypoints.filter((one) => one.position !== undefined)
              if (moves.length > 0) next = withPositions(next, moves)
            }

            if (nodes !== undefined) {
              const { document: filled, unknown } = fillNodes(next, nodes)
              if (unknown.length > 0) {
                throw new Error(
                  `This diagram has no node with the id ${unknown.join(", ")}. Read the overview for the ids it does have; nothing was written.`,
                )
              }
              next = filled
            }

            if (blast !== undefined) {
              const parsed = checkBlast(next.blast)
              if (parsed.blast === null) {
                throw new Error(
                  "This document has no blast radius to write into. It is walked by `start`, alongside the scaffold.",
                )
              }
              let board = parsed.blast

              const answered = blast.filter((one) => one.answer !== undefined)
              if (answered.length > 0) {
                const outcome = resolveBlastUnproven(
                  board,
                  answered.map((one) => ({
                    id: one.id,
                    ...(one.answer?.kind === "runtime"
                      ? { runtime: one.answer.note }
                      : {
                          targets: (one.answer?.targets ?? []).map((t) => ({
                            path: t.path,
                            name: t.symbol,
                          })),
                        }),
                  })),
                )
                if (outcome.unknown.length > 0) {
                  throw new Error(
                    `This blast radius has no node with the id ${outcome.unknown.join(", ")}. Nothing was written.`,
                  )
                }
                board = outcome.blast
              }

              const prose = blast.filter(
                (one) =>
                  one.label !== undefined ||
                  one.sublabel !== undefined ||
                  one.tag !== undefined ||
                  one.description !== undefined,
              )
              if (prose.length > 0) {
                const outcome = fillBlastProse(board, prose)
                if (outcome.unknown.length > 0) {
                  throw new Error(
                    `This blast radius has no node with the id ${outcome.unknown.join(", ")}. Nothing was written.`,
                  )
                }
                board = outcome.blast
              }

              const verdicts = blast.filter(
                (one) =>
                  one.changeType !== undefined ||
                  one.effect !== undefined ||
                  one.contract !== undefined,
              )
              if (verdicts.length > 0) {
                const bare = verdicts.filter(
                  (one) => one.changeType !== undefined && one.effect === undefined,
                )
                if (bare.length > 0) {
                  throw new Error(
                    `A verdict needs the evidence for it: ${bare.map((one) => one.id).join(", ")} ${bare.length === 1 ? "has" : "have"} a \`changeType\` and no \`effect\`. Nothing was written.`,
                  )
                }
                const outcome = assessBlast(
                  board,
                  verdicts.map((one) => ({
                    id: one.id,
                    ...(one.changeType === undefined ? {} : { changeType: one.changeType }),
                    ...(one.effect === undefined ? {} : { effect: one.effect }),
                    ...(one.contract === undefined ? {} : { contract: one.contract }),
                  })),
                )
                if (outcome.unknown.length > 0) {
                  throw new Error(
                    `This blast radius has no node with the id ${outcome.unknown.join(", ")}. Nothing was written.`,
                  )
                }
                if (outcome.refused.length > 0) {
                  throw new Error(
                    `Each field belongs to one kind of node: a \`contract\` states what the change did to a declaration the diff touched, and \`changeType\`/\`effect\` say what the change does to something that merely uses it. ${outcome.refused.join(", ")} got the wrong one. Nothing was written.`,
                  )
                }
                board = outcome.blast
              }

              next = { ...next, blast: board as unknown as DocumentInput["blast"] }
            }

            return next
          },
          "Wrote the cards",
        )
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "complete",
    {
      title: "Mark a flight plan finished",
      description:
        "Says the document is finished, and checks it in full. Must be called: " +
        "until it is, the reader sees it marked as still being written. A failure " +
        "changes nothing and returns everything still missing — the same list " +
        "`nodes` hands out, so the two cannot disagree about what is left.",
      inputSchema: {
        plan: planRef,
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("How many missing items to list on a refusal. Default 20."),
      },
    },
    async ({ plan, limit }) => {
      try {
        const target = planTargetOf(plan)
        const r = target.repo
        const found = await storedOf(target)
        if ("error" in found) return failure(new Error(found.error))

        /*
         * Asked before the write, and answered from the worklist.
         *
         * `amend` would refuse this anyway — that is what `complete: true` runs
         * — but its refusal is prose, and an agent that has just worked a list
         * of ids deserves the same list back rather than a paragraph to parse.
         */
        const left = unfilledOf(found.doc)
        if (left.length > 0) {
          const shown = left.slice(0, limit ?? 20)
          return json({
            finished: false,
            missing: shown.map((one) => ({
              ...(one.id === undefined ? {} : { id: one.id }),
              at: one.at,
              needs: one.needs,
              message: one.message,
            })),
            total: left.length,
            remaining: left.length - shown.length,
            next: "Write these with update-nodes and update-document, then call complete again.",
          })
        }

        const marked = await amend(
          r,
          found.draft,
          (document) => ({ ...document, meta: { ...document.meta, status: "complete" } }),
          "Marked it finished",
          { complete: true },
        )
        if (marked.isError === true) return marked
        // For the extension's "review is ready" notification. Before the open,
        // which may raise the panel.
        tell({
          completed: {
            id: formatId(
              target.kind === "create"
                ? { kind: "plan", repo: r, name: target.name }
                : { kind: "walkthrough", repo: r, name: walkthroughName(target.key) },
            ),
          },
        })
        requestOpen(
          target.kind === "create"
            ? { kind: "plan", repo: r, name: target.name }
            : { kind: "walkthrough", repo: r, ref: target.key },
        )
        return json({ finished: true, opened: true })
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  server.registerTool(
    "get-instructions",
    {
      title: "Get the user's writing instructions",
      description:
        "The active profile, fetched a piece at a time. With no arguments it " +
        "returns which bodies (diagram, blast, codeWalkthrough) the user " +
        "turned off, and an index: every entry you can ask for, each saying " +
        "when to ask. It returns no prose -- call it again with `fields` when " +
        "you reach the work an entry is about, so you read the rules for the " +
        "thing you are writing rather than all of them before you start. An " +
        "off body is optional -- do not generate it unless the user asks; a " +
        "body that is on must be generated.",
      inputSchema: {
        fields: z
          .array(z.string())
          .optional()
          .describe(
            "Dotted paths from the index, for example " +
              "codeWalkthrough.files.waypoints.reading. Returns how to write " +
              "each one, with its options and a worked example.",
          ),
        all: z
          .boolean()
          .optional()
          .describe(
            "Every field at once, including the ones you do not author. Large; " +
              "the index and `fields` are what an agent wants.",
          ),
      },
    },
    /*
     * Three sizes, and the default is the small one.
     *
     * The whole surface is some seventy kilobytes, which is past the inline
     * output cap: it lands in a file, the file pages, and an agent has spent
     * three round trips before writing a word — most of it about fields it has
     * not reached. So the default is an index, the prose is fetched per field,
     * and `all` stays for the settings screen and for debugging.
     */
    async ({ fields, all }) => {
      try {
        const store = new ProfileStore(profilesDir(serverDirectory()))
        const name = await store.activeName()
        const read = await store.loadReader(name)
        const sections = await store.sections(name)

        if (all === true) {
          const resolved = resolveConfigurations(read, descriptionRead, sections)
          return text(JSON.stringify({ profile: name, ...resolved }))
        }

        if (fields !== undefined) {
          const { configs, unknown } = resolveSome(read, descriptionRead, fields)
          if (unknown.length > 0) {
            const near = unknown.flatMap((one) => nearPaths(one))
            const hint =
              near.length > 0
                ? ` Did you mean ${near.map((one) => `\`${one}\``).join(", ")}?`
                : " Call get-instructions with no arguments for the paths there are."
            throw new Error(
              `No configured field at ${unknown.map((one) => `\`${one}\``).join(", ")}.${hint} Nothing was returned.`,
            )
          }
          return text(JSON.stringify({ profile: name, configs }))
        }

        const index = configurationIndex(read, descriptionRead, sections)
        return text(JSON.stringify({ profile: name, ...index }))
      } catch (cause) {
        return failure(cause)
      }
    },
  )

  return server
}

