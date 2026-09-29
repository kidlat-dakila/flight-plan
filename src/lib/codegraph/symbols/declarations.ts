import { withTree } from "../tracer/parse"
import { parse, skipTrivia, textOf, type Node, type Parsed } from "../tracer/typescript/estree"
import type { SymbolSpan } from "./spans"
import { pythonDeclarationsIn } from "./python"

/**
 * What a file declares, from its own syntax.
 *
 * The replacement for `executeDocumentSymbolProvider`, and it answers the same
 * shape — `SymbolSpan`, unchanged — so nothing above it knows the difference.
 *
 * It also cannot reproduce the bug that made `SymbolSpan.kind` necessary.
 * TypeScript's provider reports a local `const` inside a function as a *child
 * symbol* of it, so "the innermost declaration a change fell in" once picked a
 * local variable, call hierarchy answered nothing for it, and a whole diagram
 * came back empty while every unit test passed. The rule then became "descend
 * through containers, stop at bodies", enforced with a coarse kind because a
 * line range could not express it.
 *
 * Here the rule is structural rather than remedial: a callable's body is simply
 * not walked. `kind` is kept because the walk upstream still uses it and
 * because a container and a body are genuinely different things to a reader,
 * not because anything here needs it to avoid a local variable.
 */

/** A value that is a function, so the name it is bound to is a callable. A generator is not one. */
const isFunctionValue = (node: unknown): boolean =>
  typeof node === "object" &&
  node !== null &&
  ((node as Node).type === "ArrowFunctionExpression" || (node as Node).type === "FunctionExpression") &&
  (node as Node).generator !== true

/**
 * How a declaration is classified, by its own type, or null when it is not one.
 *
 * The same sorts the tree-sitter grammar gave: a body-less signature (an
 * overload, an abstract or interface method) is still a callable; a class
 * field and an interface property are `other`. In the JavaScript grammar a
 * class field was never read.
 */
function classify(node: Node, parsed: Parsed): SymbolSpan["kind"] | null {
  switch (node.type) {
    case "FunctionDeclaration":
    case "TSDeclareFunction":
    case "MethodDefinition":
    case "TSAbstractMethodDefinition":
    case "TSMethodSignature":
      return "callable"
    case "ClassDeclaration":
    case "TSInterfaceDeclaration":
    case "TSEnumDeclaration":
    case "TSModuleDeclaration":
      return "container"
    case "TSTypeAliasDeclaration":
    case "TSPropertySignature":
      return "other"
    case "PropertyDefinition":
    case "TSAbstractPropertyDefinition":
    case "AccessorProperty":
    case "TSAbstractAccessorProperty":
      return parsed.grammar === "typescript" ? (isFunctionValue(node.value) ? "callable" : "other") : null
    default:
      return null
  }
}

/** The members a container holds, or none. */
function membersOf(node: Node): Node[] {
  switch (node.type) {
    case "ClassDeclaration":
    case "TSInterfaceDeclaration":
      return (node.body as Node).body as Node[]
    case "TSModuleDeclaration": {
      let body = node.body as Node | undefined
      // `namespace A.B {}` is one namespace named `A.B`, not `B` inside `A`.
      while (body?.type === "TSModuleDeclaration") body = body.body as Node | undefined
      return body?.type === "TSModuleBlock" ? (body.body as Node[]) : []
    }
    default:
      return []
  }
}

/**
 * Unwraps the statements that merely decorate a declaration.
 *
 * `export function priceOf` wraps a function declaration, and an `export`
 * shares its line range, so unwrapping costs nothing and skipping it would lose
 * every exported declaration in the file — which is most of them. An ambient
 * `declare` was its own statement to the grammar and is not a declaration here.
 */
function unwrap(node: Node): Node[] {
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    const declaration = node.declaration as Node | null
    return declaration === null ? [] : unwrap(declaration)
  }
  // A class member marked `declare` is still a member.
  if (node.declare === true && !/^(PropertyDefinition|TSAbstractPropertyDefinition)$/.test(node.type)) return []
  return [node]
}

/**
 * Where a declaration starts, as the grammar read it: a method after its
 * decorators, and an exported class at `export` when its decorators come
 * before it (they belong to the export statement there).
 */
function startOf(parsed: Parsed, node: Node): number {
  const decorators = (node.decorators as Node[] | undefined) ?? []
  const last = decorators[decorators.length - 1]
  if (last === undefined) return node.start
  const after = skipTrivia(parsed.source, last.end)
  if (/^(MethodDefinition|TSAbstractMethodDefinition)$/.test(node.type)) return after
  if (node.type === "ClassDeclaration" && /^export\b/.test(parsed.source.slice(after))) return after
  return node.start
}

/** One-based, as every line number in a document is. */
function span(parsed: Parsed, node: Node): { from: number; to: number } {
  return { from: parsed.positionAt(startOf(parsed, node)).line, to: parsed.positionAt(node.end).line }
}

/**
 * Where a declaration's own name sits.
 *
 * The seam between a diff and the call graph, exactly as it was when a provider
 * answered: the first line of `export function priceOf` starts on `export`, and
 * a question asked there is a question about nothing. The name's position
 * travels with the declaration so the walk never has to guess it from a range.
 */
function nameAt(parsed: Parsed, offset: number): { line: number; column: number } {
  const at = parsed.positionAt(offset)
  return { line: at.line, column: at.column + 1 }
}

/** A declaration's written name and where it starts; a computed name keeps its brackets. */
function nameOf(parsed: Parsed, node: Node): { text: string; start: number } | null {
  const key = (node.key ?? node.id) as Node | null | undefined
  if (key === null || key === undefined) return null
  if (node.type === "TSModuleDeclaration") {
    // `namespace A.B {}`: the dotted name as written.
    let inner = node
    while ((inner.body as Node | undefined)?.type === "TSModuleDeclaration") inner = inner.body as Node
    return { text: parsed.source.slice(key.start, (inner.id as Node).end), start: key.start }
  }
  if (node.computed === true) {
    const open = parsed.source.lastIndexOf("[", key.start)
    return { text: parsed.source.slice(open, parsed.source.indexOf("]", key.end) + 1), start: open }
  }
  if (key.type === "Identifier") return { text: key.name as string, start: key.start }
  return { text: textOf(parsed, key), start: key.start }
}

/**
 * The declarations bound by one `const`, `let` or `var` statement.
 *
 * One statement can bind several names, and each is its own declaration. A name
 * bound to an arrow function is a callable and behaves exactly like a declared
 * function — measured against a real language server before this existed, and
 * true of the grammar for the same reason: it is a function with a name.
 */
function fromLexical(parsed: Parsed, node: Node, prefix: string): SymbolSpan[] {
  const out: SymbolSpan[] = []
  for (const declarator of node.declarations as Node[]) {
    const id = declarator.id as Node
    const end = id.type === "Identifier" ? id.start + (id.name as string).length : ((id.typeAnnotation as Node | undefined)?.start ?? id.end)
    const name = parsed.source.slice(id.start, end).trimEnd()
    out.push({
      name: prefix === "" ? name : `${prefix}.${name}`,
      // The whole statement, not the declarator: `const x = 1, y = 2` spans one
      // range and a reader pointed at half of it is pointed at a fragment.
      ...span(parsed, node),
      nameAt: nameAt(parsed, id.start),
      kind: isFunctionValue(declarator.init) ? "callable" : "other",
    })
  }
  return out
}

/**
 * The members a constructor declares through its own parameters.
 *
 * `constructor(private readonly folder: () => string)` declares a class field
 * called `folder` and nothing in the class body says so. Missing them meant a
 * call to `this.folder()` found no member, fell through to "a call on a value
 * whose type decides it", and became a question no reader could answer — the
 * value is whatever the constructor was handed.
 *
 * A plain parameter is not a member. The difference is an accessibility
 * modifier or `readonly`, which is how TypeScript spells it too.
 */
function parameterProperties(parsed: Parsed, constructorNode: Node, prefix: string): SymbolSpan[] {
  const out: SymbolSpan[] = []
  for (const parameter of (constructorNode.value as Node).params as Node[]) {
    if (parameter.type !== "TSParameterProperty") continue
    if (parameter.accessibility === undefined && parameter.readonly !== true) continue
    const inner = parameter.parameter as Node
    const name = inner.type === "AssignmentPattern" ? (inner.left as Node) : inner
    if (name.type !== "Identifier") continue

    out.push({
      name: prefix === "" ? (name.name as string) : `${prefix}.${name.name as string}`,
      ...span(parsed, parameter),
      nameAt: nameAt(parsed, name.start),
      // A field, whatever its type says it holds. What a call through it
      // reaches is decided by whoever constructed the class, not here.
      kind: "other",
    })
  }
  return out
}

/**
 * Walks one level of declarations, descending into containers only.
 *
 * The descent rule is the whole of the local-variable fix: a container's
 * members are the declarations a reader cares about, and a callable's insides
 * are its own business. Nothing in a function body is reachable from here, so
 * nothing in a function body can be mistaken for the thing a change was about.
 */
function walk(parsed: Parsed, nodes: readonly Node[], prefix: string, into: SymbolSpan[]): void {
  for (const wrapped of nodes) {
    for (const child of unwrap(wrapped)) {
      if (child.type === "VariableDeclaration") {
        into.push(...fromLexical(parsed, child, prefix))
        continue
      }

      const kind = classify(child, parsed)
      if (kind === null) continue

      const name = nameOf(parsed, child)
      if (name === null) continue
      const qualified = prefix === "" ? name.text : `${prefix}.${name.text}`

      into.push({ name: qualified, ...span(parsed, child), nameAt: nameAt(parsed, name.start), kind })

      if (child.type === "MethodDefinition" && name.text === "constructor" && (child.value as Node).type === "FunctionExpression") {
        into.push(...parameterProperties(parsed, child, prefix))
      }

      if (kind === "container") walk(parsed, membersOf(child), qualified, into)
    }
  }
}

/**
 * Every declaration in a parsed file, flattened to dotted paths.
 *
 * `StockService.hasStock` rather than a tree, because that is the form an
 * author writes and the form a suffix match can be made against. Containers
 * keep their own entry too: a class is a thing a document points at.
 *
 * An empty array is a real answer — a file of pure side effects declares
 * nothing — and is not the same as a file that does not parse, which gives
 * null. The two were one value when a provider answered, and telling them
 * apart is what lets the scaffold say which happened.
 */
export function declarationsIn(parsed: Parsed): SymbolSpan[] {
  const out: SymbolSpan[] = []
  walk(parsed, parsed.program.body as Node[], "", out)
  return out
}

/** The languages with declaration rules: TypeScript and JavaScript here, Python in `python.ts`. */
export type SymbolLanguage = "typescript" | "python"

/** The language a file's declarations are read in, or null when none is. */
export function symbolLanguageOf(file: string): SymbolLanguage | null {
  if (/\.(py|pyi)$/i.test(file)) return "python"
  if (/\.(ts|mts|cts|tsx|jsx|js|mjs|cjs)$/i.test(file)) return "typescript"
  return null
}

/**
 * What one file declares, from its text.
 *
 * Null when no rules read its language or the text does not parse, which is
 * not the same as an empty array; see `declarationsIn`.
 */
export async function fileSymbols(file: string, text: string): Promise<SymbolSpan[] | null> {
  const language = symbolLanguageOf(file)
  if (language === null) return null
  if (language === "python") return withTree(file, text, pythonDeclarationsIn, null)
  const parsed = parse(file, text)
  return parsed === null ? null : declarationsIn(parsed)
}
