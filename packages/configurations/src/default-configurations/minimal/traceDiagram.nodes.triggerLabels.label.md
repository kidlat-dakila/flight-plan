What happens at this place, as a reader of the product: "Shopper clicks Remove",
"Account orders loaded". Read the node's code first: label names the element the
user acts on, or the data fetched.

- **Event**: who acts, the action, what it is on: `Shopper clicks "All"`. No
  component name, no handler name.
- **Data fetch**: what is loaded, not how: `Product stock loaded`, not
  `useQuery runs`.

Same shape and tense on every trigger label of one diagram.
