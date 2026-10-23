import axios from 'axios'
import { getAuthToken } from './auth-token'

export const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
})

api.interceptors.request.use((config) => {
    const token = getAuthToken()

    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            const url = error.config?.url ?? ''
            const authenticationRequest =
                url === '/auth/login' || url === '/auth/register'

            const authorization = error.config?.headers?.Authorization

            if (!authenticationRequest && typeof authorization === 'string') {
                window.dispatchEvent(
                    new CustomEvent('kurio:unauthorized', {
                        detail: {
                            token: authorization.replace(/^Bearer /, ''),
                        },
                    }),
                )
            }
        }

        return Promise.reject(error)
    },
)