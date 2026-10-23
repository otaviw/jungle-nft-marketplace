import { test, expect } from '@playwright/test'
import { addNft, login, registerWallet, reviewCheckout } from './helpers'

test('compra completa até o recibo confirmado', async ({ page }) => {
    await login(page)
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)

    await page.getByRole('button', {
        name: 'Confirmar compra',
        exact: true,
    }).click()

    await expect(page).toHaveURL(/\/orders\/[a-zA-Z0-9-]+/)

    await expect(
        page.getByRole('heading', {
            name: 'Seus NFTs agora estão na sua carteira',
            exact: true,
        }),
    ).toBeVisible({ timeout: 12_000 })

    await expect(page.getByText('Emerald Ape #001', {
        exact: true,
    })).toBeVisible()

    await expect(page.getByText('1.206 ETH', {
        exact: true,
    })).toBeVisible()

    const receiptUrl = page.url()

    await page.reload()

    await expect(page).toHaveURL(receiptUrl)

    await expect(
        page.getByRole('heading', {
            name: 'Seus NFTs agora estão na sua carteira',
            exact: true,
        }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Ver carrinho', exact: true }).click()

    await expect(page.getByText(
        'Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.',
        { exact: true },
    )).toBeVisible()
})