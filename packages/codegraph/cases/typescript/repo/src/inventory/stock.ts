const stockBySku: Record<string, number> = { "tea-01": 12, "mug-07": 3 };

export function stockOf(sku: string): number {
  return stockBySku[sku] ?? 0;
}

export function isInStock(sku: string, quantity: number): boolean {
  return stockOf(sku) >= quantity;
}
