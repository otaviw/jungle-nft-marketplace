import { test, expect } from '@playwright/test'
import { login, registerWallet, addNft } from './helpers'
import { mockApi } from './mock-api'
import type { Wallet } from '../src/lib/wallet-schema'
import type { Order } from '../src/types/order'

test('checkout usa perfil e carteira, preserva draft e registra os dados revisados no pedido', async ({ page }) => {
    await login(page)
    await registerWallet(page)
    await mockApi(page, '/profile', { method: 'PATCH', body: {
        name: 'Colecionador Demo', email: 'demo@kurio.test', displayName: 'Perfil da coleção', ens: 'colecao.eth', walletNickname: 'Principal',
    } })
    const [wallet] = await mockApi<Wallet[]>(page, '/wallets')
    await addNft(page)
    await page.goto('/checkout')
    if (page.viewportSize()!.width < 768) {
        await expect(page.getByRole('link', { name: 'Gerenciar carteiras', exact: true })).toBeVisible()
        await page.getByRole('link', { name: 'Voltar ao carrinho', exact: true }).focus()
        await page.keyboard.press('Tab')
        await expect(page.getByRole('link', { name: 'Gerenciar carteiras', exact: true })).toBeFocused()
    }
    if (page.viewportSize()!.width < 768) await page.getByRole('button', { name: 'Dados do colecionador', exact: true }).click()
    await expect(page.getByLabel('Nome de exibição', { exact: true })).toHaveValue('Perfil da coleção')
    await expect(page.getByLabel('Endereço da carteira', { exact: true })).toHaveValue(wallet.address)
    await expect(page.getByLabel('Endereço da carteira', { exact: true })).toHaveAttribute('readonly', '')
    await expect(page.getByLabel('Nome do perfil', { exact: true })).toHaveValue(wallet.profileName)
    await page.getByLabel('Nome de exibição', { exact: true }).fill('Nome no pedido')
    await page.getByLabel('Observações do colecionador (opcional)', { exact: true }).fill('Manter no recibo')
    await page.reload()
    if (page.viewportSize()!.width < 768) await page.getByRole('button', { name: 'Dados do colecionador', exact: true }).click()
    await expect(page.getByLabel('Nome de exibição', { exact: true })).toHaveValue('Nome no pedido')
    await expect(page.getByLabel('Observações do colecionador (opcional)', { exact: true })).toHaveValue('Manter no recibo')
    await page.getByLabel('E-mail', { exact: true }).fill('email-invalido')
    if (page.viewportSize()!.width < 768) await page.getByRole('button', { name: 'Dados do colecionador', exact: true }).click()
    await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
    const quoteRequests: string[] = []
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/quotes' && request.method() === 'POST') quoteRequests.push(request.url()) })
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()
    expect(quoteRequests).toHaveLength(0)
    if (page.viewportSize()!.width < 768) await expect(page.getByRole('button', { name: 'Dados do colecionador', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test')
    await page.getByLabel('Nome de exibição', { exact: true }).focus()
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
    const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    const order = await (await response).json() as Order
    expect(order.collector).toEqual({ name: 'Nome no pedido', email: 'demo@kurio.test', notes: 'Manter no recibo' })
    expect(order.snapshot.wallet).toEqual(wallet)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true })).toBeVisible({ timeout: 12_000 })
    await expect(page.getByText('Nome no pedido', { exact: true })).toBeVisible()
    // Alterar o cadastro após a compra não pode reescrever o snapshot do recibo.
    await mockApi(page, '/wallets/primary', { method: 'PUT', body: { ...wallet, nickname: 'Outro apelido' } })
    await page.reload()
    await expect(page.getByText(wallet.nickname, { exact: true })).toBeVisible()
    await expect(page.getByText('Outro apelido', { exact: true })).toHaveCount(0)
})
