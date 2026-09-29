// Bundle-time replacement for dependency-cruiser's src/utl/try-import.mjs.
// The original loads a compiler with a runtime `import(name)`, which a bundle
// cannot follow; the server ships with no node_modules beside it. TypeScript
// is the one compiler the code graph uses, so it is imported statically.
import * as typescript from "typescript"

export default async function tryImport(name) {
  return name === "typescript" ? (typescript.default ?? typescript) : false
}
