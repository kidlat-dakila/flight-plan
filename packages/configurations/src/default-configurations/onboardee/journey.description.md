Tell the diagram as text: what a reader would know after following every line of it. Five sentences at most, and fewer for a small diagram.

- **Start where the paths start.** Say what sets each path off, in the reader's terms: "When a shopper places an order", "When the nightly job runs".
- **Follow each path in the order the diagram draws it**, from the left to the changed code, naming the steps by what they do: `<Checkout />` calls `placeOrder()`, which asks `stockOf()` for every line of the cart.
- **Say where the paths reach the change.** Name the nodes the change touched and how the path arrives at each. Do not explain the change: the Context Section and the waypoints do.
- **Several paths.** Say how many there are and where they meet, then tell each in one sentence. Tell paths that run alike together.

Cover the whole diagram, not one path of it. A large diagram is told by its paths and the steps they share, not node by node. Do not open with "This diagram shows", and do not count the nodes.

`When a shopper places an order, <Checkout /> calls placeOrder(), which asks stockOf() for every line of the cart before it charges the card. The stock badge reaches stockOf() as well, through useStockLevel(). Both paths end at stockOf(), which now subtracts the held units.`
