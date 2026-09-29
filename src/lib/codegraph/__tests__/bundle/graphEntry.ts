/**
 * Bundled by `bundle.test.ts` the way the server is bundled, then run alone:
 * builds the import graph of a repository's HEAD and prints what it holds.
 */
import { reviewRepo } from "../../../git/reviewRepo"
import { repoGraph } from "../../tracer/typescript/repoGraph"

const root = process.argv[2] ?? "."
const review = await reviewRepo({ root, base: "HEAD", head: "HEAD" })
const graph = await repoGraph(review.base)
let edges = 0
for (const list of graph.imports.values()) edges += list.length
console.log(JSON.stringify({ files: graph.imports.size, edges, unhandled: [...graph.unhandled.keys()] }))
