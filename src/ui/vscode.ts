/**
 * The VS Code components this project uses, and only those.
 *
 * Imported from their individual files rather than from
 * `@vscode-elements/react-elements`, which is a barrel of all thirty-odd. That
 * barrel cannot be tree-shaken: every element self-registers with
 * `customElement(...)` at module scope, so a bundler has to keep them all in
 * case the registration matters. Importing `{ VscodeButton }` from it pulled in
 * the tree view, the table, the context menu and the split layout — 390 KB of
 * components nothing renders.
 *
 * Each wrapper imports its own element, and the element registers itself, so
 * importing from here is all the setup a component needs. There is no separate
 * registration step.
 *
 * The codicon font is the one thing not handled here: `vscode-icon` needs a
 * `<link id="vscode-codicon-stylesheet">` on the page, which each panel's HTML
 * provides. See `codiconLink` in `src/vscode/panel.ts`.
 *
 * Shared by the walkthrough and the setup panel, so one list and one
 * explanation serve both.
 */

export { default as VscodeBadge } from "@vscode-elements/react-elements/dist/components/VscodeBadge.js"
export { default as VscodeButton } from "@vscode-elements/react-elements/dist/components/VscodeButton.js"
export { default as VscodeDivider } from "@vscode-elements/react-elements/dist/components/VscodeDivider.js"
export { default as VscodeIcon } from "@vscode-elements/react-elements/dist/components/VscodeIcon.js"
export { default as VscodeTabHeader } from "@vscode-elements/react-elements/dist/components/VscodeTabHeader.js"
export { default as VscodeTabPanel } from "@vscode-elements/react-elements/dist/components/VscodeTabPanel.js"
export { default as VscodeTabs } from "@vscode-elements/react-elements/dist/components/VscodeTabs.js"
