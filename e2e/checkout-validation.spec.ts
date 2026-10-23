import { test, expect } from '@playwright/test'
import {
    addNft,
    login,
    registerWallet,
    reviewCheckout,
} from './helpers'

test('sessão expirada exige login e preserva o carrinho', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    const expirationStatus = await page.evaluate(async () => {
        const token = localStorage.getItem('kurio:session-token')

        const response = await fetch('/api/auth/expire', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        return response.status
    })

    expect(expirationStatus).toBe(204)

    // Uma nova consulta deve perceber que a sessão expirou.
    await page.getByRole('button', {
        name: 'Revisar compra',
        exact: true,
    }).click()

    await expect(page).toHaveURL(/\/login\?/)
    await expect(page.getByRole('dialog')).toBeVisible()

    await expect.poll(() =>
        page.evaluate(() =>
            localStorage.getItem('kurio:session-token'),
        ),
    ).toBeNull()

    // O carrinho continua pertencendo à conta após entrar novamente.
    await login(page, 'demo@kurio.test', '/cart')

    await expect(
        page.getByRole('heading', {
            name: 'Emerald Ape #001',
            exact: true,
        }),
    ).toBeVisible()
})

test('alteração de preço invalida a revisão e exige novos valores', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    const confirmPurchase = page.getByRole('button', {
        name: 'Confirmar compra',
        exact: true,
    })

    await expect(confirmPurchase).toBeVisible()

    const priceChangeStatus = await page.evaluate(async () => {
        const detailResponse = await fetch('/api/nfts/nft-001')

        if (!detailResponse.ok) {
            throw new Error('Não foi possível consultar o NFT do teste.')
        }

        const nft = await detailResponse.json() as {
            editions: Array<{ id: string }>
        }

        const editionId = nft.editions[0]?.id

        if (!editionId) {
            throw new Error('O NFT do teste não possui edição.')
        }

        const response = await fetch(
            '/api/scenarios/nfts/nft-001/price',
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    editionId,
                    price: '2',
                }),
            },
        )

        return response.status
    })

    expect(priceChangeStatus).toBe(200)

    // O evento do catálogo deve retirar a confirmação antiga.
    await expect(confirmPurchase).toHaveCount(0, {
        timeout: 12_000,
    })

    const updatedQuoteResponse = page.waitForResponse((response) => {
        const url = new URL(response.url())

        return url.pathname === '/api/quotes'
            && response.request().method() === 'POST'
    })

    await page.getByRole('button', {
        name: 'Revisar compra',
        exact: true,
    }).click()

    const response = await updatedQuoteResponse

    expect(response.status()).toBe(201)

    const quote = await response.json() as {
        cart: {
            subtotal: string
            total: string
        }
    }

    expect(quote.cart.subtotal).toBe('2')
    expect(quote.cart.total).toBe('2.016')

    await expect(confirmPurchase).toBeVisible()

    await expect(
        page.getByText('2.016 ETH', { exact: true }).first(),
    ).toBeVisible()
})