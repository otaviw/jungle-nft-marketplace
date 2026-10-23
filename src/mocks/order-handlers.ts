import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { getSession } from './auth-store'
import { createOrder, getOrder } from './order-store'
import { QuoteError } from './quote-store'

const orderSchema = z.object({
    quoteId: z.string().min(1),
    collector: z.object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email(),
        notes: z.string().trim().max(1000),
    }),
})

function getUserId(request: Request) {
    const token = request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''

    return getSession(token)?.user.id
}

function orderFailure(error: unknown) {
    const knownError = error instanceof QuoteError

    return HttpResponse.json(
        {
            message: knownError
                ? error.message
                : 'Não foi possível processar o pedido.',
            code: knownError && error.code === 'QUOTE_REJECTED'
                ? 'ORDER_NOT_CREATED'
                : knownError
                    ? error.code
                    : 'UNKNOWN_RESULT',
        },
        {
            status: knownError ? error.status : 503,
        },
    )
}

export const orderHandlers = [
    http.post('/api/orders', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)
        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Entre novamente para continuar.' },
                { status: 401 },
            )
        }

        const key = request.headers.get('Idempotency-Key')

        if (!key || key.length < 8 || key.length > 128) {
            return HttpResponse.json(
                { message: 'Informe uma chave de idempotência válida.' },
                { status: 422 },
            )
        }

        const result = orderSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                {
                    message: 'Confira os dados do pedido.',
                    code: 'ORDER_NOT_CREATED',
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 422 },
            )
        }

        try {
            const order = createOrder(userId, key, result.data)

            if (localStorage.getItem('kurio:scenario:order-timeout') === 'true') {
                await delay(11_000)
            } else {
                await delay(300)
            }

            return HttpResponse.json(order, { status: 200 })
        } catch (error) {
            return orderFailure(error)
        }
    }),

    http.get('/api/orders/:id', async ({ request, params }) => {
        await delay(200)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        try {
            return HttpResponse.json(getOrder(userId, String(params.id)))
        } catch (error) {
            return orderFailure(error)
        }
    }),
]