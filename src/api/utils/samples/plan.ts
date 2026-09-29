import { REPO, findSymbol, lineOf, linesOf, linkTo, linkToLine } from "./files"
import type { SampleInput } from "./walkthrough"

/**
 * The implementation plan: code that does not exist yet, and where it goes.
 *
 * Every proposal position the schema has — after, before, replace, new — and a
 * breakdown, where a parent's whole proposal is repeated by two children that
 * each mark a part of it. A plan resolves against the working tree, so it has
 * no commit and no diff.
 */

const RESERVE = "src/checkout/reserve.ts"
const SWEEP = "src/jobs/sweep.ts"
const FLAGS = "src/config/flags.ts"
const INDEX = "src/checkout/index.ts"

const EXPIRED = [
  "",
  "/** Every reservation whose hold has lapsed. */",
  "export async function expiredReservations(now: Date): Promise<Reservation[]> {",
  "  return db.reservations.where(\"expiresAt\", \"<\", now)",
  "}",
].join("\n")

const SWEEP_BODY = [
  'import { SWEEP_INTERVAL_MS } from "../config/flags"',
  'import { expiredReservations, releaseStock } from "../checkout/reserve"',
  "",
  "/** Releases lapsed reservations on a timer, until the returned stop is called. */",
  "export function startSweep(): () => void {",
  "  const timer = setInterval(async () => {",
  "    for (const reservation of await expiredReservations(new Date())) {",
  "      await releaseStock(reservation)",
  "    }",
  "  }, SWEEP_INTERVAL_MS)",
  "  return () => clearInterval(timer)",
  "}",
].join("\n")

/** Body lines, counting from the first proposed line, for a proposal's marks. */
function bodyLine(body: string, needle: string): number {
  const index = body.split("\n").findIndex((line) => line.includes(needle))
  if (index < 0) throw new Error(`\`${needle}\` is not in the proposal`)
  return index + 1
}

export function planInput(): SampleInput {
  const sweep = (marks?: [number, number][]) => ({
    kind: "proposal" as const,
    lang: "ts",
    path: SWEEP,
    position: { kind: "new" as const },
    body: SWEEP_BODY,
    ...(marks === undefined ? {} : { marks }),
  })
  const interval = lineOf(FLAGS, "export const SWEEP_INTERVAL_MS")
  const loop = bodyLine(SWEEP_BODY, "const timer = setInterval")
  const loopEnd = bodyLine(SWEEP_BODY, "}, SWEEP_INTERVAL_MS)")
  const stop = bodyLine(SWEEP_BODY, "return () => clearInterval")

  return {
    schema: 1,
    meta: {
      kind: "plan",
      repo: REPO,
      name: "sweep-lapsed-reservations",
      branch: "sweep-reservations",
      status: "complete",
    },
    title: "Release lapsed reservations on a timer",
    contextBody: {
      context:
        "A reservation holds stock for ten minutes and nothing gives it back when the customer walks away. This plan adds a sweep that releases every lapsed hold once a minute.",
      overview: [
        {
          when: "a customer leaves the checkout without paying",
          then: `their held stock is back on sale within a minute, through ${linkTo(RESERVE, "releaseStock")}`,
        },
      ],
      implementation: [
        {
          label: RESERVE,
          path: RESERVE,
          items: [{ text: "Add `expiredReservations`, the one query the sweep needs." }],
        },
        {
          label: SWEEP,
          path: SWEEP,
          items: [{ text: "Add `startSweep`, which runs the release on a timer." }],
        },
        {
          label: "Configuration and exports",
          items: [
            { text: `Lengthen ${linkToLine(FLAGS, "export const SWEEP_INTERVAL_MS", "`SWEEP_INTERVAL_MS`")} to five minutes.` },
            { text: "Export the sweep from the checkout index." },
          ],
        },
      ],
    },
    diagram: {
      type: "code",
      title: "The sweep, once it exists",
      nodes: [
        {
          id: "timer",
          type: "config",
          label: "Decides how often the sweep runs",
          sublabel: "SWEEP_INTERVAL_MS",
          changed: true,
          sources: [
            {
              path: FLAGS,
              lines: [interval, interval],
              anchor: linesOf(FLAGS)[interval - 1] ?? "",
            },
          ],
          children: [
            {
              id: "sweep",
              type: "logic",
              label: "Releases every lapsed hold",
              sublabel: "startSweep()",
              changed: true,
              description: "**New.** Does not exist until the plan is carried out.",
              children: [
                {
                  id: "release",
                  type: "data",
                  label: "Gives the stock back",
                  sublabel: "releaseStock()",
                  sources: [
                    (() => {
                      const range = findSymbol(RESERVE, "releaseStock")
                      if (range === null) throw new Error("no releaseStock")
                      return {
                        path: RESERVE,
                        lines: [range.from, range.to] as [number, number],
                        anchor: linesOf(RESERVE)[range.from - 1] ?? "",
                      }
                    })(),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    codeWalkthrough: {
      note: "In the order the files have to change: the query, the job, then the wiring.",
      files: [
        {
          path: RESERVE,
          summary: ["Add the query for lapsed holds."],
          waypoints: [
            {
              id: "find-expired",
              title: "Find the holds that have lapsed",
              reading: "Appended after the release, since the sweep calls the two together.",
              code: {
                kind: "proposal",
                lang: "ts",
                path: RESERVE,
                position: { kind: "after", line: linesOf(RESERVE).length },
                body: EXPIRED,
                marks: [[bodyLine(EXPIRED, "export async function"), bodyLine(EXPIRED, "return db.")]],
              },
            },
          ],
        },
        {
          path: SWEEP,
          summary: ["Add the timer that releases them."],
          waypoints: [
            {
              id: "sweep-job",
              title: "Run the release on a timer",
              reading: "A new file, so the whole proposal is the file.",
              needsAttention: "The only part of the plan that frees stock: without the sweep, a hold from an abandoned checkout is never released.",
              code: sweep(),
              children: [
                {
                  id: "sweep-loop",
                  title: "Release every lapsed hold once per tick",
                  reading: "Sequential on purpose: the table is small and a burst of deletes would lock it.",
                  code: sweep([[loop, loopEnd]]),
                },
                {
                  id: "sweep-stop",
                  title: "Hand back a way to stop it",
                  reading: "So the server's shutdown can clear the timer.",
                  code: sweep([[stop, stop]]),
                },
              ],
            },
          ],
        },
        {
          path: FLAGS,
          summary: ["Lengthen the interval."],
          waypoints: [
            {
              id: "longer-interval",
              title: "Sweep every five minutes, not every one",
              reading: "A lapsed hold costs little; a query every minute on every server costs more.",
              code: {
                kind: "proposal",
                lang: "ts",
                path: FLAGS,
                position: { kind: "replace", lines: [interval, interval] },
                body: "export const SWEEP_INTERVAL_MS = 5 * 60 * 1000",
              },
            },
          ],
        },
        {
          path: INDEX,
          summary: ["Export the sweep."],
          waypoints: [
            {
              id: "export-sweep",
              title: "Export the sweep beside the order",
              reading: "The server starts it from the same import it places orders through.",
              code: {
                kind: "proposal",
                lang: "ts",
                path: INDEX,
                position: { kind: "before", line: 1 },
                body: 'export { startSweep } from "../jobs/sweep"',
              },
            },
          ],
        },
      ],
    },
    findings: [
      {
        id: "sweep-where",
        kind: "question",
        title: "Which process should own the timer?",
        reading: "Every web server would run one. A single worker would need its own deployment.",
        code: null,
      },
    ],
  }
}
