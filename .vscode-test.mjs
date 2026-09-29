import { defineConfig } from '@vscode/test-cli'

/**
 * One file, named rather than globbed.
 *
 * `out/test/**\/*.test.js` picked up every suite, and since the move to vitest
 * that is most of them: they use extensionless relative imports, which Node's
 * ESM loader rejects, so the whole run died on `validate.test.js` before
 * reaching the only suite that needs an extension host. A glob that silently
 * widens to include tests written for another runner is how this suite stopped
 * running without anyone noticing.
 */
export default defineConfig({
	files: 'out/vscode/__tests__/extension.test.js',
	/*
	 * Longer than mocha's two seconds.
	 *
	 * One suite asks a language server for a file's declarations, and the
	 * TypeScript server has to start before it can answer. Two seconds is a test
	 * that fails on a cold machine and passes on a warm one, which is worse than
	 * either outcome on its own.
	 */
	mocha: { timeout: 60_000 },
})
