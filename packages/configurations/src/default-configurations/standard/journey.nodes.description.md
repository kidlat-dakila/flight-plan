Tell the journey that reaches this node from its Entry Point, in the order the diagram draws it: "When {who} {action}, {caller} {calls, renders or reads} this {what}." Start with the trigger, as the Entry Point Node names it, then name each step between the trigger and this node, and end on what hands over to it: `When a shopper opens /orders, <OrdersPage /> calls useOrders(status), and useOrders() hands this function to useQuery as its query function.`

- **Several Entry Points.** A node that more than one Entry Point reaches opens with one line that says so, then a list with one such sentence per Entry Point.
- **A handler.** Say who acts, on which element, and what the handler then runs: `When a shopper clicks "All", this onClick runs and calls setStatus(null) on the filter store.`
- **A return of a component.** Say the journey to the component, then the condition this return is taken under: `When a shopper opens /orders and the orders are still loading, <OrdersPage /> returns here.`
- **Nothing reaches it yet.** Say that no code uses it, and what is meant to.

Do not describe the change here. The waypoint of the code says what changed, and the side panel shows that waypoint above the code. Do not restate the label or the identifier, which the card already shows. Link a step to its code where a reader would want to open it.
