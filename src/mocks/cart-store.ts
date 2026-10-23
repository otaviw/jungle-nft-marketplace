import { z } from 'zod'
import type { Cart } from '@/types/cart'

const cartSchema = z.object({
    items: z.array(z.object({
        nftId: z.string(),
        editionId: z.string(),
        quantity: z.number().int().positive().safe(),
    })),
    coupon: z.string().optional(),
})

function storageKey(userId?: string) {
    return userId
        ? `kurio:cart:user:${userId}`
        : 'kurio:guest-cart:v1'
}

export function readCart(userId?: string): Cart {
    try {
        const stored = localStorage.getItem(storageKey(userId))

        if (!stored) {
            return { items: [] }
        }

        const parsed: unknown = JSON.parse(stored)
        const result = cartSchema.safeParse(parsed)

        return result.success ? result.data : { items: [] }
    } catch {
        return { items: [] }
    }
}

export function writeCart(cart: Cart, userId?: string) {
    localStorage.setItem(storageKey(userId), JSON.stringify(cart))
}

export function mergeGuestCart(userId: string) {
    const guest = readCart()
    const account = readCart(userId)

    for (const item of guest.items) {
        const existing = account.items.find(
            (saved) => saved.nftId === item.nftId
                && saved.editionId === item.editionId,
        )

        if (existing) {
            existing.quantity += item.quantity
        } else {
            account.items.push({ ...item })
        }
    }

    account.coupon = guest.coupon ?? account.coupon

    writeCart(account, userId)

    localStorage.removeItem(storageKey())
}