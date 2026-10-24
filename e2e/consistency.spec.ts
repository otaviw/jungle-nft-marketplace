import { test, expect } from '@playwright/test'
import {
    addNft,
    login,
    registerWallet,
    reviewCheckout,
} from './helpers'

test('cotação antiga é rejeitada depois de uma mudança de preço', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    const result = await page.evaluate(async () => {
        const headers = {
            Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}`,
            'Content-Type': 'application/json',
        }

        const walletsResponse = await fetch('/api/wallets', { headers })
        const wallets = await walletsResponse.json() as Array<{
            id: string
        }>

        if (!walletsResponse.ok || !wallets[0]) {
            throw new Error('Não foi possível consultar a carteira.')
        }

        const quoteResponse = await fetch('/api/quotes', {
            method: 'POST',
            headers,
            body: JSON.stringify({ walletId: wallets[0].id }),
        })

        const quote = await quoteResponse.json() as { id: string }

        if (!quoteResponse.ok || !quote.id) {
            throw new Error('Não foi possível criar a cotação.')
        }

        const detailResponse = await fetch('/api/nfts/nft-001')
        const nft = await detailResponse.json() as {
            editions: Array<{ id: string }>
        }

        if (!detailResponse.ok || !nft.editions[0]) {
            throw new Error('Não foi possível consultar a edição.')
        }

        const changeResponse = await fetch(
            '/api/scenarios/nfts/nft-001/price',
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    editionId: nft.editions[0].id,
                    price: '3',
                }),
            },
        )

        if (!changeResponse.ok) {
            throw new Error('Não foi possível alterar o preço.')
        }

        const validationResponse = await fetch(
            `/api/quotes/${quote.id}`,
            { headers },
        )

        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                ...headers,
                'Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify({
                quoteId: quote.id,
                collector: {
                    name: 'Colecionador Demo',
                    email: 'demo@kurio.test',
                    notes: '',
                },
            }),
        })

        return {
            validationStatus: validationResponse.status,
            orderStatus: orderResponse.status,
            order: await orderResponse.json() as {
                id?: string
                message?: string
            },
        }
    })

    expect(result.validationStatus).toBe(409)
    expect(result.orderStatus).toBe(409)
    expect(result.order.id).toBeUndefined()
    expect(result.order.message).toBeTruthy()

    await page.goto('/cart')

    await expect(
        page.getByRole('heading', {
            name: 'Emerald Ape #001',
            exact: true,
        }),
    ).toBeVisible()
})

test('mesma chave repete o pedido e rejeita um corpo diferente', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    const result = await page.evaluate(async () => {
        const headers = {
            Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}`,
            'Content-Type': 'application/json',
        }

        const walletsResponse = await fetch('/api/wallets', { headers })
        const wallets = await walletsResponse.json() as Array<{
            id: string
        }>

        if (!walletsResponse.ok || !wallets[0]) {
            throw new Error('Não foi possível consultar a carteira.')
        }

        const quoteResponse = await fetch('/api/quotes', {
            method: 'POST',
            headers,
            body: JSON.stringify({ walletId: wallets[0].id }),
        })

        const quote = await quoteResponse.json() as { id: string }

        if (!quoteResponse.ok || !quote.id) {
            throw new Error('Não foi possível criar a cotação.')
        }

        const orderHeaders = {
            ...headers,
            'Idempotency-Key': crypto.randomUUID(),
        }

        const body = {
            quoteId: quote.id,
            collector: {
                name: 'Colecionador Demo',
                email: 'demo@kurio.test',
                notes: '',
            },
        }

        async function sendOrder(payload: typeof body) {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: orderHeaders,
                body: JSON.stringify(payload),
            })

            return {
                status: response.status,
                body: await response.json() as {
                    id?: string
                    code?: string
                },
            }
        }

        const first = await sendOrder(body)
        const repeated = await sendOrder(body)

        const conflicting = await sendOrder({
            ...body,
            collector: {
                ...body.collector,
                notes: 'Conteúdo diferente com a mesma chave.',
            },
        })

        return { first, repeated, conflicting }
    })

    expect(result.first.status).toBe(200)
    expect(result.first.body.id).toEqual(expect.any(String))

    expect(result.repeated.status).toBe(200)
    expect(result.repeated.body.id).toBe(result.first.body.id)

    expect(result.conflicting.status).toBe(409)
    expect(result.conflicting.body.code).toBe('IDEMPOTENCY_CONFLICT')
})

test('detalhe recebe alterações de preço sem atualizar a página', async ({
    page,
}) => {
    await page.goto('/nfts/nft-001')

    await expect(
        page.getByRole('heading', {
            name: 'Emerald Ape #001',
            exact: true,
        }),
    ).toBeVisible()

    const purchaseForm = page.locator('form').filter({
        has: page.getByRole('button', {
            name: 'Comprar NFT — adicionar ao carrinho',
            exact: true,
        }),
    })

    await expect(purchaseForm).toContainText('1.19 ETH')

    async function changePrice(price: string) {
        return page.evaluate(async (newPrice) => {
            const detailResponse = await fetch('/api/nfts/nft-001')

            const nft = await detailResponse.json() as {
                editions: Array<{ id: string }>
            }

            if (!detailResponse.ok || !nft.editions[0]) {
                throw new Error('Não foi possível consultar a edição.')
            }

            const response = await fetch(
                '/api/scenarios/nfts/nft-001/price',
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        editionId: nft.editions[0].id,
                        price: newPrice,
                    }),
                },
            )

            return response.status
        }, price)
    }

    expect(await changePrice('2.25')).toBe(200)

    await expect(purchaseForm).toContainText('2.25 ETH', {
        timeout: 12_000,
    })

    expect(await changePrice('2.75')).toBe(200)

    await expect(purchaseForm).toContainText('2.75 ETH', {
        timeout: 12_000,
    })

    await expect(purchaseForm).not.toContainText('2.25 ETH')
    await expect(page).toHaveURL(/\/nfts\/nft-001$/)
})
