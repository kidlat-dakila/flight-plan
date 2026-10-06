const CENTS_PER_UNIT = 100

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function formatPrice(priceCents: number): string {
  return priceFormatter.format(Math.floor(priceCents) / CENTS_PER_UNIT)
}

export function formatQuantity(quantity: number): string {
  return quantity === 1 ? "1 item" : `${quantity} items`
}
