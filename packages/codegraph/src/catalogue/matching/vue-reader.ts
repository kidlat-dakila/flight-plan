import { parseWithGrammar, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { readJavascriptSyntax } from "./javascript-reader"
import type { ImportBinding, PassedValue, Site, SyntaxReader } from "./syntax-reader"

const GRAMMAR: GrammarId = "html"
const SCRIPT_TYPE = "script_element"
const SCRIPT_TEXT_TYPE = "raw_text"
const ELEMENT_TYPE = "element"
const TAG_TYPES: ReadonlySet<string> = new Set(["start_tag", "self_closing_tag"])
const TAG_NAME_TYPE = "tag_name"
const ATTRIBUTE_TYPE = "attribute"
const ATTRIBUTE_NAME_TYPE = "attribute_name"
const ATTRIBUTE_VALUE_TYPE = "attribute_value"
const QUOTED_VALUE_TYPE = "quoted_attribute_value"
const BOUND_PREFIXES: readonly string[] = ["v-bind:", ":"]
const LISTENING_PREFIXES: readonly string[] = ["v-on:", "@"]
const DIRECTIVE_PREFIX = "v-"
const LISTENER_NAME_START = "on"
const LINE_BREAK = "\n"
const BLANK = " "
const WORD_SEPARATOR = "-"
const EXPORT_TYPE = "export_statement"
const DEFAULT_KEYWORD = "default"
const OPTIONS_TYPE = "object"
const COMPONENT_OPTIONS: ImportBinding = { kind: "import", specifier: "vue", importedName: "defineComponent" }
const SINGLE_FILE_PATTERN = /^\s*<(script|template)\b/
const SCRIPT_PATTERN = patternOfTypes([SCRIPT_TYPE])
const ELEMENT_PATTERN = patternOfTypes([ELEMENT_TYPE])

export const isSingleFileComponent = (text: string): boolean => SINGLE_FILE_PATTERN.test(text)

const blanked = (text: string): string =>
  text
    .split(LINE_BREAK)
    .map((line) => BLANK.repeat(line.length))
    .join(LINE_BREAK)

const scriptTextOf = (source: string, tree: SyntaxTree): string => {
  const scripts = nodesMatching(GRAMMAR, tree, SCRIPT_PATTERN).flatMap((script) => script.namedChildren.filter((child) => child.type === SCRIPT_TEXT_TYPE))
  return scripts.reduce((text, script) => `${text.slice(0, script.startIndex)}${script.text}${text.slice(script.endIndex)}`, blanked(source))
}

const capitalised = (word: string): string => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`

const componentNameOf = (tagName: string): string => tagName.split(WORD_SEPARATOR).map(capitalised).join("")

const tagOf = (element: SyntaxNode): SyntaxNode | null => element.namedChildren.find((child) => TAG_TYPES.has(child.type)) ?? null

const siteOf = (element: SyntaxNode): Site[] => {
  const tagName = tagOf(element)?.namedChildren.find((child) => child.type === TAG_NAME_TYPE) ?? null
  return tagName === null ? [] : [{ kind: "element", node: element, callee: tagName }]
}

const withoutPrefix = (name: string, prefixes: readonly string[]): string | null => {
  const prefix = prefixes.find((candidate) => name.startsWith(candidate))
  return prefix === undefined ? null : name.slice(prefix.length)
}

const passedNameOf = (written: string): string => {
  const listened = withoutPrefix(written, LISTENING_PREFIXES)
  if (listened !== null) return `${LISTENER_NAME_START}${componentNameOf(listened)}`
  return withoutPrefix(written, BOUND_PREFIXES) ?? written
}

const valueOf = (attribute: SyntaxNode): SyntaxNode | null => {
  const written = attribute.namedChildren.find((child) => child.type === QUOTED_VALUE_TYPE || child.type === ATTRIBUTE_VALUE_TYPE) ?? null
  return written?.type === QUOTED_VALUE_TYPE ? (written.firstNamedChild ?? written) : written
}

const attributeOf = (attribute: SyntaxNode): PassedValue[] => {
  const name = attribute.namedChildren.find((child) => child.type === ATTRIBUTE_NAME_TYPE) ?? null
  const value = valueOf(attribute)
  return name === null || value === null ? [] : [{ position: null, name: passedNameOf(name.text), node: value }]
}

const attributesOf = (element: SyntaxNode): PassedValue[] =>
  (tagOf(element)?.namedChildren ?? []).filter((child) => child.type === ATTRIBUTE_TYPE).flatMap(attributeOf)

const isWrittenOut = (value: SyntaxNode): boolean => {
  const attribute = value.parent?.type === QUOTED_VALUE_TYPE ? value.parent.parent : value.parent
  const name = attribute?.namedChildren.find((child) => child.type === ATTRIBUTE_NAME_TYPE)?.text ?? ""
  return ![...BOUND_PREFIXES, ...LISTENING_PREFIXES, DIRECTIVE_PREFIX].some((prefix) => name.startsWith(prefix))
}

const optionsOf = (script: SyntaxReader): SyntaxNode[] =>
  script.tree.rootNode.namedChildren.flatMap((statement) => {
    const exported = statement.type === EXPORT_TYPE && statement.children.some((child) => child.type === DEFAULT_KEYWORD) ? statement.childForFieldName("value") : null
    return exported?.type === OPTIONS_TYPE ? [exported] : []
  })

export const readVue = (source: string): SyntaxReader => {
  const tree = parseWithGrammar(GRAMMAR, source)
  const { reader: script, importNamed } = readJavascriptSyntax(scriptTextOf(source, tree))
  const isMarkup = (node: SyntaxNode): boolean => node.tree === tree
  const options = optionsOf(script)
  const isOptions = (node: SyntaxNode): boolean => options.some((written) => written.id === node.id)
  const isName = (node: SyntaxNode): boolean => isMarkup(node) || isOptions(node)
  return {
    ...script,
    expressionOf: (node) => (isName(node) ? { kind: "name", name: node } : script.expressionOf(node)),
    bindingOf: (name) => {
      if (isOptions(name)) return COMPONENT_OPTIONS
      return isMarkup(name) ? (importNamed(name.text) ?? importNamed(componentNameOf(name.text))) : script.bindingOf(name)
    },
    listSites: () => [
      ...script.listSites(),
      ...options.map((written): Site => ({ kind: "call", node: written, callee: written })),
      ...nodesMatching(GRAMMAR, tree, ELEMENT_PATTERN).flatMap(siteOf),
    ],
    passedTo: (site) => {
      if (isOptions(site)) return [{ position: 0, name: null, node: site }]
      return isMarkup(site) ? attributesOf(site) : script.passedTo(site)
    },
    propertiesOf: (value) => (isMarkup(value) ? null : script.propertiesOf(value)),
    itemsOf: (value) => (isMarkup(value) ? null : script.itemsOf(value)),
    textOf: (value) => {
      if (!isMarkup(value)) return script.textOf(value)
      return isWrittenOut(value) ? value.text : null
    },
    isFunction: (value) => !isMarkup(value) && script.isFunction(value),
  }
}
