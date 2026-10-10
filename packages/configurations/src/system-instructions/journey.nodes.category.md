The node's visual category. It picks a colour and a word on the node, so it
names the kind a reviewer would want to see at a glance, not the most
technically precise one. Flight Plan sets it; change it only where it is wrong.
You cannot write `ui`, `event` or `effect`, and you cannot replace them: Flight
Plan reads them from the code, and `update-nodes` refuses the call. One of:

| Category | Code |
|---|---|
| `guard` | A validator, gate, permission check or schema check: code whose job is to refuse. Usually the most review-relevant node on the diagram. |
| `logic` | A function or method that transforms. The default when no other category fits. |
| `data` | A query, repository, migration or cache access. |
| `type` | An interface, type alias, schema or enum. Shape rather than behaviour. |
| `ui` | A JSX component, and nothing else. Set by Flight Plan on every component. |
| `event` | The handler of a user action, such as `CartPage.handleCheckout` or `OrderStatusFilter.onClick`, or a callback a library runs on an event, such as `ProfileForm.onSuccess`. Set by Flight Plan on every handler node. |
| `effect` | An effect of a component, such as `ThemeProvider.useEffect`. Set by Flight Plan on the node of every effect that starts a path. |
| `config` | A constant, flag, environment setting or build setting. |
