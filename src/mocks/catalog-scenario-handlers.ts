import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { changeNftPrice } from './catalog-state'
import { ethToWei } from '@/lib/eth'
import { changeNftAvailability } from './order-store'

const availabilitySchema = z.object({
    editionId: z.string().min(1),
    available: z.number().int().min(0).max(10_000),
}).strict()

const priceSchema = z.object({
    editionId: z.string().min(1),
    price: z.string()
        .regex(/^\d+(\.\d{1,18})?$/, 'Informe um valor decimal válido.')
        .refine((value) => {
            try {
                return ethToWei(value) > 0n
            } catch {
                return false
            }
        }, 'O preço precisa ser positivo.'),
})

export const catalogScenarioHandlers = [
    http.patch('/api/scenarios/nfts/:id/availability', async ({ request, params }) => {
        const result = availabilitySchema.safeParse(await request.json().catch(() => null))
        if (!result.success) {
            return HttpResponse.json(
                { message: 'Informe edição e disponibilidade inteira entre 0 e 10000.' },
                { status: 422 },
            )
        }
        const nft = changeNftAvailability(String(params.id), result.data.editionId, result.data.available)
        if (!nft) {
            return HttpResponse.json(
                { message: 'NFT ou edição não encontrado.' },
                { status: 404 },
            )
        }
        return HttpResponse.json(nft)
    }),
    http.patch('/api/scenarios/nfts/:id/price', async ({
        request,
        params,
    }) => {
        const body: unknown = await request.json().catch(() => null)
        const result = priceSchema.safeParse(body)

        if (!result.success) {
            return HttpResponse.json(
                { message: 'Informe edição e preço válidos.' },
                { status: 422 },
            )
        }

        const nft = changeNftPrice(
            String(params.id),
            result.data.editionId,
            result.data.price,
        )

        if (!nft) {
            return HttpResponse.json(
                { message: 'NFT ou edição não encontrado.' },
                { status: 404 },
            )
        }

        return HttpResponse.json(nft)
    }),
]
