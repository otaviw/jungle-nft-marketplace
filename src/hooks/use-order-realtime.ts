import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { z } from 'zod'
import { getAuthToken } from '@/lib/auth-token'
import type { Order } from '@/types/order'

const readySchema = z.object({
    userId: z.string(),
})

const orderEventSchema = z.object({
    id: z.string(),
    resourceId: z.string(),
    version: z.number().int().positive(),
    userId: z.string(),
})

export function useOrderRealtime(
    userId: string | undefined,
    orderId: string,
) {
    const queryClient = useQueryClient()
    const token = getAuthToken()
    const [message, setMessage] = useState('Conectando ao acompanhamento...')

    useEffect(() => {
        if (!userId || !token) {
            return
        }

        let active = true
        let socket: Socket | undefined
        let lastVersion = 0
        const key = ['orders', userId, orderId]

        function isCurrentSession() {
            return active && getAuthToken() === token
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
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
            })

            socket = client

            client.on('connect', () => {
                if (isCurrentSession()) {
                    client.emit('session.subscribe', { token })
                }
            })

            client.on('session.ready', (payload: unknown) => {
                const result = readySchema.safeParse(payload)

                if (
                    !isCurrentSession()
                    || !result.success
                    || result.data.userId !== userId
                ) {
                    return
                }

                setMessage('Acompanhamento em tempo real conectado.')

                void queryClient.invalidateQueries({ queryKey: key })
                client.emit('order.subscribe', { orderId })
            })

            client.on('order.updated', (payload: unknown) => {
                const result = orderEventSchema.safeParse(payload)

                if (!isCurrentSession() || !result.success) {
                    return
                }

                const event = result.data

                if (event.userId !== userId || event.resourceId !== orderId) {
                    return
                }

                const cached = queryClient.getQueryData<Order>(key)
                const knownVersion = Math.max(lastVersion, cached?.version ?? 0)

                if (event.version <= knownVersion) {
                    return
                }

                lastVersion = event.version

                void queryClient.invalidateQueries({ queryKey: key })
                void queryClient.invalidateQueries({
                    queryKey: ['cart', userId],
                })
                void queryClient.invalidateQueries({ queryKey: ['nfts'] })
                void queryClient.invalidateQueries({ queryKey: ['nft'] })

                setMessage('Atualização do pedido recebida em tempo real.')
            })

            client.on('disconnect', () => {
                if (isCurrentSession()) {
                    setMessage('Conexão interrompida. Tentando reconectar.')
                }
            })

            client.on('connect_error', () => {
                if (isCurrentSession()) {
                    setMessage('Tempo real indisponível. Tentando reconectar.')
                }
            })

            client.on('session.expired', () => {
                if (!isCurrentSession()) {
                    return
                }

                setMessage('Sua sessão expirou. Entre novamente.')
                void queryClient.invalidateQueries({ queryKey: ['session'] })
                client.disconnect()
            })

            client.on('realtime.error', () => {
                if (isCurrentSession()) {
                    setMessage('Não foi possível acompanhar este pedido em tempo real.')
                }
            })

            client.connect()
        }

        void start().catch(() => {
            if (active) {
                setMessage('Não foi possível iniciar o acompanhamento em tempo real.')
            }
        })

        return () => {
            active = false
            socket?.removeAllListeners()
            socket?.disconnect()
        }
    }, [orderId, queryClient, token, userId])

    return message
}