import { isInStock } from "../inventory/stock";

export interface Reservation {
  sku: string;
  quantity: number;
}

export function reserve(sku: string, quantity: number): Reservation | null {
  if (!isInStock(sku, quantity)) return null;
  return { sku, quantity };
}
