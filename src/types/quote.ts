import type { CartView } from './cart'
import type { Wallet } from '@/lib/wallet-schema'

export interface Quote {
    id: string
    expiresAt: number
    cart: CartView
    wallet: Wallet
}