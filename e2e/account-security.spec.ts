import { test, expect } from '@playwright/test'
import {
    addNft,
    login,
    registerWallet,
    reviewCheckout,
} from './helpers'

test('senha incorreta não cria uma sessão', async ({ page }) => {
    await page.goto('/login?mode=login&redirect=%2Fprofile')

    const dialog = page.getByRole('dialog')

    await expect(dialog).toBeVisible()

    await dialog.getByLabel('E-mail', { exact: true })
        .fill('demo@kurio.test')

    await dialog.getByLabel('Senha', { exact: true })
        .fill('SenhaIncorreta123!')

    const loginResponsePromise = page.waitForResponse((response) =>
        new URL(response.url()).pathname === '/api/auth/login'
        && response.request().method() === 'POST',
    )

    await dialog.locator('form').getByRole('button', {
        name: 'Entrar',
        exact: true,
    }).click()

    const response = await loginResponsePromise

    expect(response.status()).toBe(401)

    await expect(dialog.getByText(
        'E-mail ou senha incorretos.',
        { exact: true },
    )).toBeVisible()

    expect(
        await page.evaluate(() =>
            localStorage.getItem('kurio:session-token'),
        ),
    ).toBeNull()

    // A rota privada também precisa continuar protegida.
    await page.goto('/profile')

    await expect(page).toHaveURL(/\/login\?/)
    await expect(page.getByRole('dialog')).toBeVisible()
})

test('outra conta não acessa pedido, cotação ou carteira do primeiro usuário', async ({
    page,
}) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    const original = await page.evaluate(async () => {
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
            body: JSON.stringify({
                walletId: wallets[0].id,
            }),
        })

        const quote = await quoteResponse.json() as { id: string }

        if (!quoteResponse.ok || !quote.id) {
            throw new Error('Não foi possível criar a cotação.')
        }

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

        const order = await orderResponse.json() as { id: string }

        if (!orderResponse.ok || !order.id) {
            throw new Error('Não foi possível criar o pedido.')
        }

        return {
            orderId: order.id,
            quoteId: quote.id,
            walletId: wallets[0].id,
        }
    })

    // O checkout mobile usa um cabeçalho compacto; a saída da conta
    // permanece disponível no perfil em todos os tamanhos de tela.
    await page.goto('/profile')
    await page.getByRole('button', {
        name: 'Sair',
        exact: true,
    }).click()

    await login(page, 'outro@kurio.test', '/cart')

    const otherAccount = await page.evaluate(async (resources) => {
        const headers = {
            Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}`,
        }

        const orderResponse = await fetch(
            `/api/orders/${resources.orderId}`,
            { headers },
        )

        const quoteResponse = await fetch(
            `/api/quotes/${resources.quoteId}`,
            { headers },
        )

        const walletsResponse = await fetch('/api/wallets', { headers })

        return {
            orderStatus: orderResponse.status,
            quoteStatus: quoteResponse.status,
            walletsStatus: walletsResponse.status,
            wallets: await walletsResponse.json() as Array<{
                id: string
            }>,
        }
    }, original)

    expect(otherAccount.orderStatus).toBe(404)
    expect(otherAccount.quoteStatus).toBe(404)
    expect(otherAccount.walletsStatus).toBe(200)
    expect(otherAccount.wallets).toEqual([])

    await expect(page.getByText(
        'Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.',
        { exact: true },
    )).toBeVisible()
})