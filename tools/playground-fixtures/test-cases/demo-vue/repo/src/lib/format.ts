const CENTS_PER_UNIT = 100

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export const formatPrice = (priceCents: number): string => priceFormatter.format(priceCents / CENTS_PER_UNIT)
