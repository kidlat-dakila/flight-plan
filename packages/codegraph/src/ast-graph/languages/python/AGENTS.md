# packages/codegraph/src/ast-graph/languages/python

How a `.py` or `.pyi` file is read. Read [Python](../../../../../../docs/vocabulary/codegraph/languages/python.md) before changing anything here. The rules of [ast-graph/AGENTS.md](../../AGENTS.md) and of [packages/codegraph/AGENTS.md](../../../../AGENTS.md) hold here too.

## Rules

- **Python binds names, it does not declare them.** `ast-graph/languages/python/` holds `PythonASTGraphFile`. `bindings.ts` reads every place a name is bound (a `def`, a `class`, a parameter, an assignment target, a loop, `with`, `except`, `:=`, a `match` capture, a type parameter, an import) and keeps the first one in each scope as the declaration; a later binding of that name in that scope is a use. A scope is the body of a function or lambda, a comprehension, or the file. There is no block scope, `global` and `nonlocal` move a binding to the scope they name, and what a class body binds is neither a variable nor a use, because a method cannot see it. Every import of a name is kept when its first binding is an import, so `import shop.tax` and `import shop.pricing` both count.
- **A Python import of a name may be a module.** `from shop import pricing` has the imported name `*` when the file it resolved to is the module `pricing`, and `pricing` when the file is the package that defines it.
