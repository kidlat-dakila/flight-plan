export interface Keyed<Item> {
  readonly key: string
  readonly item: Item
}

export const keyed = <Item>(items: readonly Item[]): Keyed<Item>[] =>
  items.map((item, position) => ({ key: String(position), item }))
