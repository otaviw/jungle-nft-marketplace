import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { Cart } from '@/types/cart'
import { getSession } from './auth-store'
import { createCartView } from './cart-summary'
import { readCart, writeCart } from './cart-store'
import { nfts } from './fixtures'
import { simulateNetwork } from './network-scenarios'

const quantitySchema = z.object({
    quantity: z.number().int().positive().safe(),
})

const itemSchema = quantitySchema.extend({
    nftId: z.string(),
    editionId: z.string(),
})

const couponSchema = z.object({
    code: z.string().trim().toUpperCase(),
})

function withCart(
    request: Request,
    action: (cart: Cart, save: (cart: Cart) => void) => Response,
): Response {
    const authorization = request.headers.get('Authorization')
    let userId: string | undefined

    if (authorization) {
        const session = getSession(authorization.replace(/^Bearer /, ''))

        if (!session) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou. Entre novamente.' },
                { status: 401 },
            )
        }

        userId = session.user.id
    }

    try {
        return action(
            readCart(userId),
            (cart) => writeCart(cart, userId),
        )
    } catch {
        return HttpResponse.json(
            { message: 'Não foi possível acessar o carrinho. Tente novamente.' },
            { status: 503 },
        )
    }
}

export const cartHandlers = [
    http.get('/api/cart', async ({ request }) => {
        const failure = await simulateNetwork('cart', 300)
        if (failure) return failure

        return withCart(request, (cart) =>
            HttpResponse.json(createCartView(cart)),
        )
    }),

    http.post('/api/cart/items', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)
        const result = itemSchema.safeParse(body)

        await delay(300)

        return withCart(request, (cart, save) => {
            if (!result.success) {
                return HttpResponse.json(
                    { message: 'Informe NFT, edição e quantidade inteira positiva.' },
                    { status: 422 },
                )
            }

            const input = result.data
            const nft = nfts.find((item) => item.id === input.nftId)
            const edition = nft?.editions.find(
                (item) => item.id === input.editionId,
            )

            if (!edition) {
                return HttpResponse.json(
                    { message: 'NFT ou edição não encontrado.' },
                    { status: 404 },
                )
            }

            const existing = cart.items.find(
                (item) => item.nftId === input.nftId
                    && item.editionId === input.editionId,
            )

            const quantity = (existing?.quantity ?? 0) + input.quantity

            if (quantity > edition.available) {
                return HttpResponse.json(
                    { message: `Limite disponível: ${edition.available} unidades.` },
                    { status: 409 },
                )
            }

            if (existing) {
                existing.quantity = quantity
            } else {
                cart.items.push(input)
            }

            save(cart)

            return HttpResponse.json(createCartView(cart))
        })
    }),

    http.patch('/api/cart/items/:nftId/:editionId', async ({
        request,
        params,
    }) => {
        const body: unknown = await request.json().catch(() => null)
        const result = quantitySchema.safeParse(body)

        await delay(300)

        return withCart(request, (cart, save) => {
            if (!result.success) {
                return HttpResponse.json(
                    { message: 'Informe uma quantidade inteira positiva.' },
                    { status: 422 },
                )
            }

            const item = cart.items.find(
                (item) => item.nftId === params.nftId
                    && item.editionId === params.editionId,
            )

            const nft = nfts.find((item) => item.id === params.nftId)
            const edition = nft?.editions.find(
                (item) => item.id === params.editionId,
            )

            if (!item || !edition) {
                return HttpResponse.json(
                    { message: 'Item não encontrado.' },
                    { status: 404 },
                )
            }

            const quantity = result.data.quantity

            // Permite reduzir uma quantidade que ficou acima do estoque.
            if (quantity > edition.available && quantity >= item.quantity) {
                return HttpResponse.json(
                    { message: 'A quantidade ultrapassa a disponibilidade.' },
                    { status: 409 },
                )
            }

            item.quantity = quantity
            save(cart)

            return HttpResponse.json(createCartView(cart))
        })
    }),

    http.delete('/api/cart/items/:nftId/:editionId', async ({
        request,
        params,
    }) => {
        await delay(300)

        return withCart(request, (cart, save) => {
            cart.items = cart.items.filter(
                (item) => !(
                    item.nftId === params.nftId
                    && item.editionId === params.editionId
                ),
            )

            save(cart)

            return HttpResponse.json(createCartView(cart))
        })
    }),

    http.post('/api/cart/coupon', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)
        const result = couponSchema.safeParse(body)

        await delay(300)

        return withCart(request, (cart, save) => {
            if (!result.success) {
                return HttpResponse.json(
                    { message: 'Informe o código do cupom.' },
                    { status: 422 },
                )
            }

            const code = result.data.code

            if (code && code !== 'KURIO10') {
                return HttpResponse.json(
                    {
                        message: code === 'EXPIRADO'
                            ? 'Este cupom expirou.'
                            : 'Cupom inválido.',
                    },
                    { status: 422 },
                )
            }

            cart.coupon = code || undefined
            save(cart)

            return HttpResponse.json(createCartView(cart))
        })
    }),
]
