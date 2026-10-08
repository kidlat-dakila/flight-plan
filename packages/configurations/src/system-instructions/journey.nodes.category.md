The node's visual category. It picks a colour and a word on the node, so it
names the kind a reviewer would want to see at a glance, not the most
technically precise one. Flight Plan sets it; change it only where it is wrong.
You cannot write `ui` or `event`, and you cannot replace them: Flight Plan reads
both from the code, and `update-nodes` refuses the call. One of:

| Category | Code |
|---|---|
| `guard` | A validator, gate, permission check or schema check: code whose job is to refuse. Usually the most review-relevant node on the diagram. |
| `logic` | A function or method that transforms. The default when no other category fits. |
| `data` | A query, repository, migration or cache access. |
| `type` | An interface, type alias, schema or enum. Shape rather than behaviour. |
| `ui` | A JSX component, and nothing else. Set by Flight Plan on every component. |
| `event` | The handler of a user action, such as `CartPage.handleCheckout` or `OrderStatusFilter.onClick`. Set by Flight Plan on every handler node. |
| `config` | A constant, flag, environment setting or build setting. |
