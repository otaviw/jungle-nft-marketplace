import { test, expect } from '@playwright/test'
import { addNft, login, registerWallet, reviewCheckout } from './helpers'

test('pagamento recusado preserva os itens no carrinho', async ({ page }) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    await page.evaluate(() => {
        localStorage.setItem('kurio:scenario:payment', 'declined')
    })

    await page.getByRole('button', {
        name: 'Confirmar compra',
        exact: true,
    }).click()

    await expect(page).toHaveURL(/\/orders\/[a-zA-Z0-9-]+/)

    await expect(
        page.getByRole('heading', {
            name: 'Pagamento recusado',
            exact: true,
        }),
    ).toBeVisible({ timeout: 12_000 })

    await expect(
        page.getByRole('heading', {
            name: 'Seus NFTs agora estão na sua carteira',
            exact: true,
        }),
    ).toHaveCount(0)

    await page.reload()

    await expect(
        page.getByRole('heading', {
            name: 'Pagamento recusado',
            exact: true,
        }),
    ).toBeVisible()

    await page.getByRole('link', {
        name: 'Ver carrinho',
        exact: true,
    }).click()

    await expect(
        page.getByRole('heading', {
            name: 'Emerald Ape #001',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        page.getByText('1.206 ETH', { exact: true }),
    ).toBeVisible()
})

test('timeout e refresh recuperam a mesma tentativa', async ({ page }) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    await page.evaluate(() => {
        localStorage.setItem('kurio:scenario:order-timeout', 'true')
    })

    const firstRequestPromise = page.waitForRequest((request) => {
        return new URL(request.url()).pathname === '/api/orders'
            && request.method() === 'POST'
    })

    await page.getByRole('button', {
        name: 'Confirmar compra',
        exact: true,
    }).click()

    const firstRequest = await firstRequestPromise
    const originalKey = await firstRequest.headerValue('idempotency-key')
    const originalBody = firstRequest.postDataJSON()

    expect(originalKey).toBeTruthy()

    await expect(
        page.getByRole('heading', {
            name: 'Recuperar tentativa anterior',
            exact: true,
        }),
    ).toBeVisible({ timeout: 15_000 })

    // A tentativa deve sobreviver ao refresh.
    await page.reload()

    await expect(
        page.getByRole('heading', {
            name: 'Recuperar tentativa anterior',
            exact: true,
        }),
    ).toBeVisible()

    await page.evaluate(() => {
        localStorage.removeItem('kurio:scenario:order-timeout')
    })

    const recoveryRequestPromise = page.waitForRequest((request) => {
        return new URL(request.url()).pathname === '/api/orders'
            && request.method() === 'POST'
    })

    const recoveryResponsePromise = page.waitForResponse((response) => {
        return new URL(response.url()).pathname === '/api/orders'
            && response.request().method() === 'POST'
            && response.request() !== firstRequest
    })

    await page.getByRole('button', {
        name: 'Recuperar pedido',
        exact: true,
    }).click()

    const recoveryRequest = await recoveryRequestPromise

    expect(
        await recoveryRequest.headerValue('idempotency-key'),
    ).toBe(originalKey)

    expect(recoveryRequest.postDataJSON()).toEqual(originalBody)

    const recoveryResponse = await recoveryResponsePromise

    expect(recoveryResponse.ok()).toBeTruthy()

    const recoveredOrder = await recoveryResponse.json() as { id: string }

    await expect(page).toHaveURL(
        new RegExp(`/orders/${recoveredOrder.id}$`),
    )

    await expect(
        page.getByRole('heading', {
            name: 'Seus NFTs agora estão na sua carteira',
            exact: true,
        }),
    ).toBeVisible({ timeout: 12_000 })

    await page.getByRole('link', {
        name: 'Ver carrinho',
        exact: true,
    }).click()

    await expect(page.getByText(
        'Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.',
        { exact: true },
    )).toBeVisible()
})