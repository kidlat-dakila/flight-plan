// Bundle-time replacement for src/utl/try-require.cjs: only the bundled
// TypeScript can be required.
module.exports = function tryRequire(name) {
  return name === "typescript" ? require("typescript") : false
}
