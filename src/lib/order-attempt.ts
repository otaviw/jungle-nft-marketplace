import { z } from 'zod'
import { api } from './api'
import type { Order, OrderInput } from '@/types/order'

const attemptSchema = z.object({
    key: z.string(),
    input: z.object({
        quoteId: z.string(),
        collector: z.object({
            name: z.string(),
            email: z.string(),
            notes: z.string(),
        }),
    }),
    orderId: z.string().optional(),
})

function storageKey(userId: string) {
    return `kurio:order-attempt:${userId}`
}

export function readOrderAttempt(userId: string) {
    const stored = localStorage.getItem(storageKey(userId))

    if (!stored) {
        return null
    }

    const result = attemptSchema.safeParse(JSON.parse(stored))

    if (!result.success) {
        throw new Error(
            'Não foi possível recuperar a tentativa anterior. Não envie outra compra antes de verificar.',
        )
    }

    return result.data
}

export function clearOrderAttempt(userId: string) {
    localStorage.removeItem(storageKey(userId))
}

export async function submitOrderAttempt(
    userId: string,
    input?: OrderInput,
): Promise<Order> {
    let attempt = readOrderAttempt(userId)

    if (attempt && input && JSON.stringify(attempt.input) !== JSON.stringify(input)) {
        throw new Error(
            'Existe uma tentativa anterior. Recupere seu resultado antes de iniciar outra.',
        )
    }

    if (!attempt) {
        if (!input) {
            throw new Error('Nenhuma tentativa encontrada para recuperar.')
        }

        attempt = {
            key: crypto.randomUUID(),
            input,
        }

        localStorage.setItem(storageKey(userId), JSON.stringify(attempt))
    }

    if (attempt.orderId) {
        const response = await api.get<Order>(`/orders/${attempt.orderId}`)

        return response.data
    }

    const response = await api.post<Order>('/orders', attempt.input, {
        headers: {
            'Idempotency-Key': attempt.key,
        },
    })

    localStorage.setItem(
        storageKey(userId),
        JSON.stringify({
            ...attempt,
            orderId: response.data.id,
        }),
    )

    return response.data
}