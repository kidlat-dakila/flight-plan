// Bundle-time replacement for src/report/index.mjs, which loads each reporter
// from a computed path. The code graph reads the result object only, so every
// output type gets the identity reporter.
export async function getReporter() {
  return (results) => ({ output: results, exitCode: 0 })
}

export function getAvailableReporters() {
  return ["json"]
}
