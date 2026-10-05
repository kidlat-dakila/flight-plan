import { JSX_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { outlineIn } = JSX_READING

describe("JSXASTGraphFile root encapsulations", () => {
  it("lists components, with the handlers declared in them", () => {
    const source = sourceOf(
      "export function Editor({ onSave }) {",
      "  const handleSave = () => {",
      "    onSave()",
      "  }",
      "  return (",
      "    <form onSubmit={handleSave}>",
      "      <button onClick={() => onSave()}>Save</button>",
      "    </form>",
      "  )",
      "}",
      "export const Page = () => <Editor onSave={save} />",
      "export default memo(Page)",
    )

    expect(outlineIn(source)).toStrictEqual([
      "function Editor 1-10",
      "  function handleSave 2-4",
      "function Page 11-11",
      "variable default 12-12",
    ])
  })

  it("leaves out the members of an object that is handed to an element", () => {
    const source = sourceOf(
      "export function Report() {",
      "  return <Table columns={{ render: () => null, sort(first, second) { return 0 } }} />",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual(["function Report 1-3"])
  })

  it("lists a class component with its methods", () => {
    const source = sourceOf(
      "export class Editor extends Component {",
      "  handleSave = () => {}",
      "  render() {",
      "    return <button onClick={this.handleSave} />",
      "  }",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual(["class Editor 1-6", "  method handleSave 2-2", "  method render 3-5"])
  })
})
