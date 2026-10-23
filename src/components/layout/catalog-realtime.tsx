import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { z } from 'zod'
import { getAuthToken } from '@/lib/auth-token'
import { sessionOptions } from '@/lib/session'

const nftEventSchema = z.object({
    id: z.string(),
    resourceId: z.string(),
    version: z.number().int().positive(),
})

export function CatalogRealtime() {
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const userId = session.data?.user.id
    const token = session.data?.token ?? null
    const [message, setMessage] = useState('')

    useEffect(() => {
        let active = true
        let socket: Socket | undefined
        const versions = new Map<string, number>()

        function isCurrentSession() {
            return active && getAuthToken() === token
        }

        function reconcile() {
            void queryClient.invalidateQueries({ queryKey: ['nfts'] })
            void queryClient.invalidateQueries({ queryKey: ['nft'] })
            void queryClient.invalidateQueries({
                queryKey: ['cart', userId ?? 'guest'],
            })
        }

        async function start() {
            const { io } = await import('socket.io-client')

            if (!active) {
                return
            }

            const client = io(window.location.origin, {
                transports: ['websocket'],
                autoConnect: false,
                forceNew: true,
            })

            socket = client

            client.on('connect', () => {
                if (isCurrentSession()) {
                    client.emit('catalog.subscribe')
                }
            })

            client.on('catalog.ready', () => {
                if (isCurrentSession()) {
                    reconcile()
                }
            })

            client.on('nft.updated', (payload: unknown) => {
                const result = nftEventSchema.safeParse(payload)

                if (!isCurrentSession() || !result.success) {
                    return
                }

                const event = result.data
                const knownVersion = versions.get(event.resourceId) ?? 0

                if (event.version <= knownVersion) {
                    return
                }

                versions.set(event.resourceId, event.version)

                reconcile()

                // Marcador observado pelo checkout.
                queryClient.setQueryData(['catalog-change'], event.id)

                setMessage(
                    'Preço ou disponibilidade atualizado. Revise os valores antes de comprar.',
                )
            })

            client.connect()
        }

        void start().catch(() => {
            if (active) {
                setMessage('Atualizações em tempo real temporariamente indisponíveis.')
            }
        })

        return () => {
            active = false
            socket?.removeAllListeners()
            socket?.disconnect()
        }
    }, [queryClient, token, userId])

    if (!message) {
        return null
    }

    return (
        <div
            role="status"
            className="fixed right-4 bottom-24 left-4 z-50 mx-auto max-w-lg rounded-xl border border-border bg-card p-4 text-sm shadow-lg"
        >
            <p>{message}</p>
            <button
                type="button"
                className="mt-2 text-primary underline"
                onClick={() => setMessage('')}
            >
                Fechar aviso
            </button>
        </div>
    )
}