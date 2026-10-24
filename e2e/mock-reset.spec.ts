import { test, expect } from '@playwright/test'
import { addNft, login, registerWallet, reviewCheckout } from './helpers'
import { mockApi } from './mock-api'
import type { Session } from '../src/types/auth'
import type { Profile } from '../src/types/profile'
import type { Nft, NftListResponse } from '../src/types/nft'
import type { Wallet } from '../src/lib/wallet-schema'
import type { Quote } from '../src/types/quote'

test('reset integral restaura o cenário duas vezes e preserva dados alheios', async ({ page }) => {
    await login(page)
    await mockApi(page, '/scenarios/reset', { method: 'POST' })
    await page.goto('/')
    await login(page)
    const catalog = []
    for (const number of [1, 2, 3]) {
        const result = await mockApi<NftListResponse>(page, `/nfts?page=${number}`)
        catalog.push(...result.items)
    }
    await registerWallet(page)
    await addNft(page)
    await reviewCheckout(page)
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }))
        .toBeVisible()
    const oldOrderId = new URL(page.url()).pathname.split('/').at(-1)!

    const oldTokens: string[] = []
    const oldQuotes: string[] = []
    for (const [index, email] of ['demo@kurio.test', 'outro@kurio.test'].entries()) {
        const session = await mockApi<Session>(page, '/auth/login', {
            method: 'POST', body: { email, password: 'Kurio123!' },
        })
        oldTokens.push(session.token)
        const token = session.token
        await mockApi(page, '/profile', {
            method: 'PATCH', token,
            body: { name: 'Nome alterado', displayName: 'Perfil alterado', email: `alterado-${index}@kurio.test`, ens: 'alterado.eth', walletNickname: 'Alterada' },
        })
        await mockApi(page, '/profile/password', {
            method: 'POST', token, status: 204,
            body: { currentPassword: 'Kurio123!', newPassword: 'Alterada456!', confirmation: 'Alterada456!' },
        })
        const avatar = await page.evaluate(async (token) => {
            const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII='), char => char.charCodeAt(0))
            const form = new FormData()
            form.append('avatar', new File([png], 'avatar.png', { type: 'image/png' }))
            const response = await fetch('/api/profile/avatar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
            return { status: response.status, profile: await response.json() as Profile }
        }, token)
        expect(avatar.status).toBe(200)
        expect(avatar.profile.avatar).toMatch(/^data:image\/png;base64,/)
        await mockApi(page, '/favorites/nft-001', { method: 'PUT', token })
        await mockApi(page, '/cart/items', {
            method: 'POST', token, body: { nftId: 'nft-002', editionId: 'standard', quantity: 1 },
        })
        const wallet = await mockApi<Wallet>(page, '/wallets/secondary', {
            method: 'PUT', token,
            body: { name: 'Carteira alterada', nickname: 'Teste', profileName: 'Perfil alterado', email, network: 'Ethereum', provider: 'MetaMask', address: `0x${String(index + 2).repeat(40)}`, ens: '', referralCode: '' },
        })
        const quote = await mockApi<Quote>(page, '/quotes', {
            method: 'POST', token, status: 201, body: { walletId: wallet.id },
        })
        oldQuotes.push(quote.id)
    }
    await mockApi(page, '/auth/register', {
        method: 'POST', status: 201,
        body: { name: 'Conta extra', email: 'extra@kurio.test', password: 'Extra123!' },
    })
    await mockApi(page, '/cart/items', {
        method: 'POST', token: null, body: { nftId: 'nft-003', editionId: 'standard', quantity: 1 },
    })
    await mockApi(page, '/cart/coupon', { method: 'POST', token: null, body: { code: 'KURIO10' } })
    await mockApi(page, '/scenarios/nfts/nft-001/price', {
        method: 'PATCH', body: { editionId: 'standard', price: '9.25' },
    })
    const restocked = await mockApi<Nft>(page, '/scenarios/nfts/nft-001/availability', {
        method: 'PATCH', body: { editionId: 'standard', available: 3 },
    })
    expect(restocked.editions[0].available).toBe(3)
    await mockApi(page, '/scenarios/nfts/nft-001/availability', {
        method: 'PATCH', body: { editionId: 'standard', available: 0 },
    })
    await mockApi(page, '/scenarios/network', {
        method: 'PUT', body: { resource: 'detail', delaysMs: [700], failures: ['http-503'] },
    })
    await page.evaluate(() => {
        for (const flag of ['favorite-failure', 'connection', 'payment', 'order-timeout', 'pause-catalog-events']) {
            localStorage.setItem(`kurio:scenario:${flag}`, 'true')
        }
        // Preserva uma tentativa incerta, além do draft criado pelo checkout.
        localStorage.setItem('kurio:order-attempt:incerta', '{"key":"tentativa-incerta"}')
        localStorage.setItem('outro-projeto:preferencia', 'manter-local')
        sessionStorage.setItem('outro-projeto:preferencia', 'manter-sessao')
    })

    for (const pass of [1, 2]) {
        // A requisição começa antes da limpeza e só grava depois da resposta
        // do reset. O bootstrap deve descartar também essa escrita tardia.
        const registrationStarted = page.waitForRequest(request =>
            new URL(request.url()).pathname === '/api/auth/register',
        )
        const lateRegistration = mockApi(page, '/auth/register', {
            method: 'POST', status: 201,
            body: { name: 'Conta tardia', email: 'tardia@kurio.test', password: 'Tardia123!' },
        })
        await registrationStarted
        const reset = await mockApi<{ reload: string }>(page, '/scenarios/reset', { method: 'POST' })
        expect(reset.reload).toBe('/')
        await lateRegistration
        await page.goto(reset.reload)
        await expect(page.getByText('24 NFTs encontrados', { exact: true })).toBeVisible()

        const storage = await page.evaluate(() => ({
            localKeys: Object.keys(localStorage).filter(key => key.startsWith('kurio:')).sort(),
            sessionKeys: Object.keys(sessionStorage).filter(key => key.startsWith('kurio:')),
            database: JSON.parse(localStorage.getItem('kurio:auth-db:v1')!) as { users: Array<{ email: string }>; sessions: Record<string, unknown> },
            localOther: localStorage.getItem('outro-projeto:preferencia'),
            sessionOther: sessionStorage.getItem('outro-projeto:preferencia'),
        }))
        expect(storage.localKeys, `reset ${pass}`).toEqual(['kurio:auth-db:v1', 'kurio:catalog-versions:v1'])
        expect(storage.sessionKeys).toEqual([])
        expect(storage.database.users.map(user => user.email).sort()).toEqual(['demo@kurio.test', 'outro@kurio.test'])
        expect(storage.database.sessions).toEqual({})
        expect(storage.localOther).toBe('manter-local')
        expect(storage.sessionOther).toBe('manter-sessao')
        const restoredCatalog = []
        for (const number of [1, 2, 3]) {
            restoredCatalog.push(...(await mockApi<NftListResponse>(page, `/nfts?page=${number}`, { token: null })).items)
        }
        expect(restoredCatalog).toEqual(catalog)
        for (const token of oldTokens) {
            await mockApi(page, '/auth/session', { token, status: 401 })
        }
        for (const [index, email] of ['demo@kurio.test', 'outro@kurio.test'].entries()) {
            const session = await mockApi<Session>(page, '/auth/login', {
                method: 'POST', body: { email, password: 'Kurio123!' },
            })
            expect(session.user.name).toBe(index === 0 ? 'Colecionador Demo' : 'Outro Colecionador')
            const token = session.token
            const profile = await mockApi<Profile>(page, '/profile', { token })
            expect(profile).toEqual({ id: session.user.id, name: session.user.name, displayName: session.user.name, email, ens: '', walletNickname: '', avatar: null })
            expect(await mockApi(page, '/favorites', { token })).toEqual({ nftIds: [] })
            expect(await mockApi(page, '/wallets', { token })).toEqual([])
            expect(await mockApi(page, '/wallet-connection', { token })).toBeNull()
            expect(await mockApi(page, '/cart', { token })).toMatchObject({ items: [], lines: [], total: '0' })
            await mockApi(page, `/quotes/${oldQuotes[index]}`, { token, status: 404 })
            await mockApi(page, `/orders/${oldOrderId}`, { token, status: 404 })
            await mockApi(page, '/auth/login', {
                method: 'POST', status: 401, body: { email, password: 'Alterada456!' },
            })
        }
        expect(await mockApi(page, '/cart', { token: null })).toMatchObject({ items: [], lines: [], total: '0' })
        await mockApi(page, '/auth/login', {
            method: 'POST', status: 401, body: { email: 'extra@kurio.test', password: 'Extra123!' },
        })
        const privateSubscriptions = await page.evaluate(() => {
            const detail = { action: 'probe', scope: 'order', handled: 0 }
            window.dispatchEvent(new CustomEvent('kurio:scenario:realtime', { detail }))
            return detail.handled
        })
        expect(privateSubscriptions).toBe(0)
    }
})
