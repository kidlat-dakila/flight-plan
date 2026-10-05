import { describe, expect, it } from "vitest"
import { refFor, type CallCandidates } from "@/core/tracer/typescript/call-graph"
import { declarationsIn } from "@/core/tracer/typescript/declarations"
import { parse } from "@/core/tracer/typescript/estree"
import { traceReach } from "@/core/tracer/typescript/reach"
import { moduleResolver } from "@/core/tracer/typescript/resolve"
import type { DiagramNode } from "@/core/types"

async function trace(
  files: Record<string, string>,
  targetFile: string,
  targetName: string,
): Promise<DiagramNode> {
  const candidates: CallCandidates = async (target) => {
    const name = target.name.slice(target.name.lastIndexOf(".") + 1)
    const word = new RegExp(`\\b${name}\\b`)
    return await Promise.resolve(Object.entries(files)
      .filter(([, text]) => word.test(text))
      .map(([path]) => path))
  }
  const names = new Set(Object.keys(files))
  const read = async (one: string): Promise<string | null> => await Promise.resolve(files[one] ?? null)
  const repo = { files: names, read, resolve: moduleResolver(names, read) }
  const tree = parse(targetFile, files[targetFile] ?? "")
  if (tree === null) throw new Error("target did not parse")
  const local = declarationsIn(tree).find(
    (one) => one.name === targetName || one.name.endsWith(`.${targetName}`),
  )
  if (local === undefined) throw new Error(`no declaration ${targetName} in ${targetFile}`)
  return traceReach(repo, candidates, refFor(targetFile, local))
}

interface Reached { name: string, via: "call" | "value", escape?: string }
const frontier = (node: DiagramNode): Reached[] =>
  node.callers
    .map((one) => ({
      name: one.escape ? `escape` : one.code.name,
      via: one.via ?? "call",
      ...(one.escape ? { escape: one.escape.reason } : {}),
    }))
    .sort((one, two) => one.name.localeCompare(two.name))

const invokes = (node: DiagramNode, name: string): DiagramNode | undefined =>
  [...node.callers]
    .reverse()
    .reduce<DiagramNode | undefined>((found, caller) => found ?? (caller.code.name === name ? caller : invokes(caller, name)), undefined)

const PRICING = "export function priceOf() { return 1 }"

describe("value-flow reach — follow patterns", () => {
  it("1. direct call: name() reaches the caller by a call edge", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          "import { priceOf } from \"./pricing\"",
          "export function checkout() { return priceOf() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "checkout", via: "call" }])
  })

  it("1b. a component rendered as JSX reaches the parent that renders it by a call edge", async () => {
    const tree = await trace(
      {
        "src/Modal.tsx": "export default function Modal({ open }) { return open ? <div /> : null }",
        "src/Card.tsx": "export function Card() { return <p /> }",
        "src/Page.tsx": [
          "import Modal from \"./Modal.tsx\"",
          "import { Card } from \"./Card\"",
          "export function Page({ open }) { return <>{open && <Modal open={open} />}<Card></Card></> }",
        ].join("\n"),
      },
      "src/Modal.tsx",
      "Modal",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Page", via: "call" }])
  })

  it("1c. a component rendered with children as JSX reaches its parent", async () => {
    const tree = await trace(
      {
        "src/Card.tsx": "export function Card({ children }) { return <p>{children}</p> }",
        "src/Page.tsx": ["import { Card } from \"./Card\"", "export function Page() { return <Card>text</Card> }"].join("\n"),
      },
      "src/Card.tsx",
      "Card",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Page", via: "call" }])
  })

  it("1d. a bound copy: fn.bind(...) carries the function, called or wired to a sink", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.tsx": [
          "import { priceOf } from \"./pricing\"",
          "const charge = priceOf.bind(null, 1)",
          "export function checkout() { return charge() }",
          "export function Buy({ id }) { return <form onSubmit={priceOf.bind(null, id)} /> }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([
      { name: "Buy", via: "value" },
      { name: "checkout", via: "call" },
    ])
  })

  it("3b. a value handed to a library hook escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Form.tsx": [
          "import { useCheckout } from \"checkout-kit\"",
          "import { priceOf } from \"./pricing\"",
          "export function Form() { const { execute } = useCheckout(priceOf); return null }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "escape", via: "value", escape: "library" }])
  })

  it("4c. a prop read off an undivided props parameter and called there", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Child } from \"./Child\"",
          "export function Parent() { return <Child submit={priceOf} /> }",
        ].join("\n"),
        "src/Child.tsx": "export function Child(props) { return <form onSubmit={() => props.submit()} /> }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Child", via: "value" }])
  })

  it("4f. a prop called in a named local handler reaches the handler, then its component, then the parent", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Page.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { BasketForm } from \"./BasketForm\"",
          "export function Page() { return <BasketForm onSubmitButtonClick={priceOf} /> }",
        ].join("\n"),
        "src/BasketForm.tsx": [
          "export function BasketForm(props) {",
          "  const onSubmit = () => {",
          "    if (formValid()) {",
          "      props.onSubmitButtonClick()",
          "    }",
          "  }",
          "  return <form onSubmit={onSubmit} />",
          "}",
          "function formValid() { return true }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "BasketForm.onSubmit", via: "value" }])
    const handler = invokes(tree, "BasketForm.onSubmit")
    expect(handler?.callers.map((one) => one.code.name)).toStrictEqual(["BasketForm"])
    expect(handler?.callers[0]?.callers.map((one) => one.code.name)).toStrictEqual(["Page"])
  })

  it("4g. a changed local handler reaches where it is wired, then climbs through its component", async () => {
    const files = {
      "src/Row.tsx": [
        "import { Toggle } from \"./Toggle\"",
        "export function Row() {",
        "  const selectAll = () => { return 1 }",
        "  const clear = () => { return 2 }",
        "  const log = () => { return 3 }",
        "  const ready = log !== undefined",
        "  return <><button onClick={selectAll} /><Toggle onFlip={clear} /></>",
        "}",
      ].join("\n"),
      "src/Toggle.tsx": "export function Toggle({ onFlip }) { return <input onChange={() => onFlip()} /> }",
      "src/Table.tsx": ["import { Row } from \"./Row\"", "export function Table() { return <Row /> }"].join("\n"),
    }
    const wired = await trace(files, "src/Row.tsx", "selectAll")
    expect(frontier(wired)).toStrictEqual([{ name: "Row", via: "value" }])
    expect(invokes(wired, "Row")?.callers.map((one) => one.code.name)).toStrictEqual(["Table"])
    expect(frontier(await trace(files, "src/Row.tsx", "clear"))).toStrictEqual([{ name: "Toggle", via: "value" }])
    expect(frontier(await trace(files, "src/Row.tsx", "log"))).toStrictEqual([{ name: "Row", via: "value" }])
  })

  it("4d. a prop taken apart from props in the body, renamed, and called", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Child } from \"./Child\"",
          "export function Parent() { return <Child submit={priceOf} /> }",
        ].join("\n"),
        "src/Child.tsx": "export function Child(props = {}) { const { submit: go } = props; go(); return null }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Child", via: "value" }])
  })

  it("4e. a prop into a component whose props cannot be followed escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Child } from \"./Child\"",
          "export function Parent() { return <Child submit={priceOf} /> }",
        ].join("\n"),
        "src/Child.tsx": "export function Child(...all) { all[0].submit(); return null }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "escape", via: "value", escape: "props" }])
  })

  it("2. local alias: const a = fn; a() reaches the caller", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/checkout.ts": [
          "import { priceOf } from \"./pricing\"",
          "const charge = priceOf",
          "export function checkout() { return charge() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "checkout", via: "call" }])
  })

  it("3. hook-wrapped callback called in the same component", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Form.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { useCheckout } from \"./useCheckout\"",
          "export function Form() {",
          "  const { state, callback } = useCheckout(priceOf)",
          "  return callback()",
          "}",
        ].join("\n"),
        "src/useCheckout.ts": "export function useCheckout(fn) { return { state: 1, callback: fn } }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Form", via: "value" }])
  })

  it("4. callback passed as a named prop into a child and called there", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Child } from \"./Child\"",
          "export function Parent() { return <Child submit={priceOf} /> }",
        ].join("\n"),
        "src/Child.tsx": [
          "export function Child({ submit }) { submit(); return null }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(invokes(tree, "Child")?.via).toBe("value")
  })

  it("4b. climbs from the child up through the render ancestor (JSX is a call)", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Child } from \"./Child\"",
          "export function Parent() { return <Child submit={priceOf} /> }",
        ].join("\n"),
        "src/Child.tsx": "export function Child({ submit }) { submit(); return null }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(invokes(tree, "Child")?.callers.map((one) => one.code.name)).toContain("Parent")
  })

  it("5. deep prop-drilling reaches the deepest child that fires it", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Mid } from \"./Mid\"",
          "export function Parent() { return <Mid submit={priceOf} /> }",
        ].join("\n"),
        "src/Mid.tsx": [
          "import { Leaf } from \"./Leaf\"",
          "export function Mid({ submit }) { return <Leaf submit={submit} /> }",
        ].join("\n"),
        "src/Leaf.tsx": "export function Leaf({ submit }) { submit(); return null }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(invokes(tree, "Leaf")?.via).toBe("value")
  })

  it("6. a function held in a literal collection, then invoked", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/run.ts": [
          "import { priceOf } from \"./pricing\"",
          "export function run() { const handlers = [priceOf]; return handlers[0]() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "run", via: "value" }])
  })

  it("7. a function returned from another and called by the caller", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/make.ts": [
          "import { priceOf } from \"./pricing\"",
          "export function make() { return priceOf }",
          "export function use() { return make()() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(invokes(tree, "use")?.via).toBe("value")
  })

  it("8. re-export barrel then called (a plain call edge)", async () => {
    const tree = await trace(
      {
        "lib/pricing.ts": PRICING,
        "lib/index.ts": "export { priceOf } from \"./pricing\"",
        "app.ts": ["import { priceOf } from \"./lib\"", "export function app() { return priceOf() }"].join(
          "\n",
        ),
      },
      "lib/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "app", via: "call" }])
  })

  it("9. default export imported and called (a plain call edge)", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": "export default function priceOf() { return 1 }",
        "src/app.ts": ["import priceOf from \"./pricing\"", "export function app() { return priceOf() }"].join(
          "\n",
        ),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "app", via: "call" }])
  })

  it("10. handler wired to a DOM sink (onClick)", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Button.tsx": [
          "import { priceOf } from \"./pricing\"",
          "export function Buy() { return <button onClick={priceOf} /> }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Buy", via: "value" }])
  })

  it("11. handler wired to a route registration", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/routes.ts": [
          "import { priceOf } from \"./pricing\"",
          "import { router } from \"./router\"",
          "export function routes() { router.post(\"/price\", priceOf) }",
        ].join("\n"),
        "src/router.ts": "export const router = { post(_p, _h) {} }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "routes", via: "value" }])
  })
})

describe("value-flow reach — escape boundaries", () => {
  it("12. spread props escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Parent.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { Child } from \"./Child\"",
          "export function Parent() { const props = { submit: priceOf }; return <Child {...props} /> }",
        ].join("\n"),
        "src/Child.tsx": "export function Child(props) { return null }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree).map((one) => one.escape)).toContain("spread")
  })

  it("13. a value put into a store escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/wire.ts": [
          "import { priceOf } from \"./pricing\"",
          "import { store } from \"./store\"",
          "export function wire() { store.set(\"charge\", priceOf) }",
        ].join("\n"),
        "src/store.ts": "export const store = { set(_k, _v) {} }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree).map((one) => one.escape)).toContain("store")
  })

  it("14. a value published on an event bus escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/wire.ts": [
          "import { priceOf } from \"./pricing\"",
          "import { bus } from \"./bus\"",
          "export function wire() { bus.on(\"charge\", priceOf) }",
        ].join("\n"),
        "src/bus.ts": "export const bus = { on(_e, _h) {} }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree).map((one) => one.escape)).toContain("event-bus")
  })

  it("15. dynamic dispatch on a computed key escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/run.ts": [
          "import { priceOf } from \"./pricing\"",
          "export function run(key) { const handlers = { charge: priceOf }; return handlers[key]() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree).map((one) => one.escape)).toContain("dynamic-dispatch")
  })

  it("16. an HOC wrapping escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/page.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import withAuth from \"hoc-lib\"",
          "const Wrapped = withAuth(priceOf)",
          "export function Page() { return <Wrapped /> }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree).map((one) => one.escape)).toContain("hoc")
  })

  it("17. a value handed to an un-indexed library escapes", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/run.ts": [
          "import { priceOf } from \"./pricing\"",
          "import debounce from \"lodash.debounce\"",
          "export function run() { const d = debounce(priceOf); return d() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree).map((one) => one.escape)).toContain("library")
  })
})

describe("value-flow reach — following the function, never data", () => {
  it("does not trace a hook's data binding used as data", async () => {
    const tree = await trace(
      {
        "src/pricing.ts": PRICING,
        "src/Form.tsx": [
          "import { priceOf } from \"./pricing\"",
          "import { useCheckout } from \"./useCheckout\"",
          "export function Form() {",
          "  const { state, callback } = useCheckout(priceOf)",
          "  return callback() + state",
          "}",
        ].join("\n"),
        "src/useCheckout.ts": "export function useCheckout(fn) { return { state: 1, callback: fn } }",
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(tree)).toStrictEqual([{ name: "Form", via: "value" }])
  })
})

describe("value-flow reach — a name means its variable", () => {
  it("does not follow a parameter or local that shares the target's name", async () => {
    const root = await trace(
      {
        "src/pricing.ts": "export function priceOf() { return 1 }",
        "src/checkout.ts": [
          "import { priceOf } from \"./pricing\"",
          "export function total() { return priceOf() }",
          "export function param(priceOf: () => number) { return priceOf() }",
          "export function local() { const priceOf = () => 2; return priceOf() }",
        ].join("\n"),
      },
      "src/pricing.ts",
      "priceOf",
    )
    expect(frontier(root)).toStrictEqual([{ name: "total", via: "call" }])
  })

  it("does not follow another method's parameter named like a method", async () => {
    const root = await trace(
      {
        "src/tree.ts": [
          "export class Tree {",
          "  get grouped(): boolean { return true }",
          "  setGrouped(grouped: boolean): void { store.update(\"k\", grouped) }",
          "}",
        ].join("\n"),
      },
      "src/tree.ts",
      "grouped",
    )
    expect(frontier(root)).toStrictEqual([])
  })

  it("follows a shorthand property into its collection", async () => {
    const root = await trace(
      {
        "src/actions.ts": "export function save() {}",
        "src/api.ts": ["import { save } from \"./actions\"", "const api = { save }", "export function submit() { api.save() }"].join("\n"),
      },
      "src/actions.ts",
      "save",
    )
    expect(frontier(root)).toStrictEqual([{ name: "submit", via: "value" }])
  })

  it("descends into the function a renamed import names", async () => {
    const root = await trace(
      {
        "src/actions.ts": "export function save() {}",
        "src/run.ts": "export function run(task: () => void) { task() }",
        "src/page.ts": ["import { save } from \"./actions\"", "import { run as go } from \"./run\"", "export function page() { go(save) }"].join("\n"),
      },
      "src/actions.ts",
      "save",
    )
    expect(frontier(root)).toStrictEqual([{ name: "run", via: "value" }])
  })

  it("descends into a parameter without parentheses and one with a default, not a rest or a pattern", async () => {
    const root = await trace(
      {
        "src/actions.ts": "export function save() {}",
        "src/each.ts": [
          "export const once = task => task()",
          "export function late(task = () => {}) { task() }",
          "export function all(...tasks) { tasks[0]() }",
          "export function first([task]) { task() }",
        ].join("\n"),
        "src/page.ts": [
          "import { save } from \"./actions\"",
          "import { once, late, all, first } from \"./each\"",
          "export function page() { once(save); late(save); all(save); first(save) }",
        ].join("\n"),
      },
      "src/actions.ts",
      "save",
    )
    expect(frontier(root)).toStrictEqual([
      { name: "late", via: "value" },
      { name: "once", via: "value" },
    ])
  })

  it("follows a prop into the component's own parameter only", async () => {
    const root = await trace(
      {
        "src/page.tsx": ["import { Child } from \"./child\"", "export function act() {}", "export function Page() { return <Child onAdd={act} /> }"].join("\n"),
        "src/child.tsx": [
          "export function Child({ onAdd }: { onAdd: () => void }) { return <button onClick={onAdd} /> }",
          "export function Other({ onAdd }: { onAdd: () => void }) { return <a onClick={onAdd} /> }",
        ].join("\n"),
      },
      "src/page.tsx",
      "act",
    )
    expect(frontier(root)).toStrictEqual([{ name: "Child", via: "value" }])
  })

  it("descends into a nested local function instead of escaping", async () => {
    const root = await trace(
      {
        "src/actions.ts": "export function save() {}",
        "src/page.ts": [
          "import { save } from \"./actions\"",
          "export function page() {",
          "  function run(task: () => void) { task() }",
          "  run(save)",
          "}",
        ].join("\n"),
      },
      "src/actions.ts",
      "save",
    )
    expect(frontier(root)).toStrictEqual([{ name: "page.run", via: "value" }])
    expect(invokes(root, "page.run")?.callers.map((one) => one.code.name)).toStrictEqual(["page"])
  })
})
