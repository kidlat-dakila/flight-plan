The journey that reaches this node, in drawn order: "{who} {action}: {caller}
{calls, renders or reads} this {what}." Start with what starts the path, name
each step between, end on what hands over to it.

`Shopper opens /orders: <OrdersPage /> calls useOrders(status). useOrders() passes this function to useQuery as query function.`

- **Several paths**: one line saying so, then list, one such fragment per path.
- **Node with trigger labels**: what each event runs and what each fetch feeds,
  in the words of its trigger label: `Shopper clicks "All": handler calls setStatus(null) on filter store.`
- **Nothing reaches it yet**: say no code uses it, and what is meant to.

Do not describe the change here: the waypoint does. Do not restate label or
identifier. Link a step to its code where a reader would open it.
