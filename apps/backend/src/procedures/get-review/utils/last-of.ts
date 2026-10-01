export const lastOf = <Item>(items: readonly Item[]): Item | undefined =>
  items.find((_item, index) => index === items.length - 1)

export const firstOf = <Item>(items: readonly Item[]): Item | undefined =>
  items.find((_item, index) => index === 0)
