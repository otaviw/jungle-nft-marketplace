import { redirect } from '@tanstack/react-router'
import { queryClient } from './query-client'
import { sessionOptions } from './session'

export async function requireSession(destination: string) {
    const session = await queryClient.fetchQuery(sessionOptions)

    if (!session) {
        throw redirect({
            to: '/login',
            search: {
                mode: 'login',
                redirect: destination,
            },
        })
    }

    return session
}