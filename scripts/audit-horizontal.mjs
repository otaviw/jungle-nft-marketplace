import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const browser = await chromium.launch({ executablePath: process.env.VISUAL_REVIEW_BROWSER })
const baseURL = process.env.VISUAL_REVIEW_URL ?? 'http://127.0.0.1:4174'
const results = []
const output = `artifacts/visual-review/${process.env.VISUAL_REVIEW_OUTPUT ?? 'horizontal-audit'}`
await mkdir(output, { recursive: true })
try {
    for (const width of [390, 414, 768]) {
        const page = await browser.newPage({ viewport: { width, height: 896 }, isMobile: width < 768, hasTouch: true })
        const inspect = async state => {
            const beforeURL = page.url()
            const client = await page.context().newCDPSession(page)
            if (width < 768 && ['home', 'detail-image-dialog'].includes(state)) {
                await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width - 30, y: 300 }] })
                for (const x of [Math.round(width / 2), 30]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 300 }] })
                await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
            }
            await page.evaluate(() => window.scrollTo(10000, window.scrollY))
            const result = await page.evaluate(({ state, width }) => ({
            state, width, document: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, body: document.body.scrollWidth, url: location.href,
            bodyWidth: getComputedStyle(document.body).width, bodyPadding: getComputedStyle(document.body).padding, bodyOverflow: getComputedStyle(document.body).overflow,
            scrollX, visualViewportWidth: visualViewport?.width,
            outside: [...document.querySelectorAll('body *')].flatMap(element => {
                if (!element.getClientRects().length) return []
                const rect = element.getBoundingClientRect()
                if (rect.right <= document.documentElement.clientWidth + 1 && rect.left >= -1) return []
                let parent = element.parentElement
                while (parent && parent !== document.body) {
                    if (['hidden', 'clip', 'auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) return []
                    parent = parent.parentElement
                }
                return [{ tag: element.tagName, class: element.className?.baseVal ?? element.className, left: rect.left, right: rect.right, text: element.textContent?.slice(0, 80) }]
            }),
        }), { state, width })
            results.push({ ...result, beforeURL })
            console.log(JSON.stringify(result))
            await client.detach()
        }
        await page.goto(`${baseURL}/`)
        await page.getByRole('heading', { name: 'Todos os NFTs', exact: true }).waitFor()
        await page.locator('#catalogo article').first().waitFor()
        await inspect('home')
        if (width < 768) {
            await page.getByRole('button', { name: 'Abrir filtros', exact: true }).click()
            await inspect('home-filters')
            await page.getByRole('button', { name: 'Abrir conta', exact: true }).click()
            await inspect('home-account-dialog')
        } else {
            await page.getByRole('button', { name: 'Abrir busca', exact: true }).click()
            await inspect('home-search')
        }
        await page.goto(`${baseURL}/nfts/nft-001`)
        await page.getByRole('heading', { name: 'Emerald Ape #001', exact: true }).waitFor()
        await inspect('detail')
        await page.getByRole('button', { name: 'Ampliar imagem do NFT', exact: true }).click()
        await inspect('detail-image-dialog')
        if (width < 768) {
            await page.getByRole('button', { name: 'Ver detalhe do rosto', exact: true }).click()
            await inspect('detail-crop-dialog')
        }
        await page.keyboard.press('Escape')
        await page.goto(`${baseURL}/login?mode=register&redirect=%2F`)
        await page.getByRole('dialog').waitFor()
        await inspect('registration-dialog')
        await page.goto(`${baseURL}/login?mode=login&redirect=%2F`)
        await page.getByRole('dialog').waitFor()
        await inspect('login-dialog')
        await page.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test')
        await page.getByLabel('Senha', { exact: true }).fill('Kurio123!')
        await page.getByRole('dialog').locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
        await page.waitForURL(url => !url.pathname.includes('login'))
        await page.locator('#catalogo article').first().waitFor()
        await inspect('home-authenticated')
        await page.goto(`${baseURL}/`)
        await page.locator('#catalogo article').first().waitFor()
        await page.evaluate(async () => {
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}` }
            await fetch('/api/wallets/primary', { method: 'PUT', headers, body: JSON.stringify({ name: 'Demo', nickname: 'Principal de teste', profileName: 'Colecionador Demo', network: 'Ethereum', provider: 'MetaMask', address: '0x1111111111111111111111111111111111111111', email: 'demo@kurio.test', ens: '', referralCode: '' }) })
            const nft = await (await fetch('/api/nfts/nft-001')).json()
            await fetch('/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId: nft.id, editionId: nft.editions[0].id, quantity: 1 }) })
        })
        for (const route of ['/cart', '/checkout', '/profile', '/wallets']) {
            await page.goto(`${baseURL}${route}`)
            if (route === '/checkout') await page.getByRole('radio').first().waitFor()
            else if (route === '/cart') await page.locator('.cart-summary').waitFor()
            else await page.locator('main h1').waitFor()
            await inspect(route)
            if (route === '/checkout' && width < 768) {
                await page.getByRole('button', { name: 'Dados do colecionador', exact: true }).click()
                await page.getByLabel('Nome de exibição', { exact: true }).focus()
                await inspect('checkout-profile-open')
                await page.locator('.checkout-mobile-items summary').click()
                await inspect('checkout-summary-open')
            }
        }
        await page.close()
    }
    await writeFile(`${output}/checks.json`, JSON.stringify({ browser: await browser.version(), results }, null, 2))
    if (results.some(result => result.document > result.clientWidth || result.scrollX || result.outside.length)) process.exitCode = 1
} finally {
    await writeFile(`${output}/checks.json`, JSON.stringify({ browser: await browser.version(), results }, null, 2))
    await browser.close()
}
