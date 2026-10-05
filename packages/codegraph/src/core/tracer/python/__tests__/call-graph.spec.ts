import { describe, expect, it } from "vitest"
import { traceCallers } from "@/core/tracer/caller-tree"
import { parseSource } from "@/core/tracer/parse"
import type { PyRepo } from "@/core/tracer/python"
import { pythonCallGraph, refFor } from "@/core/tracer/python/call-graph"
import { declarationsIn } from "@/core/tracer/python/declarations"

async function trace(files: Record<string, string>, targetFile: string, targetName: string) {
  const repo: PyRepo = { files: new Set(Object.keys(files)), read: async (p) => await Promise.resolve(files[p] ?? null), rootsFor: async () => await Promise.resolve([""]) }
  const candidates = async (t: { name: string }) => {
    const name = t.name.slice(t.name.lastIndexOf(".") + 1)
    const word = new RegExp(`\\b${name}\\b`)
    return await Promise.resolve(Object.entries(files).filter(([, text]) => word.test(text)).map(([p]) => p))
  }
  const tree = await parseSource(targetFile, files[targetFile])
  if (tree === null) throw new Error("did not parse")
  const local = declarationsIn(tree).find((d) => d.name === targetName || d.name.endsWith(`.${targetName}`))
  if (local === undefined) throw new Error("target not found")
  return traceCallers(pythonCallGraph(repo, candidates), refFor(targetFile, local))
}
const callers = (node: Awaited<ReturnType<typeof trace>>) => node.callers.map((o) => o.code.name).sort()

const PRICING = "def price_of():\n    return 1\n"

describe("python caller graph", () => {
  it("finds a direct caller and where it calls", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/checkout.py": "from pkg.pricing import price_of\ndef checkout():\n    return price_of()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(node.code.name).toBe("price_of")
    expect(callers(node)).toStrictEqual(["checkout"])
    expect(node.callers[0].calledAt?.start.line).toBe(3)
  })

  it("follows an aliased import", async () => {
    const node = await trace(
      { "pkg/__init__.py": "", "pkg/pricing.py": PRICING, "pkg/c.py": "from pkg.pricing import price_of as p\ndef c():\n    return p()\n" },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual(["c"])
  })

  it("follows a module import member call", async () => {
    const node = await trace(
      { "pkg/__init__.py": "", "pkg/pricing.py": PRICING, "pkg/c.py": "import pkg.pricing\ndef c():\n    return pkg.pricing.price_of()\n" },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual(["c"])
  })

  it("follows a relative import", async () => {
    const node = await trace(
      { "pkg/__init__.py": "", "pkg/pricing.py": PRICING, "pkg/c.py": "from . import pricing\ndef c():\n    return pricing.price_of()\n" },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual(["c"])
  })

  it("resolves through an __init__ re-export barrel", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "from pkg.pricing import price_of\n",
        "pkg/pricing.py": PRICING,
        "app.py": "from pkg import price_of\ndef use():\n    return price_of()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual(["use"])
  })

  it("does not match a bare call to an unrelated, same-named function", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/c.py": "import pkg.pricing\ndef c():\n    return pkg.pricing.price_of()\n",
        "other/__init__.py": "",
        "other/billing.py": "def price_of():\n    return 2\n",
        "other/d.py": "from other.billing import price_of\ndef d():\n    return price_of()\n",
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual(["c"])
  })

  it("ignores a type-only (TYPE_CHECKING) import", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": PRICING,
        "pkg/c.py": ["from typing import TYPE_CHECKING", "if TYPE_CHECKING:", "    from pkg.pricing import price_of"].join("\n"),
      },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual([])
  })

  it("does not count a function passed as a value", async () => {
    const node = await trace(
      { "pkg/__init__.py": "", "pkg/pricing.py": PRICING, "pkg/c.py": "from pkg.pricing import price_of\nhandlers = [price_of]\n" },
      "pkg/pricing.py",
      "price_of",
    )
    expect(callers(node)).toStrictEqual([])
  })
})

describe("the shape of the tree", () => {
  it("does not make a recursive function its own caller", async () => {
    const node = await trace(
      { "pkg/f.py": "def fac(n):\n    return n * fac(n - 1)\n" },
      "pkg/f.py",
      "fac",
    )
    expect(node.callers).toStrictEqual([])
  })

  it("cuts a mutual call cycle", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/alpha.py": "from pkg.beta import b\ndef a():\n    return b()\n",
        "pkg/beta.py": "from pkg.alpha import a\ndef b():\n    return a()\n",
      },
      "pkg/alpha.py",
      "a",
    )
    const b = node.callers[0]
    expect(b.code.name).toBe("b")
    expect(b.callers[0]).toMatchObject({ code: { name: "a" }, callers: [] })
  })
})
