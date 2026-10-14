const CENTS_PER_UNIT = 100

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function formatPrice(priceCents: number): string {
  return priceFormatter.format(priceCents / CENTS_PER_UNIT)
}
