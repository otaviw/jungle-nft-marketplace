import { test, expect } from '@playwright/test'
import {
    addNft,
    login,
    registerWallet,
    reviewCheckout,
} from './helpers'

test('cotação expirada não cria pedido e permite uma nova revisão', async ({
    page,
}) => {
    const initialTime = Date.now()

    await page.clock.setFixedTime(initialTime)

    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    const originalQuote = await page.evaluate(async () => {
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

        const response = await fetch('/api/quotes', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                walletId: wallets[0].id,
            }),
        })

        const quote = await response.json() as {
            id: string
            expiresAt: number
        }

        if (!response.ok || !quote.id || !quote.expiresAt) {
            throw new Error('Não foi possível criar a cotação.')
        }

        return quote
    })

    // Avança apenas a data para depois do vencimento da cotação.
    await page.clock.setFixedTime(originalQuote.expiresAt + 1_000)

    const expiredAttempt = await page.evaluate(async (quoteId) => {
        const headers = {
            Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}`,
            'Content-Type': 'application/json',
        }

        const validationResponse = await fetch(
            `/api/quotes/${quoteId}`,
            { headers },
        )

        const orderResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                ...headers,
                'Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify({
                quoteId,
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
    }, originalQuote.id)

    expect(expiredAttempt.validationStatus).toBe(409)
    expect(expiredAttempt.orderStatus).toBe(409)
    expect(expiredAttempt.order.id).toBeUndefined()
    expect(expiredAttempt.order.message).toMatch(/expirou/i)

    // O usuário pode revisar novamente sem perder o carrinho.
    const freshQuotePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/quotes'
        && response.request().method() === 'POST',
    )

    await page.getByRole('button', {
        name: 'Revisar compra',
        exact: true,
    }).click()

    const freshQuoteResponse = await freshQuotePromise

    expect(freshQuoteResponse.status()).toBe(201)

    const freshQuote = await freshQuoteResponse.json() as {
        id: string
        expiresAt: number
        cart: { total: string }
    }

    expect(freshQuote.id).not.toBe(originalQuote.id)
    expect(freshQuote.expiresAt).toBeGreaterThan(
        originalQuote.expiresAt + 1_000,
    )
    expect(freshQuote.cart.total).toBe('1.206')

    await expect(page.getByRole('button', {
        name: 'Confirmar compra',
        exact: true,
    })).toBeVisible()
})