// Bundle-time replacement for src/extract/transpile/try-import-available.mjs:
// only the bundled TypeScript is available.
export default function tryImportAvailable(name) {
  return name === "typescript"
}
