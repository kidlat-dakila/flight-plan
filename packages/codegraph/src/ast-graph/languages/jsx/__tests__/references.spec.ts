import { JSX_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { usesIn } = JSX_READING

describe("JSXASTGraphFile traceUsage", () => {
  it.each([
    ["an element without children", ["function Editor() {}", "const page = <Editor />"], "Editor", ["const page = <«Editor» />"]],
    [
      "an element with children, once, at its opening tag",
      ["function Editor() {}", "const page = <Editor>text</Editor>"],
      "Editor",
      ["const page = <«Editor»>text</Editor>"],
    ],
    [
      "the object of a member element",
      ["const Form = {}", "const page = <Form.Field><Form.Label /></Form.Field>"],
      "Form",
      ["const page = <«Form».Field><«Form».Label /></Form.Field>"],
    ],
    ["the object of a member element in lower case", ["const motion = {}", "const page = <motion.div />"], "motion", ["const page = <«motion».div />"]],
    ["the value of an attribute", ["const save = () => {}", "const page = <button onClick={save} />"], "save", ["const page = <button onClick={«save»} />"]],
    [
      "a handler written in an attribute",
      ["const save = () => {}", "const page = <button onClick={() => save()} />"],
      "save",
      ["const page = <button onClick={() => «save»()} />"],
    ],
    ["a spread of attributes", ["const props = {}", "const page = <Editor {...props} />"], "props", ["const page = <Editor {...«props»} />"]],
    ["an expression among the children", ["const total = 1", "const page = <p>{total}</p>"], "total", ["const page = <p>{«total»}</p>"]],
    ["an expression in a fragment", ["const total = 1", "const page = <>{total}</>"], "total", ["const page = <>{«total»}</>"]],
    [
      "a list rendered from it",
      ["const lines = []", "const page = <ul>{lines.map((line) => <li key={line.id} />)}</ul>"],
      "lines",
      ["const page = <ul>{«lines».map((line) => <li key={line.id} />)}</ul>"],
    ],
    [
      "the parameter of a callback that renders",
      ["const page = <ul>{lines.map((line) => <li key={line.id}>{line.name}</li>)}</ul>"],
      "line",
      ["const page = <ul>{lines.map((line) => <li key={«line».id}>{«line».name}</li>)}</ul>"],
    ],
    [
      "an element and a component handed over as attributes",
      ["function Icon() {}", "const page = <Button icon={<Icon />} as={Icon} />"],
      "Icon",
      ["const page = <Button icon={<«Icon» />} as={«Icon»} />"],
    ],
    ["a type argument of an element", ["interface Line {}", "const page = <List<Line> />"], "Line", ["const page = <List<«Line»> />"]],
    ["a condition around an element", ["const isOpen = true", "const page = isOpen && <Editor />"], "isOpen", ["const page = «isOpen» && <Editor />"]],
  ])("finds a use in %s", (_form, lines, name, uses) => {
    expect(usesIn(sourceOf(...lines), name)).toStrictEqual(uses)
  })

  it.each([
    ["a built-in element of that name", ["const div = 1", "const page = <div></div>"], "div"],
    ["a built-in element without children", ["const input = 1", "const page = <input />"], "input"],
    ["a custom element of that name", ["const card = 1", "const page = <card />"], "card"],
    ["the name of an attribute", ["const className = 1", "const page = <p className=\"total\" />"], "className"],
    ["the property of a member element", ["const Field = 1", "const page = <Form.Field />"], "Field"],
    ["the namespace of an element", ["const svg = 1", "const page = <svg:rect />"], "svg"],
    ["the name of an element in a namespace", ["const rect = 1", "const page = <svg:rect />"], "rect"],
    ["the text of an element", ["const total = 1", "const page = <p>total</p>"], "total"],
  ])("does not count %s as a use", (_form, lines, name) => {
    expect(usesIn(sourceOf(...lines), name)).toStrictEqual([])
  })
})
