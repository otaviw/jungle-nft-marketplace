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

    await catalog.getByRole('group', { name: 'Coleções', exact: true })
        .getByRole('radio', { name: 'Arte digital', exact: true }).check()
    await catalog.getByRole('group', { name: 'Rede', exact: true })
        .getByRole('radio', { name: 'Ethereum', exact: true }).check()
    await catalog.getByRole('button', { name: 'Aplicar', exact: true }).click()
    if (page.viewportSize()!.width < 768) await openFilters.click()
    await catalog.getByRole('combobox', { name: 'Ordenar por', exact: true }).click()
    await page.getByRole('option', { name: 'Menor preço', exact: true }).click()

    await expect(catalog.locator('article')).toHaveCount(2)

    await expect(
        catalog.getByRole('heading', { name: 'Sage Nomad #010', exact: true }),
    ).toBeVisible()

    await page.reload()

    await expect(catalog.locator('article')).toHaveCount(2)
    await expect(page.getByLabel('Buscar NFTs pelo nome')).toHaveValue('Sage')
    if (page.viewportSize()!.width < 768) await openFilters.click()
    await expect(catalog.getByRole('group', { name: 'Coleções', exact: true }).getByRole('radio', { name: 'Arte digital', exact: true })).toBeChecked()

    await catalog.getByRole('combobox', { name: 'Ordenar por', exact: true }).click()
    await page.getByRole('option', { name: 'Maior preço', exact: true }).click()
    await expect(page).toHaveURL(/[?&]sort=price-desc(?:&|#|$)/)
    await expect(catalog.locator('article')).toHaveCount(2)
})

test('faixa de preço combina filtros, preserva parâmetros e restaura no histórico', async ({ page }) => {
    await page.goto('/?q=Sage&view=trending&sort=price-desc&page=2')
    const catalog = page.locator('#catalogo')
    const mobile = page.viewportSize()!.width < 768
    const open = page.getByRole('button', { name: 'Abrir filtros', exact: true })
    if (mobile) await open.click()
    await catalog.getByRole('radio', { name: 'Arte digital', exact: true }).check()
    await catalog.getByRole('radio', { name: 'Ethereum', exact: true }).check()
    const minimum = catalog.getByRole('slider', { name: 'Preço mínimo em ETH', exact: true })
    const maximum = catalog.getByRole('slider', { name: 'Preço máximo em ETH', exact: true })
    await minimum.fill('1.19')
    await maximum.fill('1.69')
    await expect(page).toHaveURL(/[?&]page=2/)
    await catalog.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(catalog.locator('article')).toHaveCount(2)
    const applied = new URL(page.url())
    for (const [key, value] of Object.entries({ q: 'Sage', view: 'trending', sort: 'price-desc', page: '1', minPrice: '1.19', maxPrice: '1.69', category: 'Arte digital', network: 'Ethereum' })) {
        const parameter = applied.searchParams.get(key)
        expect(key === 'minPrice' || key === 'maxPrice' ? JSON.parse(parameter!) : parameter).toBe(value)
    }
    if (mobile) await expect(open).toBeFocused()
    await page.reload()
    await expect(catalog.locator('article')).toHaveCount(2)
    if (mobile) await open.click()
    await expect(minimum).toHaveValue('1.19')
    await expect(maximum).toHaveValue('1.69')
    await maximum.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(maximum.locator('..')).toHaveCSS('outline-style', 'solid')
    await expect(maximum).toBeFocused()
    await expect(maximum).toHaveValue('1.68')
    await catalog.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(page.getByText('Nenhum NFT encontrado. Tente outra busca.', { exact: true })).toBeVisible()
    await page.goBack()
    await expect(catalog.locator('article')).toHaveCount(2)
    if (mobile) await open.click()
    await expect(maximum).toHaveValue('1.69')
    await minimum.focus()
    await page.keyboard.press('End')
    await expect(minimum).toHaveValue('1.69')
    await page.keyboard.press('ArrowRight')
    await expect(minimum).toHaveValue('1.69')
    await catalog.getByRole('button', { name: 'Limpar', exact: true }).click()
    const cleared = new URL(page.url())
    expect(cleared.searchParams.has('minPrice')).toBe(false)
    expect(cleared.searchParams.has('maxPrice')).toBe(false)
    expect(cleared.searchParams.get('sort')).toBe('price-desc')
    expect(cleared.searchParams.get('q')).toBe('Sage')
})

test('contagens reais e categorias sem itens nos filtros', async ({ page }) => {
    await page.goto('/')
    if (page.viewportSize()!.width < 768) await page.getByRole('button', { name: 'Abrir filtros', exact: true }).click()
    const filters = page.locator('#catalog-filters')
    await expect(filters.getByRole('radio', { name: 'Arte digital', exact: true }).locator('..')).toContainText('(8)')
    await expect(filters.getByRole('radio', { name: 'Ethereum', exact: true }).locator('..')).toContainText('(8)')
    await expect(filters.getByRole('radio', { name: 'Fotografia', exact: true }).locator('..')).toContainText('(0)')
    await filters.getByRole('radio', { name: 'Fotografia', exact: true }).check()
    await filters.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(page.getByText('Nenhum NFT encontrado. Tente outra busca.', { exact: true })).toBeVisible()
})

test('MSW filtra limites inclusivos com precisão de wei e valida URLs inválidas', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo article')).toHaveCount(9)
    const totals = await page.evaluate(async () => {
        const ranges = ['minPrice=1.19&maxPrice=1.19', 'minPrice=1.190000000000000001&maxPrice=1.69', 'maxPrice=1.189999999999999999', 'minPrice=1.99', 'minPrice=2&maxPrice=1', 'minPrice=-1&maxPrice=NaN', 'minPrice=1.0000000000000000001']
        return Promise.all(ranges.map(async range => (await (await fetch(`/api/nfts?${range}`)).json()).total))
    })
    expect(totals).toEqual([6, 6, 6, 6, 18, 24, 24])
})

test('aplicar preserva limites da URL com 18 casas decimais', async ({ page }) => {
    await page.goto('/?minPrice=1.190000000000000001&maxPrice=1.69&sort=price-asc')
    const catalog = page.locator('#catalogo')
    await expect(catalog.locator('article')).toHaveCount(6)
    if (page.viewportSize()!.width < 768) await page.getByRole('button', { name: 'Abrir filtros', exact: true }).click()
    await catalog.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(catalog.locator('article')).toHaveCount(6)
    await expect(catalog.locator('.nft-card-price')).toHaveText(Array(6).fill('1.69 ETH'))
    await page.reload()
    await expect(catalog.locator('article')).toHaveCount(6)
    await expect(catalog.locator('.nft-card-price')).toHaveText(Array(6).fill('1.69 ETH'))
})

test('carregar contagens mantém seleção pendente e foco no controle', async ({ page }) => {
    await page.addInitScript(() => {
        const delayed = new WeakSet<XMLHttpRequest>()
        const open = XMLHttpRequest.prototype.open
        const send = XMLHttpRequest.prototype.send
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            if (String(url).includes('/api/nfts/facets')) delayed.add(this)
            Reflect.apply(open, this, [method, url, ...rest])
        }
        XMLHttpRequest.prototype.send = function (body) {
            if (delayed.has(this)) window.setTimeout(() => send.call(this, body), 2000)
            else send.call(this, body)
        }
    })
    await page.goto('/')
    if (page.viewportSize()!.width < 768) await page.getByRole('button', { name: 'Abrir filtros', exact: true }).click()
    const category = page.getByRole('radio', { name: 'Arte digital', exact: true })
    await expect(category.locator('..')).toContainText('(…)')
    await category.check()
    const minimum = page.getByRole('slider', { name: 'Preço mínimo em ETH', exact: true })
    await minimum.fill('0.5')
    await minimum.focus()
    await expect(category.locator('..')).toContainText('(8)')
    await expect(category).toBeChecked()
    await expect(minimum).toHaveValue('0.5')
    await expect(minimum).toBeFocused()
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
