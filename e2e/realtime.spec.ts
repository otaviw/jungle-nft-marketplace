import { test, expect } from '@playwright/test'
import {
    addNft,
    login,
    registerWallet,
    reviewCheckout,
} from './helpers'
import { mockApi } from './mock-api'
import type { Order } from '../src/types/order'

test('reconexão durante pedido pendente recupera o mesmo pedido por REST', async ({ page }) => {
    const initialTime = new Date('2026-10-24T12:00:00Z').getTime()
    await page.clock.setFixedTime(initialTime)
    const orderPosts: string[] = []
    page.on('request', request => {
        if (new URL(request.url()).pathname === '/api/orders' && request.method() === 'POST') {
            orderPosts.push(request.postData() ?? '')
        }
    })
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    await expect(page).toHaveURL(/\/orders\/[a-zA-Z0-9-]+/)
    const orderId = new URL(page.url()).pathname.split('/').at(-1)!
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => {
        const detail = { action: 'probe', scope: 'order', handled: 0 }
        window.dispatchEvent(new CustomEvent('kurio:scenario:realtime', { detail }))
        return detail.handled
    })).toBeGreaterThan(0)
    const before = await mockApi<Order>(page, `/orders/${orderId}`)
    expect(before.status).toBe('pending')

    const reconciliation = page.waitForResponse(response =>
        new URL(response.url()).pathname === `/api/orders/${orderId}`
        && response.request().method() === 'GET' && response.status() === 200,
    )
    const disconnected = await page.evaluate(() => {
        const detail = { action: 'disconnect', scope: 'order', handled: 0 }
        window.dispatchEvent(new CustomEvent('kurio:scenario:realtime', { detail }))
        return detail.handled
    })
    expect(disconnected).toBeGreaterThan(0)
    await expect(page.getByRole('status').filter({ hasText: 'Conexão interrompida' })).toBeVisible()
    const recovered = await (await reconciliation).json() as Order
    expect(recovered.id).toBe(orderId)
    expect(recovered.status).toBe('pending')
    expect(recovered.snapshot).toEqual(before.snapshot)
    await expect(page.getByRole('status').filter({ hasText: 'Acompanhamento em tempo real conectado.' })).toBeVisible()

    await page.clock.setFixedTime(initialTime + 4000)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`))
    expect(orderPosts).toHaveLength(1)
    const confirmed = await mockApi<Order>(page, `/orders/${orderId}`)
    expect(confirmed.status).toBe('confirmed')
    expect(confirmed.snapshot).toEqual(before.snapshot)
})

test('reconexão recupera o preço por REST mesmo sem eventos do catálogo', async ({
    page,
}) => {
    await page.goto('/nfts/nft-001')

    const purchaseForm = page.locator('form').filter({
        has: page.getByRole('button', {
            name: 'Comprar NFT — adicionar ao carrinho',
            exact: true,
        }),
    })

    await expect(purchaseForm).toContainText('1.19 ETH')

    // Aguarda uma assinatura real, sem usar um tempo fixo de espera.
    await expect.poll(() =>
        page.evaluate(() => {
            const detail = {
                action: 'probe',
                scope: 'catalog',
                handled: 0,
            }

            window.dispatchEvent(new CustomEvent(
                'kurio:scenario:realtime',
                { detail },
            ))

            return detail.handled
        }),
    ).toBeGreaterThan(0)

    const changeStatus = await page.evaluate(async () => {
        // A partir daqui, nft.updated não será enviado pelo mock.
        localStorage.setItem(
            'kurio:scenario:pause-catalog-events',
            'true',
        )

        const response = await fetch('/api/nfts/nft-001')

        const nft = await response.json() as {
            editions: Array<{ id: string }>
        }

        if (!response.ok || !nft.editions[0]) {
            throw new Error('Não foi possível consultar a edição.')
        }

        const changed = await fetch(
            '/api/scenarios/nfts/nft-001/price',
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    editionId: nft.editions[0].id,
                    price: '4.25',
                }),
            },
        )

        return changed.status
    })

    expect(changeStatus).toBe(200)

    // A atualização ainda não deve ter chegado à interface.
    await expect(purchaseForm).toContainText('1.19 ETH')

    const reconciliationPromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/nfts/nft-001'
        && response.request().method() === 'GET'
        && response.status() === 200,
    )

    const disconnected = await page.evaluate(() => {
        const detail = {
            action: 'disconnect',
            scope: 'catalog',
            handled: 0,
        }

        window.dispatchEvent(new CustomEvent(
            'kurio:scenario:realtime',
            { detail },
        ))

        return detail.handled
    })

    expect(disconnected).toBeGreaterThan(0)

    // catalog.ready, após reconectar, deve provocar a consulta REST.
    await reconciliationPromise

    await expect(purchaseForm).toContainText('4.25 ETH', {
        timeout: 12_000,
    })

    await expect(page).toHaveURL(/\/nfts\/nft-001$/)

    await expect.poll(() =>
        page.evaluate(() => {
            const detail = {
                action: 'probe',
                scope: 'catalog',
                handled: 0,
            }

            window.dispatchEvent(new CustomEvent(
                'kurio:scenario:realtime',
                { detail },
            ))

            return detail.handled
        }),
    ).toBeGreaterThan(0)
})

test('eventos duplicados e antigos não reconsultam nem regridem o pedido confirmado', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    await page.getByRole('button', {
        name: 'Confirmar compra',
        exact: true,
    }).click()

    await expect(page).toHaveURL(/\/orders\/[a-zA-Z0-9-]+/)

    const confirmedHeading = page.getByRole('heading', {
        name: 'Seus NFTs agora estão na sua carteira',
        exact: true,
    })

    await expect(confirmedHeading).toBeVisible({
        timeout: 12_000,
    })

    await expect.poll(() =>
        page.evaluate(() => {
            const detail = {
                action: 'probe',
                scope: 'order',
                handled: 0,
            }

            window.dispatchEvent(new CustomEvent(
                'kurio:scenario:realtime',
                { detail },
            ))

            return detail.handled
        }),
    ).toBeGreaterThan(0)

    const orderId = new URL(page.url()).pathname.split('/').at(-1)

    if (!orderId) {
        throw new Error('O recibo não possui ID na URL.')
    }

    const order = await page.evaluate(async (id) => {
        const response = await fetch(`/api/orders/${id}`, {
            headers: {
                Authorization:
                    `Bearer ${localStorage.getItem('kurio:session-token')}`,
            },
        })

        if (!response.ok) {
            throw new Error('Não foi possível consultar o pedido.')
        }

        return await response.json() as {
            id: string
            version: number
            status: string
        }
    }, orderId)

    expect(order.status).toBe('confirmed')
    expect(order.version).toBeGreaterThan(1)

    // Janela de observação: eventos descartados não devem causar GET.
    // O listener começa antes de emitir os eventos.
    const unexpectedRequest = page.waitForRequest((request) =>
        new URL(request.url()).pathname === `/api/orders/${orderId}`
        && request.method() === 'GET',
        { timeout: 1_500 },
    ).then(
        () => true,
        (error: unknown) => {
            if (error instanceof Error && error.name === 'TimeoutError') {
                return false
            }

            throw error
        },
    )

    await page.evaluate(({ id, version }) => {
        // A mesma versão duas vezes, seguida de uma versão antiga.
        for (const eventVersion of [version, version, version - 1]) {
            window.dispatchEvent(new CustomEvent(
                'kurio:scenario:realtime',
                {
                    detail: {
                        action: 'order-event',
                        orderId: id,
                        version: eventVersion,
                    },
                },
            ))
        }
    }, {
        id: orderId,
        version: order.version,
    })

    expect(await unexpectedRequest).toBe(false)

    await expect(confirmedHeading).toBeVisible()

    await expect(page.getByRole('heading', {
        name: 'Aguardando confirmação',
        exact: true,
    })).toHaveCount(0)

    await expect(page.getByText(
        '1.206 ETH',
        { exact: true },
    )).toBeVisible()
})
