import {
  DRAFTING_STEPS,
  findSymbol,
  sampleSpec,
  writtenFile,
  type SampleName,
} from "./index"
import { checkDocument } from "../document/check"
import { checkComplete } from "../document/complete"
import { resolve, type ResolveFinding } from "../document/resolve"
import { documentInput } from "../../../lib/schemas/document/schema"
import { storedDocument, type StoredDocument } from "../../../lib/schemas/document/stored"

/**
 * A sample, stored the way the server stores an agent's document.
 *
 * The same steps as `writeDocument` in the server, in the same order: parse the
 * input, resolve it against the repository, run the checks that hold at every
 * write, and the completeness checks when the document says it is complete.
 * Anything a real write would refuse throws here, with the same findings, so a
 * sample cannot be something an agent could never have produced.
 *
 * Beside the resolver rather than beside the samples, because the samples'
 * package depends on nothing but Zod and this needs the whole write path.
 */

export type StoredSample = {
  document: StoredDocument
  /** What a real write would have warned about. */
  warnings: ResolveFinding[]
}

function refuse(name: string, findings: readonly ResolveFinding[]): never {
  throw new Error(
    `The \`${name}\` sample would not be stored:\n${findings
      .map((f) => `${f.at}: ${f.message}`)
      .join("\n")}`,
  )
}

export async function storeSample(
  name: SampleName,
  step = DRAFTING_STEPS - 1,
): Promise<StoredSample> {
  const spec = sampleSpec(name, step)

  // Through JSON, as a real write arrives: a sample that only works as an
  // object literal is not a sample of anything.
  const parsed = documentInput.safeParse(JSON.parse(JSON.stringify(spec.input)))
  if (!parsed.success) {
    refuse(
      name,
      parsed.error.issues.map((issue) => ({
        severity: "error",
        at: issue.path.join(".") || "(document)",
        message: issue.message,
      })),
    )
  }

  const read = (path: string) => Promise.resolve(writtenFile(path))
  const resolution = await resolve(parsed.data, {
    at: spec.at,
    readFile: read,
    hunks: spec.hunks,
    main: spec.main === null ? null : { at: spec.main, readFile: read },
    findSymbol: (path, symbol) => Promise.resolve(findSymbol(path, symbol)),
  })
  if (!resolution.ok) refuse(name, resolution.findings)

  const problems = checkDocument(resolution.document)
  const missing =
    resolution.document.meta.status === "complete" ? checkComplete(resolution.document) : []
  const errors = [...problems, ...missing].filter((f) => f.severity === "error")
  if (errors.length > 0) refuse(name, errors)

  return {
    document: storedDocument.parse(resolution.document),
    warnings: [...resolution.findings, ...problems, ...missing],
  }
}
