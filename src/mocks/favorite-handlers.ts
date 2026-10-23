import { delay, http, HttpResponse } from 'msw'
import type { Favorites } from '@/types/favorites'
import { getSession } from './auth-store'
import { nfts } from './fixtures'

function getUserId(request: Request) {
    const token = request.headers.get('Authorization')
        ?.replace(/^Bearer /, '') ?? ''

    return getSession(token)?.user.id
}

function storageKey(userId: string) {
    return `kurio:favorites:${userId}`
}

function readFavorites(userId: string): Favorites {
    const stored = localStorage.getItem(storageKey(userId))

    return stored ? JSON.parse(stored) as Favorites : { nftIds: [] }
}

function updateFavorite(request: Request, nftId: string, favorite: boolean) {
    const userId = getUserId(request)

    if (!userId) {
        return HttpResponse.json(
            { message: 'Entre na conta para gerenciar seus favoritos.' },
            { status: 401 },
        )
    }

    if (!nfts.some((nft) => nft.id === nftId)) {
        return HttpResponse.json(
            { message: 'NFT não encontrado.' },
            { status: 404 },
        )
    }

    // Falha única e reproduzível para testar o rollback.
    if (localStorage.getItem('kurio:scenario:favorite-failure') === 'true') {
        localStorage.removeItem('kurio:scenario:favorite-failure')

        return HttpResponse.json(
            { message: 'Falha simulada ao salvar favorito. Tente novamente.' },
            { status: 503 },
        )
    }

    const current = readFavorites(userId)
    const ids = new Set(current.nftIds)

    if (favorite) {
        ids.add(nftId)
    } else {
        ids.delete(nftId)
    }

    const updated: Favorites = { nftIds: [...ids] }

    localStorage.setItem(storageKey(userId), JSON.stringify(updated))

    return HttpResponse.json(updated)
}

export const favoriteHandlers = [
    http.get('/api/favorites', async ({ request }) => {
        await delay(200)

        const userId = getUserId(request)

        if (!userId) {
            return HttpResponse.json(
                { message: 'Sua sessão expirou.' },
                { status: 401 },
            )
        }

        return HttpResponse.json(readFavorites(userId))
    }),

    http.put('/api/favorites/:id', async ({ request, params }) => {
        await delay(700)

        return updateFavorite(request, String(params.id), true)
    }),

    http.delete('/api/favorites/:id', async ({ request, params }) => {
        await delay(700)

        return updateFavorite(request, String(params.id), false)
    }),
]