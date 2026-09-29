import { describe, expect, it } from "vitest"
import {
  BLAST_EDGE_KINDS,
  CHANGE_TYPES,
  checkBlast,
} from "../../lib/schemas/diagram/blast"
import { CODE_NODE_TYPES, EDGE_VARIANTS, checkDiagram } from "../../lib/schemas/diagram/schema"
import { DOCUMENT_STATUS, FINDING_KINDS } from "../../lib/schemas/document/schema"
import type { StoredDocument, StoredWaypoint } from "../../lib/schemas/document/stored"
import {
  DRAFTING_STEPS,
  HELD_SLUG,
  PANEL_SAMPLES,
  REVIEW_STATES,
  SAMPLE_BARE_HEADER,
  SAMPLE_FAILED,
  SAMPLE_HEADER,
  SAMPLE_MISSING,
  SAMPLE_NOTICES,
  SAMPLE_NAMES,
  SAMPLE_WAITING,
  servedFile,
  type SampleName,
} from "../../api/utils/samples/index"
import { storeSample } from "../../api/utils/samples/store"
import { SAMPLE_REVIEWED } from "../../api/utils/samples/index"
import { createSampleBackend } from "../../api/api/sample"
import { memoryStore } from "../../api/utils/reviewed/store"
import { reviewedState } from "../../api/utils/reviewed/marks"
import { documentView } from "../document/view"
import { parseStoredDocument } from "../../lib/schemas/document/stored"
import {
  MAX_WHOLE_FILE_LINES,
  fileLines,
  highlightReference,
  type AnchorState,
} from "../highlight"
import { parseProseAnchors, waypointSlugs } from "../parse/anchor"
import { parseCodeLinks } from "../../lib/schemas/document/codeLinks"

/**
 * The samples are the testing ground, so a feature missing from them is a
 * defect.
 *
 * Every sample must be what the server would store, and together they must
 * show every value of every enum the panel draws, every fence and waypoint
 * shape, and every anchor state. When a schema gains a value, this fails until
 * a sample shows it — which the generator does by itself for the enums.
 */

type Stored = { name: string; document: StoredDocument }

async function everySample(): Promise<Stored[]> {
  const out: Stored[] = []
  for (const name of SAMPLE_NAMES) {
    if (name === "drafting") {
      for (let step = 0; step < DRAFTING_STEPS; step += 1) {
        const { document } = await storeSample(name, step)
        out.push({ name: `drafting@${String(step)}`, document })
      }
      continue
    }
    const { document } = await storeSample(name)
    out.push({ name, document })
  }
  return out
}

function* waypoints(points: readonly StoredWaypoint[]): Generator<StoredWaypoint> {
  for (const point of points) {
    yield point
    if (point.children !== undefined) yield* waypoints(point.children)
  }
}

const allWaypoints = (doc: StoredDocument) => [
  ...waypoints(doc.codeWalkthrough.files.flatMap((file) => file.waypoints)),
]

/** Every piece of prose in a document, for the prose features. */
function proseOf(doc: StoredDocument): string[] {
  const texts = [doc.contextBody.context]
  for (const one of doc.contextBody.overview ?? []) texts.push(one.when, one.then)
  for (const group of doc.contextBody.implementation ?? []) {
    for (const item of group.items) texts.push(item.text)
  }
  for (const file of doc.codeWalkthrough.files) texts.push(...file.summary)
  for (const point of allWaypoints(doc)) if (point.reading !== null) texts.push(point.reading)
  for (const found of doc.findings ?? []) texts.push(found.reading, ...(found.trace ?? []))
  return texts
}

describe("samples", async () => {
  const samples = await everySample()
  const documents = samples.map((one) => one.document)
  const points = documents.flatMap(allWaypoints)
  const fences = [
    ...points.flatMap((point) => (point.code === null ? [] : [point.code])),
    ...documents.flatMap((doc) =>
      (doc.findings ?? []).flatMap((found) => (found.code === null ? [] : [found.code])),
    ),
  ]
  const findings = [
    ...points.flatMap((point) => point.findings ?? []),
    ...documents.flatMap((doc) => doc.findings ?? []),
  ]
  const diagrams = documents.flatMap((doc) => {
    const { diagram } = checkDiagram(doc.diagram)
    return diagram === null ? [] : [diagram]
  })
  const blasts = documents.flatMap((doc) => {
    const { blast } = checkBlast(doc.blast)
    return blast === null ? [] : [blast]
  })

  it("should store every sample through the server's write path", () => {
    // `storeSample` throws on anything a write would refuse, so reaching here
    // is the assertion. The names are the proof every one of them ran.
    expect(samples.map((one) => one.name)).toEqual([
      "walkthrough",
      "absent",
      "plan",
      ...Array.from({ length: DRAFTING_STEPS }, (_, step) => `drafting@${String(step)}`),
    ])
  })

  it("should read every sample back and lay it out", () => {
    for (const { name, document } of samples) {
      const read = parseStoredDocument(JSON.stringify(document))
      expect({ name, read: read !== null }).toEqual({ name, read: true })
      if (read !== null) expect(documentView(read).lead.length, name).toBeGreaterThan(0)
    }
  })

  it("should have a sample of every kind", () => {
    expect(new Set(documents.map((doc) => doc.meta.kind))).toEqual(
      new Set(["walkthrough", "plan"]),
    )
  })

  it("should show every document status", () => {
    const seen = new Set(documents.map((doc) => doc.meta.status))
    for (const status of DOCUMENT_STATUS) expect(seen).toContain(status)
  })

  it("should draft from the opening document to a complete one", async () => {
    const first = (await storeSample("drafting", 0)).document
    const last = (await storeSample("drafting", DRAFTING_STEPS - 1)).document
    expect(first.meta.status).toBe("drafting")
    expect(first.codeWalkthrough.files).toEqual([])
    expect(last).toEqual((await storeSample("walkthrough")).document)
  })

  it("should show every finding kind, with and without a trace, and a fix", () => {
    const kinds = new Set(findings.map((found) => found.kind))
    for (const kind of FINDING_KINDS) expect(kinds).toContain(kind)
    expect(findings.some((found) => found.trace !== undefined)).toBe(true)
    expect(findings.some((found) => found.kind !== "question" && found.trace === undefined)).toBe(true)
    expect(points.some((point) => point.findings?.some((f) => f.solution !== undefined))).toBe(true)
  })

  it("should show a file section before its waypoints, as a draft has one", () => {
    expect(documents.some((doc) => doc.codeWalkthrough.files.some((file) => file.waypoints.length === 0))).toBe(true)
  })

  it("should show every waypoint shape", () => {
    expect(points.some((point) => point.reading === null)).toBe(true)
    expect(points.some((point) => point.reading !== null)).toBe(true)
    expect(points.some((point) => point.needsAttention !== undefined)).toBe(true)
    expect(points.some((point) => point.draft === true)).toBe(true)
    expect(points.some((point) => (point.children?.length ?? 0) >= 2)).toBe(true)
    expect(points.some((point) => point.code === null)).toBe(true)
  })

  it("should show every fence shape", () => {
    const refs = fences.flatMap((fence) => (fence.kind === "ref" ? [fence] : []))
    const lengthOf = (path: string) => fileLines(servedFile(path) ?? "").length
    // A range inside a short file, the whole of one, and a window into a long one.
    expect(
      refs.some((fence) => lengthOf(fence.path) <= MAX_WHOLE_FILE_LINES && fence.focus.to - fence.focus.from + 1 < lengthOf(fence.path)),
    ).toBe(true)
    expect(refs.some((fence) => fence.focus.from === 1 && fence.focus.to === lengthOf(fence.path))).toBe(true)
    expect(refs.some((fence) => lengthOf(fence.path) > MAX_WHOLE_FILE_LINES)).toBe(true)
    expect(refs.some((fence) => (fence.marks?.length ?? 0) > 0)).toBe(true)

    const positions = new Set(
      fences.flatMap((fence) => (fence.kind === "proposal" ? [fence.position.kind] : [])),
    )
    expect(positions).toEqual(new Set(["after", "before", "replace", "new"]))
    expect(fences.some((fence) => fence.kind === "proposal" && (fence.marks?.length ?? 0) > 0)).toBe(true)
  })

  it("should show every diagram node type and edge variant, and an absent diagram", () => {
    const types = new Set(diagrams.flatMap((diagram) => diagram.nodes.map((node) => node.type)))
    for (const type of CODE_NODE_TYPES) expect(types).toContain(type)
    const variants = new Set(
      diagrams.flatMap((diagram) => diagram.edges.flatMap((edge) => (edge.variant === undefined ? [] : [edge.variant]))),
    )
    for (const variant of EDGE_VARIANTS) expect(variants).toContain(variant)
    const nodes = diagrams.flatMap((diagram) => diagram.nodes)
    expect(nodes.some((node) => node.description !== undefined)).toBe(true)
    expect(nodes.some((node) => node.escape === true)).toBe(true)
    expect(diagrams.some((diagram) => diagram.edges.some((edge) => edge.kind === "value"))).toBe(true)
    expect(documents.some((doc) => typeof (doc.diagram as { absent?: unknown }).absent === "string")).toBe(true)
  })

  it("should show every change type and blast edge kind, and an absent blast", () => {
    const changes = new Set(blasts.flatMap((blast) => blast.nodes.map((node) => node.changeType)))
    for (const change of CHANGE_TYPES) expect(changes).toContain(change)
    const kinds = new Set(blasts.flatMap((blast) => blast.edges.map((edge) => edge.kind)))
    for (const kind of BLAST_EDGE_KINDS) expect(kinds).toContain(kind)
    const nodes = blasts.flatMap((blast) => blast.nodes)
    expect(nodes.some((node) => node.contract?.before === null)).toBe(true)
    expect(nodes.some((node) => typeof node.contract?.before === "string")).toBe(true)
    expect(nodes.some((node) => node.effect !== undefined)).toBe(true)
    expect(nodes.some((node) => node.shieldedBy !== undefined)).toBe(true)
    expect(nodes.some((node) => node.unproven !== undefined)).toBe(true)
    expect(blasts.some((blast) => blast.notes.length > 0)).toBe(true)
    expect(
      documents.some((doc) => typeof (doc.blast as { absent?: unknown } | undefined)?.absent === "string"),
    ).toBe(true)
  })

  it("should show the prose features: code links, a waypoint link, and a fold", () => {
    const prose = documents.flatMap(proseOf)
    expect(prose.some((text) => parseCodeLinks(text).length > 0)).toBe(true)
    expect(prose.some((text) => /^<details>$/m.test(text))).toBe(true)

    // The `#slug` has to name a waypoint the renderer will actually have.
    const walkthrough = samples.find((one) => one.name === "walkthrough")?.document
    expect(walkthrough).toBeDefined()
    if (walkthrough === undefined) return
    const slugs = waypointSlugs(allWaypoints(walkthrough).map((point) => point.title))
    const anchors = proseOf(walkthrough).flatMap((text) => parseProseAnchors(text))
    expect(anchors.map((anchor) => anchor.slug)).toContain(HELD_SLUG)
    expect(slugs).toContain(HELD_SLUG)
  })

  it("should show every anchor state against the files a reader's panel reads", async () => {
    const states = new Set<AnchorState>()
    const referenced = (["walkthrough"] as SampleName[]).map(
      (name) => samples.find((one) => one.name === name)?.document,
    )
    for (const doc of referenced) {
      for (const point of doc === undefined ? [] : allWaypoints(doc)) {
        if (point.code?.kind !== "ref") continue
        const text = servedFile(point.code.path)
        if (text === null) throw new Error(`no served \`${point.code.path}\``)
        const resolved = await highlightReference(
          { path: point.code.path, focus: point.code.focus },
          point.code.marks ?? [],
          text,
          point.code.lang,
          "github-dark",
          [],
          point.code.expect ?? null,
        )
        states.add(resolved.anchor)
      }
    }
    expect(states).toEqual(new Set<AnchorState>(["matched", "repaired", "lost", "none"]))
  })

  it("should have every panel state and every header and notice", () => {
    expect([...PANEL_SAMPLES]).toEqual(["missing", "failed", "waiting"])
    expect(SAMPLE_MISSING.reason).toBe("absent")
    expect(SAMPLE_FAILED.message).not.toBe("")
    expect(SAMPLE_WAITING.text).not.toBe("")
    expect(new Set(SAMPLE_HEADER.reviewers.map((one) => one.state))).toEqual(new Set(REVIEW_STATES))
    expect(SAMPLE_BARE_HEADER.kind).toBe("bare")
    expect(new Set(Object.values(SAMPLE_NOTICES).map((one) => one.level))).toEqual(
      new Set(["info", "warn"]),
    )
    expect(Object.values(SAMPLE_NOTICES).some((one) => "actions" in one)).toBe(true)
  })

  /*
   * Reviewed state is the reader's, not the document's, so it is seeded
   * beside the samples. A seed naming an id the sample does not have would be
   * dropped without a word, so every one is checked against the document.
   */
  it("should show reviewed waypoints and a reviewed file", () => {
    const backend = createSampleBackend({ reviewed: memoryStore() })
    let reviewedWaypoints = 0
    let reviewedFiles = 0
    for (const [name, seed] of Object.entries(SAMPLE_REVIEWED)) {
      const found = samples.find((one) => one.name === name)
      expect(found, name).toBeDefined()
      if (found === undefined || seed === undefined) continue
      const ids = new Set(allWaypoints(found.document).map((point) => point.id))
      const paths = new Set(found.document.codeWalkthrough.files.map((file) => file.path))
      for (const id of seed.waypoints) expect(ids.has(id), `${name}: ${id}`).toBe(true)
      for (const path of seed.files) expect(paths.has(path), `${name}: ${path}`).toBe(true)

      const marks = backend.seedReviewed({ sample: name }, found.document)
      expect(marks).not.toBeNull()
      const state = reviewedState(found.document, marks ?? { version: 1, waypoints: {}, files: {} })
      reviewedWaypoints += state.waypoints.length
      reviewedFiles += state.files.length
    }
    expect(reviewedWaypoints).toBeGreaterThan(0)
    expect(reviewedFiles).toBeGreaterThan(0)
  })
})
