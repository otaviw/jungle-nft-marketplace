import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { z } from 'zod'
import { getSession } from './auth-store'
import { getOrder } from './order-store'
import { syncCatalogState } from './catalog-state'
import { nfts } from './fixtures'

const socketLink = ws.link(
    /wss?:\/\/[^/]+\/socket\.io\/.*$/,
)

const authenticationSchema = z.object({
    token: z.string().min(1),
})

const subscriptionSchema = z.object({
    orderId: z.string().min(1),
})

export const socketHandlers = [
    socketLink.addEventListener('connection', (connection) => {
        const { client, rawClient } = toSocketIo(connection)

        let token = ''
        let orderId: string | null = null
        let lastVersion = -1
        let lastPing = Date.now()
        let catalogSubscribed = false
        const catalogVersions = new Map<string, number>()

        client.on('session.subscribe', (_event, payload: unknown) => {
            const result = authenticationSchema.safeParse(payload)

            if (!result.success) {
                return
            }

            const session = getSession(result.data.token)

            if (!session) {
                client.emit('session.expired', {})
                return
            }

            token = result.data.token
            orderId = null
            lastVersion = -1

            client.emit('session.ready', { userId: session.user.id })
        })

        client.on('order.subscribe', (_event, payload: unknown) => {
            const result = subscriptionSchema.safeParse(payload)

            if (!getSession(token) || !result.success) {
                return
            }

            orderId = result.data.orderId
            lastVersion = -1
        })

        client.on('catalog.subscribe', () => {
            syncCatalogState()

            catalogSubscribed = true
            catalogVersions.clear()

            for (const nft of nfts) {
                catalogVersions.set(nft.id, nft.version)
            }

            client.emit('catalog.ready', {})
        })

        const timer = setInterval(() => {
            if (Date.now() - lastPing >= 20_000) {
                rawClient.send('2')
                lastPing = Date.now()
            }

            if (catalogSubscribed) {
                syncCatalogState()

                for (const nft of nfts) {
                    const knownVersion = catalogVersions.get(nft.id) ?? 0

                    if (nft.version <= knownVersion) {
                        continue
                    }

                    catalogVersions.set(nft.id, nft.version)

                    client.emit('nft.updated', {
                        id: `nft:${nft.id}:${nft.version}`,
                        resourceId: nft.id,
                        version: nft.version,
                    })
                }
            }

            if (!token) {
                return
            }

            const session = getSession(token)

            if (!session) {
                client.emit('session.expired', {})
                token = ''
                orderId = null
                return
            }

            if (!orderId) {
                return
            }

            try {
                const order = getOrder(session.user.id, orderId)

                if (order.version <= lastVersion) {
                    return
                }

                lastVersion = order.version

                client.emit('order.updated', {
                    id: `order:${order.id}:${order.version}`,
                    resourceId: order.id,
                    version: order.version,
                    userId: session.user.id,
                })
            } catch {
                client.emit('realtime.error', {
                    message: 'Não foi possível acompanhar este pedido.',
                })

                orderId = null
            }
        }, 500)

        rawClient.addEventListener('close', () => {
            clearInterval(timer)
            token = ''
            orderId = null
        })
    }),
]