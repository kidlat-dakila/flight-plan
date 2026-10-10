const CENTS_PER_UNIT = 100

export const formatPrice = (cents: number): string => {
  const units = Math.floor(cents / CENTS_PER_UNIT)
  return `$${units}.${String(cents % CENTS_PER_UNIT).padStart(2, "0")}`
}

export const formatQuantity = (quantity: number): string => {
  return quantity === 1 ? "1 item" : `${quantity} items`
}

export const formatSku = (productId: string): string => {
  return productId.toUpperCase()
}
