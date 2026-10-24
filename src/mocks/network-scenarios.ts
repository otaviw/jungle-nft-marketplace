import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { requestMockReset } from './reset'

const storageKey = 'kurio:scenario:network'
const resourceSchema = z.enum(['catalog', 'detail', 'cart'])
const sequenceSchema = z.object({
    delaysMs: z.array(z.number().int().min(0).max(8000)).min(1).max(50).optional(),
    failures: z.array(z.enum(['network', 'http-503']).nullable()).max(50).optional(),
    cursor: z.number().int().nonnegative(),
})
const configSchema = sequenceSchema.omit({ cursor: true }).extend({
    resource: resourceSchema,
}).strict()
const stateSchema = z.record(z.string(), sequenceSchema)
type Resource = z.infer<typeof resourceSchema>

function readState(): z.infer<typeof stateSchema> {
    try {
        const result = stateSchema.safeParse(JSON.parse(localStorage.getItem(storageKey) ?? '{}'))
        return result.success ? result.data : {}
    } catch {
        return {}
    }
}

export async function simulateNetwork(resource: Resource, defaultDelay: number) {
    const state = readState()
    const sequence = state[resource]

    if (!sequence) {
        await delay(defaultDelay)
        return
    }

    // Consome antes de aguardar, preservando a ordem de chegada mesmo que
    // as respostas terminem em outra ordem ou a consulta seja cancelada.
    const step = sequence.cursor++
    localStorage.setItem(storageKey, JSON.stringify(state))
    const delays = sequence.delaysMs
    const milliseconds = delays?.[Math.min(step, delays.length - 1)] ?? defaultDelay
    const failure = sequence.failures?.[step]
    await delay(milliseconds)

    if (failure === 'network') {
        return HttpResponse.error()
    }
    if (failure === 'http-503') {
        return HttpResponse.json(
            { message: 'Indisponibilidade temporária simulada. Tente novamente.' },
            { status: 503 },
        )
    }
}

export const networkScenarioHandlers = [
    http.put('/api/scenarios/network', async ({ request }) => {
        const result = configSchema.safeParse(await request.json().catch(() => null))
        if (!result.success) {
            return HttpResponse.json(
                { message: 'Informe recurso e sequências válidas de latência/falha.' },
                { status: 422 },
            )
        }
        const { resource, ...sequence } = result.data
        const state = readState()
        state[resource] = { ...sequence, cursor: 0 }
        localStorage.setItem(storageKey, JSON.stringify(state))
        return HttpResponse.json(result.data)
    }),
    http.delete('/api/scenarios/network', () => {
        localStorage.removeItem(storageKey)
        return new HttpResponse(null, { status: 204 })
    }),
    http.post('/api/scenarios/reset', () => {
        requestMockReset()
        return HttpResponse.json({ reload: '/' })
    }),
]
