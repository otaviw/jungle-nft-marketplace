import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = process.env.VISUAL_REVIEW_URL ?? 'http://127.0.0.1:4174'
const folder = `artifacts/visual-review/${process.env.VISUAL_REVIEW_OUTPUT ?? 'commerce-current'}`
const widths = process.env.VISUAL_REVIEW_WIDTHS?.split(',').map(Number) ?? [390, 414, 768, 1440]
await mkdir(folder, { recursive: true })
const browser = await chromium.launch()
const results = []
const failures = []
try {
    for (const width of widths) {
        const mobile = width < 768 && process.env.VISUAL_REVIEW_DESKTOP !== 'true'
        const context = await browser.newContext({ viewport: { width, height: Number(process.env.VISUAL_REVIEW_HEIGHT ?? 896) }, deviceScaleFactor: Number(process.env.VISUAL_REVIEW_SCALE ?? 1), isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' })
        const page = await context.newPage()
        const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
            const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('kurio:session-token')}` }, body: body === undefined ? undefined : JSON.stringify(body) })
            if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`)
            return response.status === 204 ? null : response.json()
        }, { path, method, body })
        const capture = async name => {
            if (name !== 'checkout-profile') await page.evaluate(() => window.scrollTo(0, 0))
            await page.locator('img').evaluateAll(async images => { await Promise.all(images.map(async img => { img.loading = 'eager'; await img.decode().catch(() => {}) })) })
            await page.evaluate(() => document.fonts.ready)
            if (name === 'receipt') {
                const notice = page.getByRole('button', { name: 'Fechar aviso', exact: true })
                if (await notice.isVisible()) await notice.click()
            }
            const check = await page.evaluate(() => ({
                viewport: innerWidth, clientWidth: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, scrollX,
                images: [...document.images].filter(img => img.getClientRects().length).map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 })),
                outside: [...document.querySelectorAll('main *, header *, dialog[open] *')].flatMap(element => {
                    if (!element.getClientRects().length) return []
                    const { left, right } = element.getBoundingClientRect()
                    if (left >= -1 && right <= document.documentElement.clientWidth + 1) return []
                    let parent = element.parentElement
                    while (parent && parent !== document.body) {
                        if (['hidden', 'clip', 'auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) return []
                        parent = parent.parentElement
                    }
                    return [{ tag: element.tagName, class: element.className?.baseVal ?? element.className, left, right }]
                }),
            }))
            await page.screenshot({ path: `${folder}/${name}-${width}.png`, fullPage: width >= 768, animations: 'disabled' })
            if (width < 768) await page.screenshot({ path: `${folder}/${name}-${width}-full.png`, fullPage: true, animations: 'disabled' })
            results.push({ name, width, ...check })
            if (check.content > check.clientWidth || check.outside.length || check.images.some(img => !img.loaded)) failures.push({ name, width, ...check })
            console.log(JSON.stringify({ name, width, content: check.content, outside: check.outside }))
        }
        await page.goto(`${baseURL}/login?mode=login&redirect=%2F`)
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel('E-mail', { exact: true }).fill('demo@kurio.test')
        await dialog.getByLabel('Senha', { exact: true }).fill('Kurio123!')
        await dialog.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
        await page.locator('#catalogo article').first().waitFor()
        const wallet = { name: 'Colecionador Demo', nickname: 'Principal', profileName: 'Coleção Demo', network: 'Ethereum', provider: 'MetaMask', address: '0x1111111111111111111111111111111111111111', email: 'demo@kurio.test', ens: 'demo.eth', referralCode: 'DEMO' }
        await api('/wallets/primary', 'PUT', wallet)
        await api('/wallets/secondary', 'PUT', { ...wallet, nickname: 'Reserva', network: 'Polygon', provider: 'Coinbase Wallet', address: '0x2222222222222222222222222222222222222222', ens: 'reserva.eth' })
        for (const id of width < 768 ? ['nft-001', 'nft-002', 'nft-003', 'nft-004'] : ['nft-001', 'nft-002', 'nft-003']) {
            const nft = await api(`/nfts/${id}`)
            await api('/cart/items', 'POST', { nftId: id, editionId: nft.editions[0].id, quantity: 1 })
        }
        await page.goto(`${baseURL}/cart`)
        await page.getByRole('region', { name: 'Itens do carrinho', exact: true }).waitFor()
        if (width >= 768) await page.locator('.cart-suggestions article').first().waitFor()
        await capture('cart')
        await page.goto(`${baseURL}/checkout`)
        await page.getByRole('radio', { name: /Reserva/ }).check()
        await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
        await page.getByText('Carteira conectada na simulação', { exact: true }).waitFor()
        await capture('checkout')
        if (width < 768) {
            await page.getByRole('button', { name: 'Dados do colecionador', exact: true }).click()
            await page.getByLabel('Nome de exibição', { exact: true }).focus()
            await capture('checkout-profile')
            await page.getByRole('button', { name: 'Dados do colecionador', exact: true }).click()
        }
        await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
        await page.getByRole('button', { name: 'Confirmar compra', exact: true }).waitFor()
        await capture('checkout-reviewed')
        await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
        await page.waitForURL(/\/orders\//)
        await page.getByRole('heading', { name: 'Aguardando confirmação', exact: true }).waitFor()
        await capture('receipt-pending')
        await page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }).waitFor()
        const closeNotice = page.getByRole('button', { name: 'Fechar aviso', exact: true })
        if (await closeNotice.isVisible()) await closeNotice.click()
        await capture('receipt')
        if ((width === 390 || width === 1440) && process.env.VISUAL_REVIEW_STATES !== 'false') {
            await page.goto(`${baseURL}/cart`)
            await page.getByText('Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.', { exact: true }).waitFor()
            await capture('cart-empty')
            await page.goto(`${baseURL}/checkout`)
            await page.getByText('Seu carrinho está vazio. Adicione NFTs antes de continuar.', { exact: true }).waitFor()
            await capture('checkout-empty')
            const nft = await api('/nfts/nft-001')
            await api('/cart/items', 'POST', { nftId: nft.id, editionId: nft.editions[0].id, quantity: 1 })
            await api('/scenarios/network', 'PUT', { resource: 'cart', delaysMs: [3000] })
            await page.goto(`${baseURL}/cart`)
            await page.getByText('Carregando carrinho', { exact: true }).waitFor({ state: 'attached' })
            await capture('cart-loading')
            await page.getByRole('region', { name: 'Itens do carrinho', exact: true }).waitFor()
            await api('/scenarios/network', 'PUT', { resource: 'cart', delaysMs: [100], failures: ['http-503', 'http-503'] })
            await page.reload()
            await page.getByText('Não foi possível carregar o carrinho.', { exact: true }).waitFor()
            await capture('cart-error')
            await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
            await page.getByRole('region', { name: 'Itens do carrinho', exact: true }).waitFor()
            await api('/scenarios/network', 'DELETE')
            await page.goto(`${baseURL}/checkout`)
            await page.getByRole('button', { name: 'Revisar compra', exact: true }).click()
            await page.getByRole('button', { name: 'Confirmar compra', exact: true }).waitFor()
            await page.evaluate(() => localStorage.setItem('kurio:scenario:payment', 'declined'))
            await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
            await page.getByRole('heading', { name: 'Pagamento recusado', exact: true }).waitFor()
            await capture('receipt-declined')
            await page.goto(`${baseURL}/orders/not-found`)
            await page.getByRole('heading', { name: 'Pedido não encontrado', exact: true }).waitFor()
            await capture('receipt-error')
        }
        await context.close()
    }
} finally { await browser.close() }
await writeFile(`${folder}/checks.json`, JSON.stringify(results, null, 2))
if (failures.length) { console.error(JSON.stringify(failures)); process.exitCode = 1 }
