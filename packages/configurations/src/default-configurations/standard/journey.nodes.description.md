Tell the journey that reaches this node, in the order the diagram draws it: "When {who} {action}, {caller} {calls, renders or reads} this {what}." Start with what starts the path, then name each step between it and this node, and end on what hands over to it: `When a shopper opens /orders, <OrdersPage /> calls useOrders(status), and useOrders() hands this function to useQuery as its query function.`

- **Several paths.** A node that more than one path reaches opens with one line that says so, then a list with one such sentence per path.
- **A node with trigger labels.** Say what each event runs and what each fetch feeds, in the words of its trigger label: `When a shopper clicks "All", the handler calls setStatus(null) on the filter store.`
- **Nothing reaches it yet.** Say that no code uses it, and what is meant to.

Do not describe the change here. The waypoint of the code says what changed, and the side panel shows that waypoint above the code. Do not restate the label or the identifier, which the node already shows. Link a step to its code where a reader would want to open it.
