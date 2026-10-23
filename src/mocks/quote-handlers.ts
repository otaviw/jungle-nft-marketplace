import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { getSession } from './auth-store'
import {
    createQuote,
    QuoteError,
    validateQuote,
} from './quote-store'

function getUserId(request: Request) {
    const token = request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''

    return getSession(token)?.user.id
}

function quoteFailure(error: unknown) {
    if (error instanceof QuoteError) {
        return HttpResponse.json(
            { message: error.message },
            { status: error.status },
        )
    }

    return HttpResponse.json(
        { message: 'Não foi possível calcular a cotação.' },
        { status: 503 },
    )
}

export const quoteHandlers = [
    http.post('/api/quotes', async ({ request }) => {
        const body: unknown = await request.json().catch(() => null)

        await delay(400)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Entre novamente para continuar a compra.' },
                { status: 401 },
            )
        }

        const result = z.object({
            walletId: z.string().min(1),
        }).safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                { message: 'Selecione uma carteira cadastrada.' },
                { status: 422 },
            )
        }

        try {
            return HttpResponse.json(
                createQuote(userId, result.data.walletId),
                { status: 201 },
            )
        } catch (error) {
            return quoteFailure(error)
        }
    }),

    http.get('/api/quotes/:id', async ({ request, params }) => {
        await delay(200)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        try {
            return HttpResponse.json(
                validateQuote(userId, String(params.id)),
            )
        } catch (error) {
            return quoteFailure(error)
        }
    }),
]