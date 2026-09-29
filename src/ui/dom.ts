/**
 * Cross-window DOM helpers.
 *
 * A bare `instanceof HTMLElement` is false for an element belonging to another
 * window, and false in tests whose DOM comes from a different realm, so the
 * check goes through the node's own window.
 */

export function isHtmlElement(node: Node | null): node is HTMLElement {
  if (node === null) return false
  const view = node.ownerDocument?.defaultView
  return view ? node instanceof view.HTMLElement : node instanceof HTMLElement
}
