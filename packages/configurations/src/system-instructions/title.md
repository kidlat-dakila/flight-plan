The segment's title: a few words that say what the segment changes. One string,
with no code link and no full stop. It names what changed and leaves why to the
`context`.

A segment arrives with no title. Write it with `update-nodes { segmentId, title }`,
after the context, and a finished artifact has one on every segment. When the
reviewer turned segments off, no segment is shown, and none needs a title.

The review page shows it as the segment's heading when a change is split into
several segments, and the section rail lists the segment under it.

## A segment the other segments build on

A segment is groundwork when code in the other segments of the change imports its
files: the review shows it first because they use it. Its blast and the imports
of the other segments' files show what uses it. Title it after that code, not
after its own changes, and write names as the code writes them:

- One or two users: their names. `Groundwork for CreateOrderPage and EditOrderPage`
- More than two of one kind: the kind in the plural, with `new` when all of them
  are new. `Groundwork for the new pages`, `Groundwork for the cart components`
- More than two of different kinds: both kinds. `Groundwork for the new pages and components`

## Any other segment

Say what the segment adds, then what it modifies, then what it removes, as
`New …`, `modified …` and `removed …` joined by commas. Only the first part
starts with a capital letter, and a part with nothing in it is left out.

- One thing of a kind: its name as the code writes it, followed by its kind when
  the name does not already say it. `New EditOrderPage`, `Modified CartSummary component`
- Two things: both names. `New PromoForm and useApplyPromo, modified CartSummary`
- More than two of one kind: the kind in the plural. `New pages, modified components`

| The segment | Its title |
|---|---|
| Adds one page | `New EditOrderPage` |
| Adds a component and a hook, and changes a component | `New PromoForm and useApplyPromo, modified CartSummary` |
| Adds three pages and changes two components | `New pages, modified components` |
| Deletes a component and changes the one that showed it | `Modified CartSummary, removed Dialog component` |
