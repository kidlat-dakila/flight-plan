const POKE_DOLLAR = "₽"

const priceFormatter = new Intl.NumberFormat("en-US")

export const formatPrice = (price: number): string => `${POKE_DOLLAR}${priceFormatter.format(price)}`
