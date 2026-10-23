import { delay, http, HttpResponse } from 'msw'
import {
    walletSchema,
    type Wallet,
} from '@/lib/wallet-schema'
import { getSession } from './auth-store'

export function readWallets(userId: string): Wallet[] {
    const stored = localStorage.getItem(`kurio:wallets:${userId}`)

    return stored ? JSON.parse(stored) as Wallet[] : []
}

function getUserId(request: Request) {
    const token = request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''

    return getSession(token)?.user.id
}

export const walletHandlers = [
    http.get('/api/wallets', async ({ request }) => {
        await delay(300)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Entre novamente para acessar suas carteiras.' },
                { status: 401 },
            )
        }

        return HttpResponse.json(readWallets(userId))
    }),

    http.put('/api/wallets/:slot', async ({ request, params }) => {
        const body: unknown = await request.json().catch(() => null)

        await delay(300)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        if (params.slot !== 'primary' && params.slot !== 'secondary') {
            return HttpResponse.json(
                { message: 'Tipo de carteira não encontrado.' },
                { status: 404 },
            )
        }

        const result = walletSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                {
                    message: 'Confira os dados da carteira.',
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 422 },
            )
        }

        const wallets = readWallets(userId)
        const existing = wallets.find((wallet) => wallet.slot === params.slot)

        const duplicated = wallets.some(
            (wallet) => wallet.slot !== params.slot
                && wallet.network === result.data.network
                && (
                    wallet.network === 'Solana'
                        ? wallet.address === result.data.address
                        : wallet.address.toLowerCase() === result.data.address.toLowerCase()
                ),
        )

        if (duplicated) {
            return HttpResponse.json(
                {
                    message: 'Esta carteira já está cadastrada no outro espaço.',
                    errors: { address: ['Use outro endereço ou outra rede.'] },
                },
                { status: 409 },
            )
        }

        const wallet: Wallet = {
            ...result.data,
            id: existing?.id ?? crypto.randomUUID(),
            slot: params.slot,
        }

        const updated = [
            ...wallets.filter((item) => item.slot !== params.slot),
            wallet,
        ]

        try {
            localStorage.setItem(
                `kurio:wallets:${userId}`,
                JSON.stringify(updated),
            )
        } catch {
            return HttpResponse.json(
                { message: 'Não foi possível salvar a carteira.' },
                { status: 503 },
            )
        }

        return HttpResponse.json(wallet)
    }),
]