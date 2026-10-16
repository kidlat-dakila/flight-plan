import { codeOf, groupOf, outlineOf } from "@/code-blocks/__tests__/group-fixture"

const outlineOfCode = (...lines: readonly string[]): string[] => outlineOf(groupOf({ "src/file.tsx": codeOf(...lines) }), "src/file.tsx")

describe("the markup of a JSX file", () => {
  it("makes a render-root of the markup a function returns, one per return statement", () => {
    expect(outlineOfCode("function Users({ isEmpty }) {", "  if (isEmpty) return <Empty />", "  return <List />", "}")).toStrictEqual([
      "component Users 1:1-4:2",
      "  root-argument-value isEmpty 1:18-1:25",
      "  condition 2:3-2:32",
      "    render-root 2:16-2:32",
      "      render Empty 2:23-2:32",
      "  render-root 3:3-3:18",
      "    render List 3:10-3:18",
    ])
  })

  it("makes a render-root of markup that is the body of an arrow function", () => {
    expect(outlineOfCode("const Home = () => <List />", "const Page = () => (", "  <List />", ")")).toStrictEqual([
      "component Home 1:1-1:28",
      "  render-root 1:20-1:28",
      "    render List 1:20-1:28",
      "component Page 2:1-4:2",
      "  render-root 2:20-4:2",
      "    render List 3:3-3:11",
    ])
  })

  it("makes a render of every element, named after the element, one inside the other", () => {
    expect(outlineOfCode("const Home = () => <Layout.Main><>{<b>hi</b>}</></Layout.Main>")).toStrictEqual([
      "component Home 1:1-1:63",
      "  render-root 1:20-1:63",
      "    render Layout.Main 1:20-1:63",
      "      render 1:33-1:49",
      "        render b 1:36-1:45",
    ])
  })

  it("makes a render-condition of markup rendered under a condition", () => {
    expect(outlineOfCode("const Home = ({ isEmpty }) => <div>{isEmpty && <Empty />}{isEmpty ? <Empty /> : null}</div>").slice(2)).toStrictEqual([
      "  render-root 1:31-1:92",
      "    render div 1:31-1:92",
      "      render-condition 1:37-1:57",
      "        render Empty 1:48-1:57",
      "      render-condition 1:59-1:85",
      "        render Empty 1:69-1:78",
    ])
  })

  it("makes a render-loop of markup rendered once per item, and no render-root of the function it is handed", () => {
    expect(outlineOfCode("const Home = ({ items }) => <ul>{items.map((item) => <Row />)}</ul>").slice(2)).toStrictEqual([
      "  render-root 1:29-1:68",
      "    render ul 1:29-1:68",
      "      render-loop 1:34-1:62",
      "        function 1:44-1:61",
      "          variable item 1:45-1:49",
      "          render Row 1:54-1:61",
    ])
  })

  it("makes a render-event of an attribute whose name starts with on and a capital letter, with the function written in place inside it", () => {
    expect(outlineOfCode("const Home = () => <button onClick={() => save()} one=\"1\" disabled={isBusy ? true : false} />")).toStrictEqual([
      "component Home 1:1-1:94",
      "  render-root 1:20-1:94",
      "    render button 1:20-1:94",
      "      render-event onClick 1:28-1:50",
      "        function 1:37-1:49",
      "      condition 1:69-1:90",
    ])
  })

  it("makes a render-root of a returned condition or loop of markup", () => {
    expect(outlineOfCode("function Users({ items }) {", "  return items.length > 0 ? items.map((item) => <Row />) : null", "}").slice(2)).toStrictEqual([
      "  render-root 2:3-2:64",
      "    render-condition 2:10-2:64",
      "      render-loop 2:29-2:57",
      "        function 2:39-2:56",
      "          variable item 2:40-2:44",
      "          render Row 2:49-2:56",
    ])
  })

  it("makes no render-root of a function that returns no markup, or of one at the root of a file", () => {
    expect(outlineOfCode("const priceOf = (item) => item.price")).toStrictEqual([
      "function priceOf 1:1-1:37",
      "  root-argument-value item 1:18-1:22",
      "    root-argument-value price 1:27-1:37",
    ])
  })

  it("makes a component of a variable that holds markup, at the root of a file and inside a function, with the markup as its render-root", () => {
    expect(outlineOfCode("const emptyState = <Empty />", "const Cart = () => {", "  const heading = <h1>Cart</h1>", "  return <section>{heading}</section>", "}")).toStrictEqual([
      "component emptyState 1:1-1:29",
      "  render-root 1:20-1:29",
      "    render Empty 1:20-1:29",
      "component Cart 2:1-5:2",
      "  component heading 3:3-3:32",
      "    render-root 3:19-3:32",
      "      render h1 3:19-3:32",
      "  render-root 4:3-4:38",
      "    render section 4:10-4:38",
    ])
  })

  it("makes a component of a function that returns markup inside another function, and of one handed to a call", () => {
    expect(outlineOfCode("const Cart = () => {", "  const renderLine = (line) => <Line />", "  return <ul />", "}", "const Button = memo(() => <button />)").filter((line) => line.includes("component"))).toStrictEqual([
      "component Cart 1:1-4:2",
      "  component renderLine 2:3-2:40",
      "      component 5:21-5:37",
    ])
  })

  it("keeps a hook that returns markup a hook, and a function written in markup or one that only calls another a function", () => {
    const outline = outlineOfCode("const useList = () => <List />", "const Cart = () => renderLines()", "const Lines = ({ lines }) => <ul>{lines.map((line) => <Line />)}</ul>")

    expect(outline.filter((line) => /^\s*(hook|function|component)/.test(line))).toStrictEqual(["hook useList 1:1-1:31", "function Cart 2:1-2:33", "component Lines 3:1-3:70", "        function 3:45-3:63"])
  })
})

describe("a class component", () => {
  it("makes a component of a class that extends another and renders markup, and keeps a class with no rendering method a class", () => {
    const outline = outlineOfCode(
      "export class Modal extends React.Component {",
      "  render() { return <div /> }",
      "}",
      "export class Store extends Base {",
      "  render() { return \"text\" }",
      "}",
      "export class Lone {",
      "  render() { return <div /> }",
      "}",
    )

    expect(outline.filter((line) => !line.startsWith(" "))).toStrictEqual(["component Modal 1:1-3:2", "class Store 4:1-6:2", "class Lone 7:1-9:2"])
  })
})
