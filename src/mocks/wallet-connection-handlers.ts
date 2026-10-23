import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { WalletConnection } from '@/types/wallet-connection'
import { getSession } from './auth-store'
import { readWallets } from './wallet-handlers'

function storageKey(userId: string) {
    return `kurio:wallet-connection:${userId}`
}

function getUserId(request: Request) {
    const token = request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''

    return getSession(token)?.user.id
}

export function getWalletConnection(
    userId: string,
): WalletConnection | null {
    const stored = localStorage.getItem(storageKey(userId))

    if (!stored) {
        return null
    }

    const connection = JSON.parse(stored) as WalletConnection

    if (
        connection.expiresAt <= Date.now()
        || !readWallets(userId).some(
            (wallet) => wallet.id === connection.walletId,
        )
    ) {
        localStorage.removeItem(storageKey(userId))
        return null
    }

    return connection
}

export const walletConnectionHandlers = [
    http.get('/api/wallet-connection', ({ request }) => {
        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        return HttpResponse.json(getWalletConnection(userId))
    }),

    http.post('/api/wallet-connection', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)

        await delay(500)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        const result = z.object({
            walletId: z.string().min(1),
        }).safeParse(body)

        if (
            !result.success
            || !readWallets(userId).some(
                (wallet) => wallet.id === result.data.walletId,
            )
        ) {
            return HttpResponse.json(
                { message: 'Selecione uma carteira cadastrada.' },
                { status: 422 },
            )
        }

        if (localStorage.getItem('kurio:scenario:connection') === 'declined') {
            return HttpResponse.json(
                { message: 'A conexão da carteira foi recusada na simulação.' },
                { status: 409 },
            )
        }

        const connection: WalletConnection = {
            id: crypto.randomUUID(),
            walletId: result.data.walletId,
            expiresAt: Date.now() + 15 * 60 * 1000,
        }

        localStorage.setItem(storageKey(userId), JSON.stringify(connection))

        return HttpResponse.json(connection)
    }),

    http.delete('/api/wallet-connection', ({ request }) => {
        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        localStorage.removeItem(storageKey(userId))

        return new HttpResponse(null, { status: 204 })
    }),
]