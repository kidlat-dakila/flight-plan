// Bundle-time replacement for src/extract/transpile/javascript-wrap.mjs, which
// reads acorn's version with a runtime `require`.
import { version } from "acorn"

export default {
  isAvailable: () => true,
  version: () => `acorn@${version}`,
  transpile: (source) => source,
}
