const POKE_DOLLAR = "₽"

const priceFormatter = new Intl.NumberFormat("en-US")

export function formatPrice(price: number): string {
  return `${POKE_DOLLAR}${priceFormatter.format(price)}`
}
