/**
 * The Python value-flow reach matrix — one fixture per indirection pattern.
 *
 * Mirrors `tracer/typescript/__tests__/valueFlow.test.ts`: the tracer follows the
 * changed function as a *value* — through aliases, decorators, callbacks,
 * collections, returns and framework sinks — to every terminal call or sink, and
 * emits a named escape marker wherever it cannot cross a boundary rather than
 * dropping the reach silently.
 *
 * Each fixture asserts one concrete outcome: a **follow** pattern reaches the
 * declaration that invokes the value with the edge kind it arrived by (`call` or
 * `value`); an **escape** pattern stops at a named boundary and records the
 * reason. A lost pattern is an accepted, pinned result.
 */
import { describe, expect, it } from "vitest"
import { parseSource } from "../../parse"
import { declarationsIn } from "../declarations"
import { refFor } from "../callGraph"
import { traceReach } from "../reach"
import type { PyRepo } from ".."
import type { DiagramNode } from "../../../types"

const PRICING = "def price_of():\n    return 1\n"

async function trace(
  files: Record<string, string>,
  targetFile: string,
  targetName: string,
): Promise<DiagramNode> {
  const repo: PyRepo = {
    files: new Set(Object.keys(files)),
    read: async (p) => files[p] ?? null,
    rootsFor: async () => [""],
  }
  const candidates = async (t: { name: string }): Promise<string[]> => {
    const name = t.name.split(".").pop() ?? t.name
    const word = new RegExp(`\\b${name}\\b`)
    return Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([p]) => p)
  }
  const tree = await parseSource(targetFile, files[targetFile] ?? "")
  if (tree === null) throw new Error("did not parse")
  const local = declarationsIn(tree).find(
    (d) => d.name === targetName || d.name.endsWith(`.${targetName}`),
  )
  if (local === undefined) throw new Error(`target not found: ${targetName}`)
  return traceReach(repo, candidates, refFor(targetFile, local))
}

type Reached = { name: string; via: "call" | "value"; escape?: string }
const frontier = (node: DiagramNode): Reached[] =>
  node.callers
    .map((one) => ({
      name: one.escape ? "escape" : one.code.name,
      via: one.via ?? ("call" as const),
      ...(one.escape ? { escape: one.escape.reason } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

/** The declaration that invokes the value somewhere in the tree (by name). */
const invokes = (node: DiagramNode, name: string): DiagramNode | undefined => {
  const stack = [...node.callers]
  while (stack.length > 0) {
    const next = stack.pop()
    if (next === undefined) continue
    if (next.code.name === name) return next
    stack.push(...next.callers)
  }
  return undefined
}

describe("python value-flow reach — follow patterns", () => {
  it("1. direct call reaches the caller by a call edge", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/checkout.py":
          "from pkg.pricing import price_of\ndef checkout():\n    return price_of()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree)).toEqual([{ name: "checkout", via: "call" }])
  })

  it("2. a local alias is followed to the call", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/checkout.py":
          "from pkg.pricing import price_of\ndef checkout():\n    charge = price_of\n    return charge()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree)).toEqual([{ name: "checkout", via: "call" }])
  })

  it("3. a dotted module-member call reaches the caller by a call edge", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/checkout.py":
          "import pkg.pricing\ndef checkout():\n    return pkg.pricing.price_of()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree)).toEqual([{ name: "checkout", via: "call" }])
  })

  it("4. a route decorator makes the function an invocation (value)", async () => {
    const tree = await trace(
      {
        "app.py": [
          "from web import App",
          "app = App(__name__)",
          "@app.route('/x')",
          "def view():",
          "    return 1",
        ].join("\n"),
      },
      "app.py",
      "view",
    )
    expect(frontier(tree).some((r) => r.via === "value")).toBe(true)
  })

  it("5. a callback passed into an in-tree function descends into its param (value)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\nfrom pkg.reg import register\ndef wire():\n    register(price_of)\n",
        "pkg/reg.py": "def register(fn):\n    return fn()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).some((r) => r.name === "register" && r.via === "value")).toBe(true)
  })

  it("6. a function held in a literal collection then called by a literal index (value)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\ndef wire():\n    fns = [price_of]\n    return fns[0]()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).some((r) => r.via === "value")).toBe(true)
  })

  it("7. a returned function make()() reaches the caller (value)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/make.py":
          "from pkg.pricing import price_of\ndef make():\n    return price_of\ndef use():\n    return make()()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(invokes(tree, "use")?.via).toBe("value")
  })

  it("8. a urlpatterns path() sink is a registration invocation (value)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/views.py": "def view():\n    return 1\n",
        "pkg/urls.py":
          "from pkg.views import view\nfrom web.urls import path\nurlpatterns = [path('', view)]\n",
      },
      "pkg/views.py",
      "view",
    )
    expect(frontier(tree).some((r) => r.via === "value")).toBe(true)
  })

  it("9. an argparse set_defaults(func=...) sink is a registration invocation (value)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/handlers.py": "def handle():\n    return 1\n",
        "pkg/cli.py":
          "from pkg.handlers import handle\ndef cli():\n    parser = build()\n    parser.set_defaults(func=handle)\n",
      },
      "pkg/handlers.py",
      "handle",
    )
    expect(frontier(tree).some((r) => r.via === "value")).toBe(true)
  })
})

describe("python value-flow reach — escape boundaries", () => {
  it("10. a value put into a registry escapes (store)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\nregistry = Registry()\ndef wire():\n    registry.register(price_of)\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("store")
  })

  it("11. a value stored on self escapes (store)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/svc.py":
          "from pkg.pricing import price_of\nclass Svc:\n    def wire(self):\n        self.handler = price_of\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("store")
  })

  it("12. a value connected to a signal escapes (event-bus)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\nbus = Bus()\ndef wire():\n    bus.connect(price_of)\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("event-bus")
  })

  it("13. dynamic dispatch on a computed key escapes (dynamic-dispatch)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/run.py":
          "from pkg.pricing import price_of\ndef run(key):\n    handlers = { 'charge': price_of }\n    return handlers[key]()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("dynamic-dispatch")
  })

  it("14. a value spread as *args escapes (spread)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\ndef wire():\n    handlers = price_of\n    dispatch(*handlers)\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("spread")
  })

  it("15. a value handed to an un-indexed callee escapes (library)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/run.py":
          "from pkg.pricing import price_of\nfrom ext import debounce\ndef run():\n    d = debounce(price_of)\n    return d()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("library")
  })

  it("16. an unresolved wrapping decorator escapes (decorator)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": "from ext import memoize\n@memoize\ndef price_of():\n    return 1\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("decorator")
  })

  it("17b. a keyword arg absorbed by **kwargs escapes, not silently dropped (spread)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\nfrom pkg.reg import f\ndef wire():\n    f(handler=price_of)\n",
        "pkg/reg.py": "def f(**kwargs):\n    return kwargs\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    // `f` has no `handler` param; the value is absorbed via **kwargs and may still
    // be invoked inside `f` — the trace must mark the boundary, never drop it.
    expect(frontier(tree).map((r) => r.escape)).toContain("spread")
  })

  it("16b. the changed function used as a bare decorator is not silently dropped", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py": "from pkg.pricing import price_of\n@price_of\ndef other():\n    return 1\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    // `@price_of` above `def other` invokes price_of as a value (`other =
    // price_of(other)`) — the reach must not be empty (an invocation or a
    // "decorator" escape), never a silent drop.
    const reached = frontier(tree)
    expect(reached.length).toBeGreaterThan(0)
    expect(reached.some((r) => r.via === "value" || r.escape === "decorator")).toBe(true)
  })

  it("17. a value handed to a dynamic import escapes (import)", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/run.py":
          "from pkg.pricing import price_of\nimport importlib\ndef run():\n    importlib.import_module(price_of)\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(frontier(tree).map((r) => r.escape)).toContain("import")
  })
})

describe("python value-flow reach — following the function, never data", () => {
  it("18. a data value alongside the function is not followed", async () => {
    const tree = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/wire.py":
          "from pkg.pricing import price_of\ndef wire():\n    total = 1 + 2\n    charge = price_of\n    return charge()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    // Only the function path invokes the change; `total` is data and adds nothing.
    expect(frontier(tree)).toEqual([{ name: "wire", via: "call" }])
  })
})
