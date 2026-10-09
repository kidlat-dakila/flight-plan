# Python in the codegraph

How the [codegraph](../../codegraph.md) reads a Python file. This page holds what is particular to the language. The mechanisms themselves are in [Import graph](../import-graph.md) and [AST graph](../ast-graph.md).

| | |
|---|---|
| **Files** | `.py`, `.pyi` |
| **Grammar** | tree-sitter `python` |
| **Reader of the import graph** | The Python reader. A Python file is never in a cluster with a script file. |
| **Class of the AST graph** | `PythonASTGraphFile` |
| **Journey Flow Diagram** | Plain call edges, no traced lines, few named entry points |

## Import graph

### What counts as an import

Every `import` and `from … import` statement of a file, at any depth.

| Written as | Module | Level | Imported name | Named in the graph |
|---|---|---|---|---|
| `import shop.tax` | `shop.tax` | 0 | none | `shop.tax` |
| `import shop.tax as tax` | `shop.tax` | 0 | none | `shop.tax` |
| `from shop.pricing import price_of` | `shop.pricing` | 0 | `price_of` | `shop.pricing:price_of` |
| `from . import tax` | none | 1 | `tax` | `.:tax` |
| `from ..rates import RATES` | `rates` | 2 | `RATES` | `..rates:RATES` |
| `from shop.pricing import *` | `shop.pricing` | 0 | `*` | `shop.pricing:*` |

The last column is the specifier a file of the import graph keeps in `importedFilePaths`: the module as written, then `:` and the name taken from it.

### How a module resolves

A relative import is resolved from the folder of the file. An absolute import is tried under each module root in turn.

```mermaid
flowchart TD
  imported["An import"] --> level{"Relative?"}
  level -->|"yes: one dot is the file's folder,<br/>each further dot one folder up"| fromFolder["Resolve under that folder"]
  level -->|no| roots["Resolve under each module root, in order"]
  roots -->|not found| packages["Resolve under the folder of a known<br/>top-level package of the repository"]
  fromFolder -->|not found| external["A library: not in the graph"]
  packages -->|not found| external
```

**The module roots of a file** come from the nearest project file above it: `pyproject.toml`, `setup.cfg` or `setup.py`.

| The project file | Module roots, in order |
|---|---|
| Declares a `src` layout | Its folder's `src`, then the root of the repository |
| Declares none | Its folder, then the root of the repository |
| There is no project file | Every folder named `src` above the file, then the root of the repository |

A `src` layout is declared by `package-dir = { "" = "src" }` under `[tool.setuptools]`, by a Poetry package with `from = "src"`, by `package_dir` in the `[options]` of `setup.cfg`, or by `package_dir={"": "src"}` or `where="src"` in `setup.py`.

**Under a root, a module is a file or a package:**

| Looking for `shop.pricing` under `src` | Found as |
|---|---|
| `src/shop/pricing.py` or `src/shop/pricing.pyi` | The module |
| `src/shop/pricing/__init__.py` or `__init__.pyi` | The package |

Every folder on the way must be a package: a folder with an `__init__` file, or any folder that holds files.

**An imported name may be a module.** `from shop import pricing` could take the name `pricing` from `shop/__init__.py`, or it could be the module `shop/pricing.py`. The module is tried first:

```mermaid
flowchart LR
  statement["from shop import pricing"] --> tryModule{"Is there a<br/>shop/pricing.py?"}
  tryModule -->|yes| module["shop/pricing.py"]
  tryModule -->|no| init["shop/__init__.py"]
```

### The patterns an importer would contain

To find the importers of a file, the reader gives the search these patterns. See [An importer is searched for, then proven](../import-graph.md#an-importer-is-searched-for-then-proven).

| For the file | A candidate contains | Such as |
|---|---|---|
| `shop/tax.py` | An import line that names the module | `import shop.tax`, `from .tax import rate`, `from shop import tax` |
| `shop/pricing/__init__.py` | An import line that names the package's folder | `from shop import pricing`, `import shop.pricing` |
| Any file | An import from its package that carries on over several lines | `from shop.pricing import (` |
| Any file | A relative import that carries on over several lines, or any relative import when the file is an `__init__` | `from . import (`, `from .. import tax` |

## AST graph

### Python binds names, it does not declare them

Python has no declaration statement. A name comes into being wherever it is bound: a `def`, a `class`, a parameter, an assignment target, a loop, `with`, `except`, `:=`, a `match` capture, a type parameter or an import.

**The first binding of a name in a scope is its declaration. A later binding of that name in that scope is a use.**

```python
total = 0                 # the declaration of total

for line in cart.lines:   # the declaration of line
    total = total + line  # a use of total, bound again, and a use of line
```

### Scopes

| A scope | Not a scope |
|---|---|
| The body of a function or a lambda | An `if`, a `for`, a `with` or a `try` block |
| A comprehension | |
| The file | |

- **There is no block scope.** A name bound inside an `if` belongs to the function around it.
- **`global` and `nonlocal` move a binding** to the scope they name.
- **What a class body binds is neither a variable nor a use**, because a method cannot see it.

```python
class Cart:
    tax_rate = 0.2                    # bound in the class body: not a variable

    def total(self):
        return self.net * tax_rate    # not a use of the line above: a method cannot see it
```

### Imports and exports

- **Every import of a name is kept** when its first binding is an import, so `import shop.tax` and `import shop.pricing` both count, though both bind `shop`.
- **A file exports every name it imports.** There is no export statement, so a name a file imports can be imported from that file by another.
- **An import of a name that resolved to a module** has the imported name `*`: in `from shop import pricing`, `pricing` stands for the whole of `shop/pricing.py`. When it resolved to the package that defines it, the imported name is `pricing`.

```python
# shop/__init__.py
from shop.pricing import price_of        # shop now exports price_of

# checkout.py
from shop import price_of                # reaches shop/pricing.py through shop/__init__.py

def total_of(cart):
    return sum(price_of(line) for line in cart.lines)
```

```mermaid
flowchart LR
  priceOf["price_of<br/>in shop/pricing.py"]:::changed -->|imported, so exported| init["shop/__init__.py"]
  init -->|imported| checkout["checkout.py"]
  checkout -->|used in| totalOf["total_of"]
  classDef changed stroke:#d97706,stroke-width:3px
```

## Journey Flow Diagram

A Python file gives the trace no syntax sites and no statements. Its Journey Flow Diagram therefore has:

- **plain call edges**: a function that uses a changed function is the next node;
- **no traced lines**;
- **no named entry point** beyond that of a route file and "Not used yet".

```python
# pricing.py
def price_of(line):                      # diff
    ...

# checkout.py
def total_of(cart):
    return sum(price_of(line) for line in cart.lines)
```

```mermaid
flowchart LR
  entry(["Not used yet"]) --> totalOf["total_of"] --> priceOf["price_of (changed)"]:::changed
  classDef changed stroke:#d97706,stroke-width:3px
```

## Where it lives in the code

| Part | Where |
|---|---|
| Reading the imports of a file, and naming each | `src/import-graph/languages/python-specifiers.ts` |
| The module roots and the known packages | `src/import-graph/languages/python-module-roots.ts` |
| Resolving a module | `src/import-graph/languages/python-resolve.ts` |
| The patterns of an importer | `src/import-graph/languages/python-importer-patterns.ts` |
| The class of the AST graph | `src/ast-graph/languages/python/index.ts` |
| Bindings and scopes | `bindings.ts` and `scopes.ts` in the same folder |
