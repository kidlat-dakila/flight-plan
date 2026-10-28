const POKE_DOLLAR = "₽"

const PRICES: Record<string, number> = {
  "poke-ball": 200,
  potion: 300,
}

export function priceOf(item: string): string {
  return `${POKE_DOLLAR}${PRICES[item] ?? 0}`
}
