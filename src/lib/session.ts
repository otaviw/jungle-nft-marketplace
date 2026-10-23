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

export async function acceptSession(session: Session) {
    await queryClient.cancelQueries()
    queryClient.clear()

    setAuthToken(session.token)
    queryClient.setQueryData(['session'], session)
}

export async function logout() {
    await api.post('/auth/logout')

    await queryClient.cancelQueries()
    queryClient.clear()

    clearAuthToken()
    queryClient.setQueryData(['session'], null)
}

export async function expireClientSession(expectedToken: string) {
    if (getAuthToken() !== expectedToken) {
        return false
    }

    clearAuthToken()

    const privateKeys = new Set([
        'session',
        'cart',
        'profile',
        'wallets',
        'wallet-connection',
        'favorites',
        'orders',
    ])

    await queryClient.cancelQueries({
        predicate: (query) => privateKeys.has(String(query.queryKey[0])),
    })

    if (getAuthToken()) {
        return false
    }

    queryClient.removeQueries({
        predicate: (query) => privateKeys.has(String(query.queryKey[0])),
    })

    queryClient.setQueryData(['session'], null)

    return true
}