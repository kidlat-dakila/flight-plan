export interface Product {
  id: string
  name: string
  priceCents: number
  imageUrl: string
}

export interface CartItem {
  product: Product
  quantity: number
}
