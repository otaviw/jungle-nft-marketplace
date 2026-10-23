import { test, expect } from '@playwright/test'
import { addNft, login } from './helpers'

test('preserva o carrinho do visitante após refresh e login', async ({
    page,
}) => {
    await addNft(page)
    await page.goto('/cart')

    await expect(
        page.getByRole('heading', { name: 'Emerald Ape #001', exact: true }),
    ).toBeVisible()

    await page.reload()

    await expect(
        page.getByRole('heading', { name: 'Emerald Ape #001', exact: true }),
    ).toBeVisible()

    await login(page, 'demo@kurio.test', '/cart')

    await expect(
        page.getByRole('heading', { name: 'Emerald Ape #001', exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Sair', exact: true }).click()

    await expect(page.getByText(
        'Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.',
        { exact: true },
    )).toBeVisible()

    await login(page, 'outro@kurio.test', '/cart')

    await expect(page.getByText(
        'Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.',
        { exact: true },
    )).toBeVisible()
})

test('favorito otimista faz rollback e permite tentar novamente', async ({
    page,
}) => {
    await login(page)
    await page.goto('/nfts/nft-001')

    const favorite = page.getByRole('button', {
        name: /^(Adicionar aos favoritos|Remover dos favoritos)$/,
    })

    await expect(favorite).toBeEnabled()
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')

    await page.evaluate(() => {
        localStorage.setItem('kurio:scenario:favorite-failure', 'true')
    })

    await favorite.click()

    await expect(favorite).toHaveAttribute('aria-pressed', 'true')

    await expect(page.getByRole('alert')).toContainText(
        'Falha simulada ao salvar favorito',
    )

    await expect(favorite).toHaveAttribute('aria-pressed', 'false')

    await favorite.click()

    await expect(page.getByText('Favorito atualizado', {
        exact: true,
    })).toBeAttached()

    await page.reload()

    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
})