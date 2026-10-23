import { test, expect } from '@playwright/test'

test('busca, filtros combinados, paginação e histórico', async ({ page }) => {
    await page.goto('/')

    const catalog = page.locator('#catalogo')

    await expect(catalog.locator('article')).toHaveCount(9)

    await catalog.getByRole('button', {
        name: 'Próxima',
        exact: true,
    }).click()

    await expect(page).toHaveURL(/[?&]page=2(?:&|$)/)
    await expect(catalog.locator('article')).toHaveCount(9)

    await page.goBack()

    await expect(page).not.toHaveURL(/[?&]page=2(?:&|$)/)

    await catalog.getByLabel('Buscar NFTs pelo nome').fill('Sage')
    await catalog.getByRole('button', {
        name: 'Buscar',
        exact: true,
    }).click()

    await expect(catalog.locator('article')).toHaveCount(6)

    await catalog.getByLabel('Coleção', { exact: true })
        .selectOption('Arte digital')

    await catalog.getByLabel('Rede', { exact: true })
        .selectOption('Ethereum')

    await catalog.getByLabel('Ordenar por', { exact: true })
        .selectOption('price-asc')

    await catalog.getByRole('button', {
        name: 'Aplicar',
        exact: true,
    }).click()

    await expect(catalog.locator('article')).toHaveCount(2)

    await expect(
        catalog.getByRole('heading', { name: 'Sage Nomad #010', exact: true }),
    ).toBeVisible()

    await page.reload()

    await expect(catalog.locator('article')).toHaveCount(2)
    await expect(catalog.getByLabel('Buscar NFTs pelo nome')).toHaveValue('Sage')
    await expect(catalog.getByLabel('Coleção', { exact: true }))
        .toHaveValue('Arte digital')
})

test('busca sem resultados', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Buscar NFTs pelo nome').fill('nao-existe-123')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    await expect(
        page.getByText('Nenhum NFT encontrado. Tente outra busca.', {
            exact: true,
        }),
    ).toBeVisible()
})

test('detalhe por acesso direto e NFT inexistente', async ({ page }) => {
    await page.goto('/nfts/nft-001')

    await expect(
        page.getByRole('heading', { name: 'Emerald Ape #001', exact: true }),
    ).toBeVisible()

    await page.goto('/nfts/inexistente')

    await expect(
        page.getByRole('heading', { name: 'NFT não encontrado', exact: true }),
    ).toBeVisible()
})