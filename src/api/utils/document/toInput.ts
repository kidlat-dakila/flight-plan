import type { DocumentInput, Fence, Waypoint } from "../../../lib/schemas/document/schema"
import type { StoredDocument, StoredFence, StoredWaypoint } from "../../../lib/schemas/document/stored"

/**
 * A stored document, back in the form an author writes.
 *
 * Needed because a document is built in pieces: each one is added to what is
 * already stored, and what is already stored is *resolved* — it carries ranges
 * a symbol produced, marks a diff produced, and repair text a file produced.
 * Handing that back to the resolver would be asking it to resolve its own
 * output, and `documentInput` is strict, so it would simply refuse.
 *
 * So the derived half is dropped and the authored half kept. Every amendment
 * then re-resolves from scratch, which is not merely tidy: the file may have
 * moved under an earlier waypoint since it was written, and a document that
 * only ever resolved its newest piece would carry stale ranges for the rest.
 */

function fenceOf(code: StoredFence): Fence {
  if (code.kind === "proposal") {
    return {
      kind: "proposal",
      lang: code.lang,
      path: code.path,
      position: code.position,
      body: code.body,
      marks: code.marks,
    }
  }
  return {
    kind: "ref",
    lang: code.lang,
    path: code.path,
    // The target, not the focus it resolved to. A symbol that has moved should
    // resolve to where it is now, which is the whole reason to name one.
    target: code.target,
    covers: code.covers,
  }
}

function waypointOf(point: StoredWaypoint): Waypoint {
  return {
    id: point.id,
    title: point.title,
    reading: point.reading,
    needsAttention: point.needsAttention,
    findings: point.findings,
    code: point.code === null ? null : fenceOf(point.code),
    children:
      point.children === undefined ? undefined : point.children.map(waypointOf),
  }
}

export function toInput(doc: StoredDocument): DocumentInput {
  return {
    schema: doc.schema,
    meta: doc.meta,
    title: doc.title,
    contextBody: doc.contextBody,
    diagram: doc.diagram as DocumentInput["diagram"],
    /*
     * Carried back, or the board would survive the scaffold and vanish on the
     * first write after it.
     *
     * This mapping is explicit, so every field has to be named here to live
     * through an amend — and a field that is not named is not refused, it is
     * dropped. The blast radius was written by `start`, lost on the next
     * `update-nodes`, and the document then looked exactly like one the walk had
     * never run on. The same trap `scaffolded` is commented for below.
     */
    ...(doc.blast === undefined ? {} : { blast: doc.blast as DocumentInput["blast"] }),
    codeWalkthrough: {
      note: doc.codeWalkthrough.note,
      files: doc.codeWalkthrough.files.map((file) => ({
        path: file.path,
        summary: file.summary,
        waypoints: file.waypoints.map(waypointOf),
        // Carried back, or a section would stop being scaffolded the first time
        // anything else in the document was amended.
        ...(file.scaffolded === undefined ? {} : { scaffolded: file.scaffolded }),
      })),
    },
    findings:
      doc.findings === undefined
        ? undefined
        : doc.findings.map((found) => ({
            id: found.id,
            kind: found.kind,
            title: found.title,
            reading: found.reading,
            trace: found.trace,
            code: found.code === null ? null : fenceOf(found.code),
            solution: found.solution,
          })),
  }
}
