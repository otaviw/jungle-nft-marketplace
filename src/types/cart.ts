export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
}

export interface Cart {
  items: CartItem[]
  coupon?: string
}

export interface CartLine extends CartItem {
  name: string
  image: string
  editionName: string
  available: number
  unitPrice: string
  subtotal: string
}

export interface CartView extends Cart {
  lines: CartLine[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
}