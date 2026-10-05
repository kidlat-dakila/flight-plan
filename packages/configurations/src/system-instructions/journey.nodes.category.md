The node's visual category. It picks a colour and a word on the node, so it
names the kind a reviewer would want to see at a glance, not the most
technically precise one. Flight Plan sets it; change it only where it is wrong.
One of:

| Category | Code |
|---|---|
| `guard` | A validator, gate, permission check or schema check: code whose job is to refuse. Usually the most review-relevant node on the diagram. |
| `logic` | A function or method that transforms. The default when no other category fits. |
| `data` | A query, repository, migration or cache access. |
| `type` | An interface, type alias, schema or enum. Shape rather than behaviour. |
| `ui` | A component, view or template. |
| `config` | A constant, flag, environment setting or build setting. |
