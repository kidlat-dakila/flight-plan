export class Memo<Key, Stored> {
  private entries = new Map<Key, Stored>()

  public readonly find = (key: Key): Stored | undefined => this.entries.get(key)

  public readonly has = (key: Key): boolean => this.entries.has(key)

  public readonly store = (key: Key, stored: Stored): Stored => {
    // eslint-disable-next-line functional/immutable-data -- one private map keeps each store constant time; copying the map per store made every memo quadratic
    this.entries.set(key, stored)
    return stored
  }

  public readonly remember = (key: Key, make: () => Stored): Stored => {
    return this.entries.get(key) ?? this.store(key, make())
  }

  public readonly values = (): Stored[] => [...this.entries.values()]

  public readonly clear = (): void => {
    this.entries = new Map()
  }
}

const ONLY = "only"

export const once = <Made>(make: () => Made): (() => Made) => {
  const memo = new Memo<typeof ONLY, Made>()
  return () => memo.remember(ONLY, make)
}
