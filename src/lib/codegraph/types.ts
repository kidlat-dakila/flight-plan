/**
 * The diagram data structure.
 *
 * Built entirely from the files' own syntax (acorn for TypeScript and
 * JavaScript, tree-sitter for Python): the lazy caller tracer (`tracer/`)
 * resolves the call relationships across files (who calls whom, with exact
 * ranges), and `buildExecutionSteps` reads the line-by-line execution inside a
 * function body.
 * This file is the shape only — no logic.
 */

/** A point in a file: 1-based line, 0-based column. */
export type Pos = { line: number; column: number }

/** A half-open span in one file. */
export type Range = { start: Pos; end: Pos }

/**
 * The whole diagram: an array of inverted trees, one per changed function.
 *
 * "Inverted" because the root of each tree is the function the change is in, and
 * the tree grows *upward* through its callers toward the entry points — the
 * opposite of a call tree, which grows down into callees.
 */
export type Diagram = DiagramNode[]

/**
 * A structured join key for a declaration — file plus the line its name is on.
 *
 * The same {@link CodeRef} recurs as a callee and as a caller across files;
 * `CodeId` is what identifies "the same declaration" without parsing a string.
 * It replaces the old SCIP-shaped `symbol` (`file#name@line`).
 */
export type CodeId = { file: string; line: number }

/**
 * A reference to one declaration in code — where it is and what it is called.
 *
 * The shared shape a node points at, used by both the diagram (a caller node)
 * and the blast radius (an affected declaration). It carries everything needed
 * to locate and label the declaration; nothing has to be parsed out of a string.
 */
export type CodeRef = {
  /** Repository-relative path of the file the declaration is in. */
  file: string
  /** The display name, e.g. `isAdult` or `StockService.hasStock`. */
  name: string
  /** The range of the name itself, where the declaration is written. */
  definedAt: Range
  /** The whole body — the declaration's enclosing range. */
  enclosingRange: Range
}

/**
 * One function (or method) and how the tree reaches it.
 *
 * `callers` makes the inverted tree: the functions that call this one, each
 * itself a node with its own callers, up to a function nothing calls.
 */
export type DiagramNode = {
  /** The structured join key — what joins this callee to its caller occurrences. */
  id: CodeId
  /** The declaration this node points at (shared with the blast radius). */
  code: CodeRef
  /**
   * Where this function calls the node it nests under (its callee, the node one
   * level toward the root). It is a range in *this* function's file. Absent on a
   * root, which nothing in the tree sits below.
   */
  calledAt?: Range

  /**
   * How this node connects to the node one level toward the root — the edge that
   * carries {@link calledAt}. A plain `"call"` is a direct `name(...)`; a
   * `"value"` is a *handoff* — the changed function reached this node as a value
   * (through a hook, a JSX prop, a collection, a return) and is invoked here, not
   * imported-and-called directly. Absent (treated as `"call"`) on a root and on
   * ordinary call edges. See {@link escape} for the boundary case.
   */
  via?: "call" | "value"

  /**
   * A boundary where the function value escaped static resolution — a spread, a
   * store, an event bus, a computed dispatch, an HOC, or an un-indexed library.
   * The node is a leaf marker ("escapes here — invocations beyond this are
   * unproven") rather than a real declaration: its {@link code} is synthetic and
   * its {@link callers} are empty. This is the revived unproven/unresolved signal
   * — it says the reach may extend further, and where to look.
   */
  escape?: { reason: EscapeKind; at: Range }

  /** The functions that call this one — the inverted tree grows through here. */
  callers: DiagramNode[]

  /**
   * Other changed functions that *this* one calls, merged in where the reach
   * forks under a shared caller.
   *
   * The tree is inverted (rooted at the deepest change, `callers` climbing to
   * the entry). A connected group of changes can fork — one caller calls two
   * changed functions on different branches — and only one branch can climb
   * through `callers`. The other is a *callee* of the shared node, so it hangs
   * here instead of being duplicated into its own root. Absent for a straight
   * caller chain. `calledAt` on such a child is where *this* node calls it.
   */
  callees?: DiagramNode[]

  /**
   * What this function calls or renders, changed or not: the way *down* from a
   * change, where {@link callers} is the way up.
   *
   * Each child is a declaration of the repository that a call `name(...)`, a
   * namespace call `ns.name(...)` or a JSX element `<Name …>` in this
   * function's body resolves to, through imports and barrels. Only what this
   * function calls directly: a child carries no children of its own, and a call
   * of this function itself is left out. `calledAt` on a child is where *this*
   * function calls it. Set on a changed function (a root); absent when it calls
   * nothing of the repository.
   */
  children?: DiagramNode[]

  /**
   * The line-by-line execution of this function's `enclosingRange`, from its
   * syntax tree. A tree rather than a list because conditions branch.
   *
   * For now this is populated only on the root of each inverted tree (the
   * "first parent" — the function the change is in). Caller nodes leave it
   * absent.
   */
  executionSteps?: ExecutionStep[]
}

/**
 * The kind of boundary a function value escapes across, when the trace can no
 * longer follow it statically. Each maps to one recorded pattern in the reach
 * matrix; a lost pattern is an accepted, pinned result, not a silent gap.
 */
export type EscapeKind =
  | "spread" // `<Child {...props} />` — the prop name is not statically known
  | "props" // a prop into a component whose props parameter cannot be taken apart (`...args`)
  | "store" // a value put into a context / store
  | "event-bus" // a value registered on / published to an event bus
  | "dynamic-dispatch" // `handlers[key]()` — a computed member call
  | "hoc" // an opaque higher-order wrapper `withX(fn)`
  | "library" // a value handed to an un-indexed / external module
  | "decorator" // a decorator whose wrapping cannot be resolved (python)
  | "import" // `importlib.import_module` / `__import__` dynamic import (python)

/**
 * The kind of an execution step, as one small language-agnostic vocabulary.
 *
 * Syntax node types are per-language — a `.ts` binding is a
 * `VariableDeclaration`, a Python one an `assignment`, a Rust one a
 * `let_declaration`. Those raw, language-specific names are mapped into these
 * generic categories by each language parser (`src/lib/codegraph/parsers/…`), so the
 * rest of the diagram reasons about one vocabulary whatever the source language.
 */
export type StepType =
  | "declaration" // a binding, or a nested function / class / type declaration
  | "expression" // an expression evaluated for effect (assignment, bare call)
  | "conditional" // if / switch — branches
  | "loop" // for / while / do — a body that may repeat
  | "try" // try / catch / finally — branches
  | "return" // return
  | "throw" // throw / raise
  | "jump" // break / continue
  | "block" // a bare nested block
  | "comment" // a comment, dropped by later logic
  | "other" // anything not otherwise categorised

/**
 * One step of execution inside a function body.
 *
 * A flat sequence for straight-line code; a branching step holds its arms in
 * `branches`, and each arm is its own sub-sequence of steps — that is what makes
 * the whole thing a tree.
 */
export type ExecutionStep = {
  /** 1-based line of this step, inside the function's `enclosingRange`. */
  line: number
  /** The source at that line. */
  text: string
  /**
   * The step's range, body-relative (like `line`): where the statement sits
   * inside the function body. Pairs with `text` — the snippet for reading, the
   * range for linking back to the code without re-parsing.
   */
  range: Range
  /**
   * The step's kind, in the generic vocabulary — the discriminator later logic
   * keys off (dropping `comment`, expanding branching kinds into `branches`).
   * Mapped from the raw syntax node type by the language parser. See
   * {@link StepType}.
   */
  type: StepType
  /**
   * Whether the change touched this step directly — its own line(s) fall within
   * the diff. A branching step kept only as the spine to a deeper change is
   * `false`; the actual changed statements inside it are `true`.
   */
  changed: boolean
  /**
   * The arms of a branching step, each its own sub-walk of steps — this is what
   * makes the whole thing a tree. Present for the branching kinds (`conditional`,
   * `loop`, `try`); absent for straight-line steps.
   *
   * `label` names the arm — `"then"` / `"else"` for a conditional, a case value
   * for a switch, `"body"` for a loop, `"catch"` / `"finally"` for a try.
   */
  branches?: { label: string; steps: ExecutionStep[] }[]
}
