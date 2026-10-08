# Codegraph

## Definition

The codegraph is Flight Plan's map of how a change connects to the rest of the code. For a branch or a pull request it works out four things, in this order:

- **Which files belong together.** The files that import a changed file and the files it imports, joined into groups that share a file.
- **What each file declares and uses.** The functions, classes and values of every file of a group, where each name is used, and which of them the diff touched.
- **Who uses the changed code.** From each changed declaration, every declaration that uses it, and the ones that use those, up to code nothing else uses.
- **The structure of a review.** One segment per group, with its Journey Flow Diagram, its Blast Diagram and its Code Walkthrough.

Flight Plan builds the codegraph from the syntax trees of the files themselves, read straight from git. It needs no language server, no prebuilt index and no checked-out working tree.

## Why it exists

A review artifact is only worth trusting if its structure is right. The Journey Flow Diagram and the Blast Diagram make claims about the code: this function uses that one, and this change reaches these places. If an agent drew those diagrams from reading the code, it could miss a user or invent a connection, and a reviewer would have no way to tell. Reading enough files to find every user would also cost the agent a large number of tokens on every review.

The codegraph splits the work in two. **Structure is derived**: Flight Plan computes who uses what, directly from the code, so the same change always gives the same structure. **Prose is authored**: the agent explains what the structure means, such as why a path matters or what could break along it. Neither side writes the other's half, so an agent cannot restructure a diagram and the codegraph never makes up an explanation.

Two more properties follow from that goal:

- **It works on any machine with git.** Files, file lists and searches are read from commits through a git adapter, so there is nothing to install, no index to build and no worktree to clean up.
- **Its cost follows the size of the change, not the size of the repository.** It reads only the changed files, the files a search says might import them and prove to, and the files they import.

## Terms

| Term | Meaning |
|---|---|
| **Change** | The lines a branch or a pull request changes, between its base commit and its head commit. |
| **Import graph** | For one changed file, the files that import it and the files it imports, directly or through other files, each with the files it imports and is imported by. |
| **Cluster** | The import graphs that share a file, joined into one. A cluster is one connected part of one language, and it becomes one segment. |
| **Encapsulation** | Something a changed line can belong to. At the root of a file: a function, a class, a variable, an enum, a namespace or a default export. Below the root: a function, a class, a method, or a variable, field or member of a declared object that holds a function or a class. |
| **Root encapsulation** | An encapsulation at the top level of a file. |
| **AST graph** | The files of one cluster, parsed. Each file lists its root encapsulations, its variables, its imports, its exports and every use of a name. |
| **Diff location** | A range of changed lines with the root encapsulation it lies in and the nearest encapsulation that holds it. |
| **Loose statement** | A top-level statement that no root encapsulation shares a line with: an import, a type, an interface or a bare call. |
| **Use** | A place where a name is read, called, rendered or handed over. A use belongs to the declaration its name resolves to. |
| **Caller** | The nearest encapsulation that holds a use of another encapsulation. |
| **Usage tree** | A changed encapsulation with its callers, and their callers, as far as they go. |
| **Segment** | What the codegraph returns for one cluster: its import graph, its AST graph, its Journey Flow Diagram, its Blast Diagram and its Code Walkthrough. |

## Core logic

### 1. Read the change

The codegraph takes a git adapter and a branch or a pull request. It asks the adapter for the base commit and the head commit, and reads the changed files between them once, each with its patch and whether it was added, modified or deleted.

The changed lines of a file come from its patch:

- An added or a changed line is a changed line.
- Lines that were only removed count as a change on the line before them.
- A deleted file has no changed lines.

### 2. Trace the import graph

For each changed file the codegraph traces two things, and follows both through other files until nothing new is reached:

- **the files that import it**, and the files that import those;
- **the files it imports**, and the files those import.

A changed file is traced at the head commit and a deleted file at the base commit. A file no language reads has no import graph.

**An importer is searched for, then proven.** A language gives the patterns a file that imports another would contain, the git adapter searches for them, and a candidate counts only when one of its imports resolves to that file. A dynamic `import()` call is not an import.

The files are read in batches: one search for the importers of every file of a level, and one read for the files of a level.

### 3. Join the import graphs into clusters

Two import graphs that share a file are one cluster. A cluster is therefore every changed file that is connected to another through imports, with the files between them. Two changes with no file in common are two clusters, and two segments in the review.

### 4. Build the AST graph of each cluster

Every file of a cluster is parsed once, with the class of its language. A file no language reads is left out. Each file is asked for:

- its root encapsulations, with the encapsulations nested in them;
- its variables and its imports;
- its export aliases and its re-exports;
- every use of a name;
- its syntax sites and its statements, which the Journey Flow Diagram reads.

**A name is resolved once per space.** A declaration and a use each live in the value space, the type space or both, so `const Cart` and `type Cart` in one scope stay apart. A use belongs to the declaration of its name with the nearest scope. A different variable with the same name is not a use.

**A changed line is placed.** The changed lines of a file become diff locations. A location belongs to one root encapsulation, so a range that spans several, such as the whole of a new file, is split into one location per root encapsulation. Changed lines outside every root encapsulation have no location and are loose.

```ts
export function validateFirstname(name: string) {
  if (name.length < 3) {                // the changed line
    throw new Error("First name must be at least 3 characters")
  }
}
```

The changed line lies in `validateFirstname`, so `validateFirstname` is the changed encapsulation.

### 5. Climb from each change through its uses

From a changed encapsulation the codegraph finds every use of it:

- the uses of its name in its own file;
- the uses in every file of the cluster that imports it, by any name the file exports it under.

The nearest encapsulation that holds a use is a caller. The codegraph then climbs from each caller the same way.

- **A caller is listed once**, at its first use.
- **The climb never enters an encapsulation that is already on the path**, so recursion ends.
- **A use outside every encapsulation gives no caller.** The climb ends there.
- **A use in a type counts.** The climb follows every use of a name, so a function that only names a changed type in its signature is a caller of that type. The Journey Flow Diagram's own trace is narrower: there a use in a type, an import or an export list is not a use.

```ts
// routes/users.ts
import { validateFirstname } from "../validation"

export const createUser = (body: UserBody) => {
  validateFirstname(body.firstname)
  return saveUser(body)
}
```

```text
validateFirstname (changed)
└─ createUser
```

**A name is followed through exports.** A root encapsulation is known to an importer by its own name and by every alias it is exported under: `default` for `export default function priceOf`, `price` for `export { priceOf as price }`. A file hands an imported name on under the names it exports that import by, and through its re-exports: `export { a as b } from`, `export * from`, which keeps every name but `default`, and `export * as ns from`.

**An encapsulation without a name of its own is traced through the one that holds it.** A method is not a variable, so its uses are the uses of its class, and its node is named `Class.method`.

**A change outside every encapsulation is traced through what it declares.** A loose statement the diff touches is traced to the uses of the names it declares, and its node is named after those names, or `Lines 3–5` when it declares none.

### 6. Build the three parts of a segment

Each cluster becomes one segment:

- **The Journey Flow Diagram** is traced from the files of the cluster, from every change up to what triggers it. A segment in which no code that runs changed has none. See [Journey Flow Diagram](journey-flow-diagram.md).
- **The Blast Diagram** is built from the usage trees of the cluster. A segment with any change has one. See "Consumers".
- **The Code Walkthrough** has one File Section per file with changes, and one waypoint per changed declaration.

## Output

`buildBranchCodegraph` returns the segments of a change:

```ts
interface Codegraph {
  segments: CodegraphSegment[]
}

interface CodegraphSegment {
  title: string | null
  importGraph: ImportGraphFile[]
  astGraph: ASTCodeGroupGraph
  journeyFlowDiagram: JourneyFlow | null
  blastRadiusDiagram: Blast
  codeWalkthrough: LinkedCodeWalkthrough
}
```

`title` is `null` until a consumer writes it.

### A file of the import graph

```ts
interface ImportGraphFile {
  filePath: string
  gitSha: string                            // the commit the file was read at
  diffType: "modified" | "added" | "deleted" | null
  importedBy: string[]                      // files of the trace that import it
  importsTo: string[]                       // files of the trace it imports
  importedFilePaths: Map<string, string>    // each import specifier → the file it resolves to
}
```

`importedFilePaths` holds every import of the file, whether the imported file is in the trace or not. `importsTo` lists only the files inside the trace.

### A usage tree

```ts
interface DiagramNode {
  id: { file: string; line: number }
  code: {
    file: string
    name: string                // "priceOf", "Cart.total"
    definedAt: SourceRange
    enclosingRange: SourceRange
  }
  calledAt?: SourceRange        // where this node uses the node below it
  via?: "call" | "value"
  callers: DiagramNode[]
}
```

The tree is inverted: its root is the changed encapsulation, and `callers` grows toward the code nothing else uses. Nothing sets `via`, so every edge of the Blast Diagram is a `call`.

### The walkthrough

A waypoint of the codegraph carries more than the stored one: its line `range`, a `category` read from the syntax tree (`function`, `class`, `method`, `variable`, `import`, `type` or `statement`), and the ids of the Journey Flow Diagram node and the Blast Diagram node it belongs to, each `null` when the diagram has no node for it.

## Language support

| Language | Files | Import graph | AST graph | Journey Flow Diagram |
|---|---|---|---|---|
| TypeScript | `.ts`, `.mts`, `.cts` | yes | yes | calls, entry points and traced lines |
| JavaScript and JSX | `.tsx`, `.jsx`, `.js`, `.mjs`, `.cjs` | yes | yes | the same, with handlers, components, contexts and routes |
| Python | `.py`, `.pyi` | yes | yes | plain call edges, no traced lines, few named entry points |
| Vue | `.vue` | yes | yes | plain call edges, no traced lines, few named entry points |

Every file is parsed with tree-sitter: the `typescript` grammar for TypeScript, the `tsx` grammar for JavaScript and JSX, the `python` grammar for Python, and the `html` grammar for a Vue file, whose script blocks and template expressions are then parsed as TypeScript.

A language is two parts: a module of the import graph, which reads and resolves the imports of a file and gives the patterns an importer would contain, and a class of the AST graph, which reads the encapsulations, variables, imports, exports and uses from a parsed tree.

## Consumers

### Journey Flow Diagram

The Journey Flow Diagram shows how execution reaches a change, left to right, like a debugging trace. It is not built from the usage trees. It has a trace of its own over the same files, which starts at every change and climbs through what uses it:

- every path starts at an Entry Point Node, which names what triggers the code from outside: a page visit, a user action, an API call;
- the declarations from there to the change are Code Nodes, and each is either changed or not;
- a user action leads to a Code Node for the handler it runs, not to the component that holds the element;
- a path stops at its last change, so what the change calls and what uses its results are not drawn;
- an unchanged declaration that only forwards a value is folded into the edge;
- each Code Node carries its traced lines, the lines of that node the path goes through;
- each Code Node and each return carries its code views, the code a reviewer reads beside it;
- a component lists its events, its data and, when it has several return statements, its returns.

See [Journey Flow Diagram](journey-flow-diagram.md).

### Blast Diagram

The Blast Diagram shows what a change can affect. The usage trees of a segment are merged into one graph first: every declaration is listed once, named by its file and its name, with one edge from each user to what it uses. Two changes on one chain therefore share a diagram.

A node's ring is its distance to the nearest change:

- the changed declarations are the Epicenter Nodes, at ring 0;
- declarations one use away are Direct Impact Nodes;
- declarations further out are Indirect Impact Nodes.

The changed declarations are the changed encapsulations and the loose statements that declare a name, so a changed type is an Epicenter Node with its users around it. When a segment has neither, every loose change is one, so a segment with any change has an Epicenter Node.

See [Blast Diagram](blast-diagram.md).

### Code Walkthrough

A waypoint is the function a change is in, the method when the function is inside a class, or a loose statement. Each waypoint names the Journey Flow Diagram node and the Blast Diagram node it belongs to.

### Who calls it

`tools/playground-fixtures` runs `buildBranchCodegraph` against whole repositories and keeps the results as snapshots, which the app shows as fixture reviews in a development build.

A review requested in the app is built by `buildScaffold`, which makes the File Sections and the waypoints from the diff and gives the segment no Journey Flow Diagram and no Blast Diagram.

An agent's tools can fill in labels and explanations on existing nodes. They have no field for adding, moving or removing a node, and none for saying whether a segment has a diagram. The codegraph owns the structure, and the agent owns the prose.

## Where it lives in the code

The codegraph is the `packages/codegraph` package, and the backend imports it as `@flightplan/codegraph`. The shapes it reads and writes are in `packages/configurations`.

The entry point is `buildBranchCodegraph` in `src/index.ts`. The work runs in this order:

| Stage | Where |
|---|---|
| Read the change and trace which files import each changed file, and which files it imports | `src/import-graph/` |
| Join the traces that share a file into clusters | `src/import-graph/` (`clusterImportGraphs`) |
| Read the changed lines of each file from its patch | `src/diff-lines.ts` |
| Parse the files of a cluster and list what each declares and uses | `src/ast-graph/`, with one folder per language in `languages/` |
| Climb from each change through its uses | `src/ast-graph/trace-deep-usage.ts` |
| Trace the Journey Flow Diagram of a cluster | `src/journey-flow-diagram/` |
| Build the Blast Diagram of a cluster | `src/blast-radius-diagram/`, `src/ast-graph/usage-graph.ts` |
| Build the Code Walkthrough of a cluster | `src/code-walkthrough/` |

The same package holds the builders that turn a stored review artifact into what the review page renders, in `src/journey/`, `src/blast/`, `src/walkthrough/`, `src/code/` and `src/prose/`, and the builder of a first review artifact in `src/scaffold/`.

Each `__tests__/` folder holds a test for each rule of the code beside it. The cases that run the whole pipeline over a repository are in `tools/playground-fixtures`.
