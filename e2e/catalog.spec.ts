import { test, expect } from '@playwright/test'

test('destaques alternam as obras e levam ao filtro real da coleção', async ({ page }) => {
    await page.goto('/')
    const third = page.getByRole('button', { name: 'Ver destaque 3', exact: true })
    await third.click()
    await expect(third).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.hero-art > img').first()).toHaveAttribute('src', '/images/nfts/neon-vessel.png')
    await page.locator('.market-hero').getByRole('link', { name: 'Explorar', exact: true }).click()
    await expect(page).toHaveURL(/[?&]category=Arte(?:%20|\+)digital/)
    await expect(page.locator('#catalogo article')).toHaveCount(8)
    if (page.viewportSize()!.width < 768) {
        const account = page.getByRole('button', { name: 'Abrir conta', exact: true })
        await account.click()
        await expect(page.getByRole('dialog', { name: 'Sua coleção começa aqui', exact: true })).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(account).toBeFocused()
    }
})

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

    const openSearch = page.getByRole('button', { name: 'Abrir busca', exact: true })
    if (page.viewportSize()!.width >= 768) await openSearch.click()
    await page.getByLabel('Buscar NFTs pelo nome').fill('Sage')
    await page.getByRole('button', {
        name: 'Buscar',
        exact: true,
    }).click()

    await expect(catalog.locator('article')).toHaveCount(6)

    const openFilters = page.getByRole('button', { name: 'Abrir filtros', exact: true })
    if (page.viewportSize()!.width < 768) await openFilters.click()

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
    await expect(page.getByLabel('Buscar NFTs pelo nome')).toHaveValue('Sage')
    await expect(catalog.getByLabel('Coleção', { exact: true }))
        .toHaveValue('Arte digital')

    if (page.viewportSize()!.width < 768) await openFilters.click()
    await catalog.getByRole('button', { name: 'Maior preço', exact: true }).click()
    await expect(page).toHaveURL(/[?&]sort=price-desc(?:&|#|$)/)
    await expect(catalog.locator('article')).toHaveCount(2)
})

test('busca sem resultados', async ({ page }) => {
    await page.goto('/')

    const openSearch = page.getByRole('button', { name: 'Abrir busca', exact: true })
    if (page.viewportSize()!.width >= 768) await openSearch.click()

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
