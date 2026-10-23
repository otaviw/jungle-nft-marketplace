import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { expireClientSession } from '@/lib/session'

export function SessionMonitor() {
    const router = useRouter()

    useEffect(() => {
        let active = true

        async function handleUnauthorized(event: Event) {
            if (!(event instanceof CustomEvent)) {
                return
            }

            const detail: unknown = event.detail

            if (
                !detail
                || typeof detail !== 'object'
                || !('token' in detail)
                || typeof detail.token !== 'string'
            ) {
                return
            }

            const expired = await expireClientSession(detail.token)

            if (!active || !expired) {
                return
            }

            const pathname = router.state.location.pathname

            const privatePage =
                pathname === '/profile'
                || pathname === '/wallets'
                || pathname === '/checkout'
                || pathname.startsWith('/orders/')

            if (privatePage) {
                await router.navigate({
                    to: '/login',
                    search: {
                        mode: 'login',
                        redirect: pathname,
                    },
                })
            }
        }

        function listener(event: Event) {
            void handleUnauthorized(event).catch((error: unknown) => {
                console.error('Não foi possível encerrar a sessão expirada.', error)
            })
        }

        function handleStorage(event: StorageEvent) {
            if (
                event.key === 'kurio:session-token'
                && event.oldValue !== event.newValue
            ) {
                window.location.reload()
            }
        }

        window.addEventListener('kurio:unauthorized', listener)
        window.addEventListener('storage', handleStorage)

        return () => {
            active = false
            window.removeEventListener('kurio:unauthorized', listener)
            window.removeEventListener('storage', handleStorage)
        }
    }, [router])

    return null
}