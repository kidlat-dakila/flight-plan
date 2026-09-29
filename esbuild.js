const esbuild = require("esbuild")
const path = require("path")
const fs = require("fs")

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started')
		})
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`)
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})
			console.log('[watch] build finished')
		})
	},
}

const shared = {
	bundle: true,
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	platform: 'node',
	// Prefer a package's ESM build over its UMD one. esbuild defaults to
	// `main` for node, and a UMD factory that takes `require` as a parameter
	// defeats static analysis: the call is left for runtime and then fails to
	// resolve relative to the bundle. jsonc-parser is shaped exactly like
	// that, and the failure only shows up when the extension activates.
	mainFields: ['module', 'main'],
	logLevel: 'silent',
}

/**
 * dependency-cruiser, as the code graph uses it, inside one file.
 *
 * It loads compilers and reporters by names computed at run time
 * (`import(name)`, `require.resolve(name)`, a reporter per output type), which
 * a bundle cannot follow, and the server ships with no node_modules beside it.
 * Each such module is swapped for the replacement in `tools/dependency-cruiser`:
 * TypeScript comes in statically, everything else is "not available", and the
 * result comes back as an object. The replacements name files inside
 * dependency-cruiser, so its version is pinned in package.json.
 *
 * @type {import('esbuild').Plugin}
 */
const dependencyCruiserPlugin = {
	name: 'dependency-cruiser',

	setup(build) {
		const replacement = (file) => ({ path: path.join(__dirname, 'tools', 'dependency-cruiser', file) })
		const inCruiser = (args) => args.importer.includes(`${path.sep}dependency-cruiser${path.sep}src${path.sep}`)
		// Imported by relative path or through the package's `#…` imports map.
		const swaps = [
			[/(^|[/#])try-import\.mjs$/, 'try-import.mjs'],
			[/(^|[/#])try-import-available\.mjs$/, 'try-import-available.mjs'],
			[/(^|[/#])try-require\.cjs$/, 'try-require.cjs'],
			[/(^|[/#])javascript-wrap\.mjs$/, 'javascript-wrap.mjs'],
			[/(^|[/#])report\/index\.mjs$/, 'report-index.mjs'],
		]
		for (const [filter, file] of swaps) {
			build.onResolve({ filter }, (args) => (inCruiser(args) ? replacement(file) : undefined))
		}
	},
}

/**
 * What the server bundle needs beyond the shared options, for dependency-cruiser.
 * Exported with the plugin so a test can bundle the code graph the same way.
 */
const serverOptions = {
	// TypeScript, bundled as CommonJS, calls `require` for Node's own modules
	// and reads `__filename`; an ES module has neither.
	banner: {
		js: [
			"import { createRequire as __flightplanRequire } from 'node:module';",
			"import { fileURLToPath as __flightplanPath } from 'node:url';",
			"import { dirname as __flightplanDirname } from 'node:path';",
			'const require = __flightplanRequire(import.meta.url);',
			'const __filename = __flightplanPath(import.meta.url);',
			'const __dirname = __flightplanDirname(__filename);',
		].join(' '),
	},
	// A fallback for an old enhanced-resolve inside the tsconfig-paths plugin,
	// which dependency-cruiser loads only for its `tsConfig` option; the code
	// graph does not pass that option.
	external: ['enhanced-resolve/lib/createInnerCallback'],
}

/*
 * The MCP server is a second, separate bundle.
 *
 * ESM rather than CJS, because it locates its own configuration file with
 * `import.meta.url`. A standalone file with everything inlined, because setup
 * copies exactly one file into global storage and runs it with bare `node`:
 * there is no install step at the destination and no node_modules beside it.
 */
async function buildMcpServer() {
	const ctx = await esbuild.context({
		...shared,
		entryPoints: ['src/api/mcp/start.ts'],
		format: 'esm',
		outfile: 'dist/mcp-server.mjs',
		// The version the log names, so a log says which server wrote it.
		define: { __FLIGHTPLAN_VERSION__: JSON.stringify(require('./package.json').version) },
		...serverOptions,
		plugins: [dependencyCruiserPlugin, esbuildProblemMatcherPlugin],
	})
	if (watch) {
		await ctx.watch()
	} else {
		await ctx.rebuild()
		await ctx.dispose()
	}
}

/**
 * The instruction markdown, copied as files into `dist/instructions/`.
 *
 * The server and the extension read these trees from disk rather than from
 * strings built into the bundle, so the VSIX carries them and setup copies them
 * beside the installed server. Replaced whole, so a withdrawn file does not
 * survive in `dist/` from an earlier build.
 */
function copyInstructions() {
	const from = path.join(__dirname, 'src', 'lib', 'schemas')
	const to = path.join(__dirname, 'dist', 'instructions')
	fs.rmSync(to, { recursive: true, force: true })
	for (const tree of ['default_instructions', 'field_descriptions']) {
		fs.cpSync(path.join(from, tree), path.join(to, tree), { recursive: true })
	}
}

async function main() {
	copyInstructions()
	const ctx = await esbuild.context({
		...shared,
		entryPoints: [
			'src/vscode/extension.ts'
		],
		format: 'cjs',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	})
	if (watch) {
		await ctx.watch()
	} else {
		await ctx.rebuild()
		await ctx.dispose()
	}
	await buildMcpServer()
}

module.exports = { shared, serverOptions, dependencyCruiserPlugin }

if (require.main === module) {
	main().catch(e => {
		console.error(e)
		process.exit(1)
	})
}
