import axios from 'axios'
import { queryOptions } from '@tanstack/react-query'
import { api } from './api'
import { clearAuthToken, getAuthToken, setAuthToken } from './auth-token'
import { queryClient } from './query-client'
import type { Session } from '@/types/auth'

export const sessionOptions = queryOptions({
    queryKey: ['session'],
    queryFn: async ({ signal }): Promise<Session | null> => {
        if (!getAuthToken()) {
            return null
        }

        try {
            const response = await api.get<Session>('/auth/session', { signal })

            return response.data
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                clearAuthToken()
                return null
            }

            throw error
        }
    },
    staleTime: 0,
    retry: false,
    refetchInterval: 30_000,
})

function removePrivateQueries() {
    const privateKeys = new Set([
        'cart',
        'profile',
        'wallets',
        'wallet-connection',
        'favorites',
        'orders',
    ])

    queryClient.removeQueries({
        predicate: (query) => privateKeys.has(String(query.queryKey[0]))
            || (query.queryKey[0] === 'nfts'
                && Boolean((query.queryKey[1] as { favorites?: boolean })?.favorites)),
    })
}

export async function acceptSession(session: Session) {
    await queryClient.cancelQueries()

    removePrivateQueries()

    setAuthToken(session.token)

    // Preserva a consulta e notifica seus observadores.
    queryClient.setQueryData(['session'], session)
}

export async function logout() {
    const previousToken = getAuthToken()

    await api.post('/auth/logout')

    if (getAuthToken() !== previousToken) {
        return
    }

    clearAuthToken()

    await queryClient.cancelQueries()

    if (getAuthToken()) {
        return
    }

    removePrivateQueries()
    queryClient.setQueryData(['session'], null)
}

export async function expireClientSession(expectedToken: string) {
    if (getAuthToken() !== expectedToken) {
        return false
    }

    clearAuthToken()

    await queryClient.cancelQueries()

    if (getAuthToken()) {
        return false
    }

    removePrivateQueries()
    queryClient.setQueryData(['session'], null)

    return true
}