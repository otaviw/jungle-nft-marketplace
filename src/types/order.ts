import type { Quote } from './quote'

export interface OrderInput {
    quoteId: string
    collector: {
        name: string
        email: string
        notes: string
    }
}

export interface Order {
    id: string
    status: 'pending' | 'confirmed' | 'declined'
    version: number
    createdAt: number
    updatedAt: number
    transactionId: string | null
    rejectionReason: string | null
    collector: OrderInput['collector']
    snapshot: Quote
}