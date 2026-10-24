import { expect, type Page } from '@playwright/test'

interface Options {
    method?: string
    body?: unknown
    token?: string | null
    status?: number
    headers?: Record<string, string>
}

// Executa no navegador para passar pelo service worker, como os controles manuais.
export async function mockApi<T = unknown>(
    page: Page,
    path: string,
    options: Options = {},
): Promise<T> {
    const result = await page.evaluate(async ({ path, options }) => {
        const token = options.token === undefined
            ? localStorage.getItem('kurio:session-token')
            : options.token
        const response = await fetch(`/api${path}`, {
            method: options.method ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
        })

        return {
            status: response.status,
            contentType: response.headers.get('Content-Type'),
            body: response.headers.get('Content-Type')?.includes('application/json')
                ? await response.json() as unknown
                : null,
        }
    }, { path, options })

    expect(result.status, `${options.method ?? 'GET'} /api${path}`)
        .toBe(options.status ?? 200)
    if (result.status !== 204) {
        expect(result.contentType, `Resposta MSW de /api${path}`).toContain('application/json')
    }

    return result.body as T
}
