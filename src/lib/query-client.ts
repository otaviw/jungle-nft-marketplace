import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status

                    if (status && status >= 400 && status < 500) {
                        return false
                    }
                }

                return failureCount < 1
            },
        },
        mutations: {
            retry: false,
        },
    },
})