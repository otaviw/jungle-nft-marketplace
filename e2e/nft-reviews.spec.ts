import { test, expect } from '@playwright/test'

test('avaliações MSW têm notas, autores, datas e resumo coerentes por NFT', async ({ page }) => {
    await page.goto('/nfts/nft-001')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await page.evaluate(async () => {
        return Promise.all(['nft-001', 'nft-002', 'inexistente'].map(async id => {
            const response = await fetch(`/api/nfts/${id}/reviews`)
            const json = response.headers.get('content-type')?.includes('application/json')
            return { status: response.status, data: response.ok && json ? await response.json() : null }
        }))
    })
    expect(results.map(result => result.status)).toEqual([200, 200, 404])
    const main = results[0].data
    expect(main.total).toBe(19)
    expect(main.average).toBe(4.8)
    expect(main.items).toHaveLength(19)
    expect(main.items.filter((review: { rating: number }) => review.rating === 5)).toHaveLength(15)
    expect(main.items.filter((review: { rating: number }) => review.rating === 4)).toHaveLength(4)
    expect(new Set(main.items.map((review: { id: string }) => review.id)).size).toBe(19)
    for (const result of results.slice(0, 2)) {
        const data = result.data
        expect(data.total).toBe(data.items.length)
        const sum = data.items.reduce((total: number, review: { rating: number }) => total + review.rating, 0)
        expect(data.average).toBe(Math.round(sum / data.total * 10) / 10)
        for (const review of data.items) {
            expect(review.author.trim().length).toBeGreaterThan(0)
            expect(review.comment.trim().length).toBeGreaterThan(20)
            expect(review.date).toMatch(/^2026-10-\d{2}$/)
            expect([1, 2, 3, 4, 5]).toContain(review.rating)
        }
    }
    expect(results[1].data.total).toBe(3)
    expect(results[1].data.average).toBe(4.3)
})

test('selo e resumo refletem comentários abertos por clique e persistem no refresh', async ({ page }) => {
    await page.goto('/nfts/nft-001')
    const ratingName = 'Média de 4,8 de 5 estrelas, 19 avaliações de colecionadores'
    const badge = page.locator('.nft-title-row').getByRole('img', { name: ratingName, exact: true })
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('4,8')
    await expect(badge).toContainText('(19)')
    await expect(page.locator('.nft-review-summary').getByRole('img', { name: ratingName, exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Comentários de colecionadores', exact: true })).toHaveCount(0)
    await page.getByRole('tab', { name: 'Avaliações de colecionadores', exact: true }).click()
    const panel = page.getByRole('tabpanel', { name: 'Avaliações de colecionadores', exact: true })
    const comments = panel.getByRole('list', { name: 'Comentários de colecionadores', exact: true })
    await expect(comments.getByRole('listitem')).toHaveCount(19)
    await expect(comments.getByRole('heading', { name: 'Lia Aurora', exact: true })).toBeVisible()
    await expect(comments.locator('time').first()).toHaveAttribute('datetime', '2026-10-20')
    await expect(comments.locator('time').first()).toHaveText('20/10/2026')
    await expect(comments.getByText('As cores esmeralda e os detalhes da obra ficaram incríveis na minha coleção.', { exact: true })).toBeVisible()
    await expect(comments.getByRole('img', { name: '5 de 5 estrelas', exact: true })).toHaveCount(15)
    await expect(comments.getByRole('img', { name: '4 de 5 estrelas', exact: true })).toHaveCount(4)
    await expect(panel.getByRole('textbox')).toHaveCount(0)
    await expect(page.locator('.nft-review-stars:not([aria-hidden="true"])')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.reload()
    await expect(badge).toBeVisible()
})

test('abas abrem comentários por teclado e outro NFT mantém suas próprias avaliações', async ({ page }) => {
    await page.goto('/nfts/nft-002')
    await expect(page.locator('.nft-title-row').getByRole('img', { name: 'Média de 4,3 de 5 estrelas, 3 avaliações de colecionadores', exact: true })).toBeVisible()
    const details = page.getByRole('tab', { name: 'Detalhes do NFT', exact: true })
    const reviews = page.getByRole('tab', { name: 'Avaliações de colecionadores', exact: true })
    await details.focus()
    await page.keyboard.press('ArrowRight')
    await expect(reviews).toBeFocused()
    await expect(reviews).toHaveAttribute('aria-selected', 'true')
    await expect(reviews).toHaveAttribute('tabindex', '0')
    const panel = page.getByRole('tabpanel', { name: 'Avaliações de colecionadores', exact: true })
    await expect(panel.getByRole('listitem')).toHaveCount(3)
    await expect(panel.getByRole('img', { name: '4 de 5 estrelas', exact: true })).toHaveCount(2)
    await page.keyboard.press('Home')
    await expect(details).toBeFocused()
    await expect(page.getByRole('list', { name: 'Comentários de colecionadores', exact: true })).toHaveCount(0)
    await page.keyboard.press('End')
    await expect(reviews).toBeFocused()
    await expect(panel.getByRole('listitem')).toHaveCount(3)
    await page.keyboard.press('ArrowLeft')
    await expect(details).toBeFocused()
    await expect(details).toHaveAttribute('aria-selected', 'true')
})
