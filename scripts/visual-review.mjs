import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = process.env.VISUAL_REVIEW_URL ?? 'http://127.0.0.1:4174'
const output = `artifacts/visual-review/${process.env.VISUAL_REVIEW_OUTPUT ?? (process.argv.includes('--before') ? 'before' : 'current')}`
const widths = process.env.VISUAL_REVIEW_WIDTHS?.split(',').map(Number) ?? [390, 768, 1440]
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const results = []
try {
    for (const width of widths) {
        for (const [name, path, heading] of [
            ['home', '/', 'Todos os NFTs'],
            ['detail', '/nfts/nft-001', 'Emerald Ape #001'],
        ]) {
            const context = await browser.newContext({ viewport: { width, height: 896 }, reducedMotion: 'reduce' })
            const page = await context.newPage()
            await page.goto(`${baseURL}${path}`)
            await page.getByRole('heading', { name: heading, exact: true }).waitFor()
            if (name === 'home') await page.locator('#catalogo article').first().waitFor()
            else await page.locator('.related-grid article').first().waitFor()
            const images = await page.locator('img').evaluateAll(async elements => {
                await Promise.all(elements.map(async img => {
                    img.loading = 'eager'
                    await img.decode().catch(() => {})
                }))
                return elements.map(img => ({ source: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 }))
            })
            await page.evaluate(() => document.fonts.ready)
            const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
            const layout = await page.evaluate(() => Object.fromEntries(
                ['.market-hero', '.hero-copy h1', '.catalog-layout', '.featured-nft', '.nft-card-art', '.mobile-navigation', '.nft-gallery', '.nft-information', '.purchase-submit', '.nft-detail-description', '.related-nfts', '.marketplace-footer'].flatMap(selector => {
                    const element = document.querySelector(selector)
                    if (!element || !element.getClientRects().length) return []
                    const { x, y, width, height } = element.getBoundingClientRect()
                    return [[selector, { x, y, width, height }]]
                }),
            ))
            await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: width >= 768, animations: 'disabled' })
            if (width < 768) await page.screenshot({ path: `${output}/${name}-${width}-full.png`, fullPage: true, animations: 'disabled' })
            const result = { page: name, width, ...dimensions, images, layout }
            results.push(result)
            console.log(JSON.stringify({ page: name, width, ...dimensions, loadedImages: images.filter(img => img.loaded).length, totalImages: images.length }))
            await context.close()
        }
    }
} finally {
    await browser.close()
}
await writeFile(`${output}/checks.json`, JSON.stringify(results, null, 2))
if (results.some(result => result.content > result.viewport || result.images.some(img => !img.loaded))) process.exitCode = 1
