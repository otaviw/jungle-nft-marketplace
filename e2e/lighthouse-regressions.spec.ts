import { test, expect } from '@playwright/test'

test('skeleton reserva a posição e a dimensão da galeria nos breakpoints', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Matriz de breakpoints executada uma vez')
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 })
        await page.addInitScript(() => {
            localStorage.setItem('kurio:scenario:network', JSON.stringify({ detail: { cursor: 0, delaysMs: [1200] } }))
            const shifts: unknown[] = []
            Object.assign(window, { layoutShifts: shifts })
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number; sources: { node?: Element; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] }
                    if (!shift.hadRecentInput) shifts.push({ time: entry.startTime, value: shift.value, sources: shift.sources.map(source => ({ node: source.node?.outerHTML.slice(0, 300), previous: source.previousRect.toJSON(), current: source.currentRect.toJSON() })) })
                }
            }).observe({ type: 'layout-shift', buffered: true })
        })
        await page.goto('/nfts/nft-001')
        const skeleton = page.locator('.detail-skeleton .gallery-stage, .detail-skeleton .aspect-square').first()
        await expect(skeleton).toBeVisible()
        const before = await skeleton.boundingBox()
        await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #001' })).toBeVisible()
        await expect(page.locator('.nft-review-summary')).toContainText('19 avaliações')
        const after = await page.locator('.nft-gallery .gallery-stage').boundingBox()
        const shifts = await page.evaluate(() => (window as unknown as { layoutShifts: { value: number }[] }).layoutShifts)
        await testInfo.attach(`layout-${width}`, { body: JSON.stringify({ before, after, shifts }, null, 2), contentType: 'application/json' })
        expect(before).not.toBeNull()
        expect(after).not.toBeNull()
        expect.soft(Math.abs(before!.y - after!.y), `posição vertical em ${width}`).toBeLessThanOrEqual(1)
        expect.soft(Math.abs(before!.width - after!.width), `largura em ${width}`).toBeLessThanOrEqual(1)
        expect.soft(Math.abs(before!.height - after!.height), `altura em ${width}`).toBeLessThanOrEqual(1)
        expect.soft(shifts.reduce((total, shift) => total + shift.value, 0), `CLS em ${width}`).toBeLessThan(0.1)
    }
})

test('hero pausa por controle, mantém troca manual e respeita movimento reduzido', async ({ page }) => {
    await page.goto('/')
    const hero = page.locator('.market-hero')
    const image = hero.locator('.hero-art > img').first()
    const pause = hero.locator('button.hero-pause')
    await expect(pause).toHaveAccessibleName('Pausar destaques')
    await expect(pause).toHaveCSS('opacity', '0')
    const initialBox = await hero.boundingBox()
    await page.clock.install()
    await hero.getByRole('button', { name: 'Ver destaque 3', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(pause).toBeFocused()
    await expect(pause).toHaveCSS('opacity', '1')
    expect(await hero.boundingBox()).toEqual(initialBox)
    await page.keyboard.press('Enter')
    await expect(hero.getByRole('button', { name: 'Retomar destaques', exact: true })).toBeFocused()
    await page.clock.runFor(6000)
    await expect(image).toHaveAttribute('src', '/images/nfts/emerald-ape.png')
    await hero.getByRole('button', { name: 'Ver destaque 3', exact: true }).click()
    await expect(pause).toHaveCSS('opacity', '0')
    await expect(image).toHaveAttribute('src', '/images/nfts/neon-vessel.png')
    await page.clock.runFor(6000)
    await expect(image).toHaveAttribute('src', '/images/nfts/neon-vessel.png')
    await hero.getByRole('button', { name: 'Ver destaque 3', exact: true }).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await page.clock.runFor(5100)
    await expect(image).toHaveAttribute('src', '/images/nfts/emerald-ape.png')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Media-query change notifications are asynchronous in Chromium. Wait for
    // the component to observe the preference before advancing virtual time.
    await expect(pause).toBeDisabled()
    await page.clock.runFor(6000)
    await expect(image).toHaveAttribute('src', '/images/nfts/emerald-ape.png')
    await hero.getByRole('button', { name: 'Ver destaque 2', exact: true }).click()
    await expect(image).toHaveAttribute('src', '/images/nfts/sage-nomad.png')
})

test('pontinhos têm área de toque e relacionados navegam por teclado e resize', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    for (const button of await page.locator('.hero-pagination button').all()) {
        const box = await button.boundingBox()
        expect(box!.width).toBeGreaterThanOrEqual(24)
        expect(box!.height).toBeGreaterThanOrEqual(24)
    }
    await expect(page.locator('.social-list')).toHaveRole('group')
    await page.goto('/nfts/nft-001')
    await page.setViewportSize({ width: 390, height: 844 })
    const carousel = page.getByRole('group', { name: 'NFTs da mesma coleção', exact: true })
    const track = carousel.getByRole('group', { name: 'Use as setas para navegar entre os NFTs', exact: true })
    await expect(carousel.locator('article')).toHaveCount(7)
    await track.focus()
    await page.keyboard.press('End')
    await expect(carousel.getByRole('status')).toHaveText('Página 4 de 4.')
    await page.keyboard.press('Home')
    await expect(carousel.getByRole('status')).toHaveText('Página 1 de 4.')
    await page.keyboard.press('ArrowRight')
    await expect(carousel.getByRole('status')).toHaveText('Página 2 de 4.')
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(carousel.getByRole('status')).toHaveText('Página 1 de 2.')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(carousel.getByRole('status')).toHaveText('Página 1 de 4.')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('coleção lenta reserva também legendas e paginação dos relacionados', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Matriz de breakpoints executada uma vez')
    await page.addInitScript(() => localStorage.setItem('kurio:scenario:network', JSON.stringify({ catalog: { cursor: 0, delaysMs: [1500] } })))
    for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 })
        await page.goto('/nfts/nft-001')
        const placeholder = page.getByRole('status', { name: 'Carregando coleção', exact: true })
        await placeholder.scrollIntoViewIfNeeded()
        const before = await placeholder.boundingBox()
        const carousel = page.getByRole('group', { name: 'NFTs da mesma coleção', exact: true })
        await expect(carousel).toBeVisible()
        const after = await carousel.boundingBox()
        expect.soft(Math.abs(before!.height - after!.height), `altura dos relacionados em ${width}`).toBeLessThanOrEqual(2)
    }
})
