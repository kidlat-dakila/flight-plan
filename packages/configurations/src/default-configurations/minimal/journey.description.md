The diagram as text: what a reader knows after following every line of it. Three
fragments at most. Fewer for a small diagram.

- **Start where paths start.** What sets each path off, reader's terms: "Shopper
  places order", "Nightly job runs".
- **Follow each path in drawn order**, left to the changed code. Name steps by
  what they do: `<Checkout />` calls `placeOrder()`, asks `stockOf()` per cart
  line.
- **Say where paths reach the change.** Name the nodes the change touched and
  how the path arrives. Do not explain the change.
- **Several paths**: how many, where they meet, one fragment each. Paths that
  run alike: tell together.

Whole diagram, not one path. No "This diagram shows". Do not count nodes.

`Shopper places order: <Checkout /> calls placeOrder(), asks stockOf() per cart line before charge. Stock badge reaches stockOf() through useStockLevel(). Both end at stockOf(), now subtracts held units.`
