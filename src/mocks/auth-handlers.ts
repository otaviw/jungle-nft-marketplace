import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
    checkCredentials,
    createSession,
    createUser,
    getSession,
    removeSession,
} from './auth-store'
import { mergeGuestCart } from './cart-store'

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(128),
})

const registerSchema = loginSchema.extend({
    name: z.string().trim().min(2).max(80),
    password: z.string().min(8).max(128),
})

function getToken(request: Request) {
    return request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''
}

export const authHandlers = [
    http.post('/api/auth/register', async ({ request }) => {
        await delay(400)

        const body: unknown = await request.json().catch(() => null)
        const result = registerSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                {
                    message: 'Confira os dados do cadastro.',
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 422 },
            )
        }

        const user = await createUser(result.data)

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'Já existe uma conta com este e-mail.',
                    errors: { email: ['Este e-mail já está cadastrado.'] },
                },
                { status: 409 },
            )
        }

        mergeGuestCart(user.id)

        return HttpResponse.json(createSession(user), { status: 201 })
    }),

    http.post('/api/auth/login', async ({ request }) => {
        await delay(400)

        const body: unknown = await request.json().catch(() => null)
        const result = loginSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                {
                    message: 'Informe um e-mail válido e sua senha.',
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 422 },
            )
        }

        const user = await checkCredentials(
            result.data.email,
            result.data.password,
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'E-mail ou senha incorretos.' },
                { status: 401 },
            )
        }

        mergeGuestCart(user.id)

        return HttpResponse.json(createSession(user))
    }),

    http.get('/api/auth/session', ({ request }) => {
        const session = getSession(getToken(request))

        if (!session) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou ou não está autenticada.' },
                { status: 401 },
            )
        }

        return HttpResponse.json(session)
    }),

    http.post('/api/auth/logout', ({ request }) => {
        removeSession(getToken(request))

        return new HttpResponse(null, { status: 204 })
    }),

    http.post('/api/auth/expire', ({ request }) => {
        removeSession(getToken(request))

        return new HttpResponse(null, { status: 204 })
    }),
]