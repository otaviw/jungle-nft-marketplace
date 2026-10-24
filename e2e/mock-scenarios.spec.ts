import { test, expect } from '@playwright/test'
import { addNft, login, registerWallet, reviewCheckout } from './helpers'
import { mockApi } from './mock-api'
import type { Nft } from '../src/types/nft'

test('catálogo, detalhe e carrinho mostram skeleton durante lentidão', async ({ page }) => {
    await page.goto('/nfts/nft-002')
    await expect(page.getByRole('heading', { name: 'Sage Nomad #002' })).toBeVisible()

    for (const scenario of [
        { resource: 'catalog', path: '/', loading: 'Carregando NFTs...', ready: '24 NFTs encontrados' },
        { resource: 'detail', path: '/nfts/nft-001', loading: 'Carregando detalhes do NFT', ready: 'Emerald Ape #001' },
        { resource: 'cart', path: '/cart', loading: 'Carregando carrinho', ready: 'Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.' },
    ]) {
        await mockApi(page, '/scenarios/network', {
            method: 'PUT', body: { resource: scenario.resource, delaysMs: [1500] },
        })
        await page.goto(scenario.path)
        await expect(page.getByText(scenario.loading, { exact: true })).toBeVisible()
        await expect(page.locator('.catalog-shimmer').first()).toBeVisible()
        await expect(page.getByText(scenario.ready, { exact: true })).toBeVisible()
        await expect(page.locator('.catalog-shimmer')).toHaveCount(0)
    }
})

for (const failure of ['network', 'http-503']) {
    test(`catálogo recupera após ${failure} sem ocultar o erro`, async ({ page }) => {
        await page.goto('/nfts/nft-001')
        await expect(page.getByRole('heading', { name: 'Emerald Ape #001' })).toBeVisible()
        await mockApi(page, '/scenarios/network', {
            method: 'PUT',
            // Duas falhas incluem o retry único do QueryClient.
            body: { resource: 'catalog', delaysMs: [100], failures: [failure, failure] },
        })
        await page.goto('/')
        await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os NFTs.')
        await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
        await expect(page.getByText('24 NFTs encontrados', { exact: true })).toBeVisible()
        await expect(page.getByRole('alert')).toHaveCount(0)
        await expect(page.locator('#catalogo article')).toHaveCount(9)
    })
}

test('latência variável entrega respostas fora de ordem e busca descarta a anterior', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('24 NFTs encontrados', { exact: true })).toBeVisible()
    await mockApi(page, '/scenarios/network', {
        method: 'PUT', body: { resource: 'catalog', delaysMs: [1500, 50] },
    })
    const responses = await page.evaluate(async () => {
        const completed: Array<{ q: string; names: string[] }> = []
        await Promise.all(['Emerald', 'Sage'].map(async (q) => {
            const response = await fetch(`/api/nfts?q=${q}`)
            if (!response.ok) throw new Error(`Falha no catálogo: ${response.status}`)
            const data = await response.json() as { items: Array<{ name: string }> }
            completed.push({ q, names: data.items.map(item => item.name) })
        }))
        return completed
    })
    expect(responses.map(response => response.q)).toEqual(['Sage', 'Emerald'])
    expect(responses[0].names.every(name => name.startsWith('Sage'))).toBe(true)
    expect(responses[1].names.every(name => name.startsWith('Emerald'))).toBe(true)

    await mockApi(page, '/scenarios/network', {
        method: 'PUT', body: { resource: 'catalog', delaysMs: [1500, 50] },
    })
    const oldRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'Emerald')
    await page.getByRole('searchbox').fill('Emerald')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    const previous = await oldRequest
    const cancelled = page.waitForEvent('requestfailed', request => request === previous)
    await page.getByRole('searchbox').fill('Sage')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await cancelled
    await expect(page).toHaveURL(/q=Sage/)
    await expect(page.getByText('6 NFTs encontrados', { exact: true })).toBeVisible()
    await expect(page.locator('#catalogo article')).toHaveCount(6)
    await expect(page.locator('#catalogo article').filter({ hasText: 'Emerald' })).toHaveCount(0)
})

test('edição esgota durante revisão e não permite criar pedido com cotação antiga', async ({ page }) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)
    const createdOrders: string[] = []
    page.on('request', request => {
        if (new URL(request.url()).pathname === '/api/orders' && request.method() === 'POST') {
            createdOrders.push(request.url())
        }
    })
    const updated = await mockApi<Nft>(page, '/scenarios/nfts/nft-001/availability', {
        method: 'PATCH', body: { editionId: 'standard', available: 0 },
    })
    expect(updated.editions[0].available).toBe(0)
    await expect(page.getByRole('status').filter({ hasText: 'Preço ou disponibilidade atualizado' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('A disponibilidade mudou.')
    expect(createdOrders).toHaveLength(0)
    await page.goto('/cart')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #001', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #001', exact: true })).toBeVisible()
    const nft = await mockApi<Nft>(page, '/nfts/nft-001')
    expect(nft.editions[0].available).toBe(0)
})
