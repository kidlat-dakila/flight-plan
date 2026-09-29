/**
 * The language seam for the declaration-level tracer.
 *
 * The generic climb ({@link ./callerTree}) needs only a {@link CallGraph}. The
 * orchestrator needs two more things per language — how to find the changed
 * file's declarations, and how to build that call graph over a repo — without
 * ever naming a grammar. A {@link LanguageTracer} bundles exactly those, so
 * everything TypeScript-specific stays under `typescript/` and the orchestrator
 * stays language-agnostic. Adding a language is a new tracer here, registered
 * alongside its {@link ../parsers.LanguageParser}.
 */
import type { CallGraph } from "./callerTree"
import type { CodeRef, DiagramNode } from "../types"

/** The one thing the orchestrator reads from a repo directly: a file's source. */
export type SourceReader = { read: (path: string) => Promise<string | null> }

/** The injected candidate search: files that might call a declaration (a `git grep`). */
export type CallCandidates = (target: CodeRef) => Promise<string[]>

/**
 * A language's declaration-level tracer, over its own repo shape `C`.
 *
 * `C` carries whatever resolution a language needs (for TypeScript, tsconfig
 * aliases and workspace packages) — opaque to the orchestrator, which only ever
 * reads source through {@link SourceReader} and hands the repo straight back.
 */
export interface LanguageTracer<C extends SourceReader = SourceReader> {
  /** File extensions this tracer handles, lowercase with the dot. */
  extensions: string[]
  /** The function-like declarations of a file, as generic {@link CodeRef}s. */
  declarationsOf: (repo: C, file: string) => Promise<CodeRef[]>
  /** The lazy caller graph over the repo and candidate search. */
  callGraph: (repo: C, candidates: CallCandidates) => CallGraph
  /**
   * The full reach of a declaration: the forward value-flow pass (following the
   * function as a value to every terminal call or sink, marking escapes) then
   * the caller climb resumed from each. Optional — a language without it falls
   * back to the call-only climb over {@link callGraph}.
   */
  reach?: (repo: C, candidates: CallCandidates, root: CodeRef) => Promise<DiagramNode>
}
