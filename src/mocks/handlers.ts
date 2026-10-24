import { http, HttpResponse } from 'msw'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { ethToWei } from '@/lib/eth'
import type { CatalogFacets, NftListResponse } from '@/types/nft'
import { nfts } from './fixtures'
import { cartHandlers } from './cart-handlers'
import { authHandlers } from './auth-handlers'
import { profileHandlers } from './profile-handlers'
import { walletHandlers } from './wallet-handlers'
import { quoteHandlers } from './quote-handlers'
import { orderHandlers } from './order-handlers'
import { walletConnectionHandlers } from './wallet-connection-handlers'
import { socketHandlers } from './socket-handlers'
import { catalogScenarioHandlers } from './catalog-scenario-handlers'
import { getSession } from './auth-store'
import { favoriteHandlers, readFavorites } from './favorite-handlers'
import { reviewHandlers } from './review-handlers'
import { networkScenarioHandlers, simulateNetwork } from './network-scenarios'

export const handlers = [
    ...networkScenarioHandlers,
    ...cartHandlers,
    ...authHandlers,
    ...profileHandlers,
    ...walletHandlers,
    ...quoteHandlers,
    ...orderHandlers,
    ...walletConnectionHandlers,
    ...socketHandlers,
    ...catalogScenarioHandlers,
    ...favoriteHandlers,
    ...reviewHandlers,

    http.get('/api/nfts/facets', () => {
        const facets: CatalogFacets = { categories: {}, networks: {}, maxPrice: '0' }
        for (const nft of nfts) {
            facets.categories[nft.category] = (facets.categories[nft.category] ?? 0) + 1
            facets.networks[nft.network] = (facets.networks[nft.network] ?? 0) + 1
            if (ethToWei(nft.price) > ethToWei(facets.maxPrice)) facets.maxPrice = nft.price
        }
        return HttpResponse.json(facets)
    }),

    http.get('/api/nfts', async ({ request }) => {
        const url = new URL(request.url)

        const search = parseCatalogSearch(
            Object.fromEntries(url.searchParams),
        )

        const term = search.q.trim().toLowerCase()
        const pageSize = 9

        const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
        const user = search.favorites ? getSession(token)?.user : undefined
        if (search.favorites && !user) {
            return HttpResponse.json({ message: 'Entre na conta para consultar seus favoritos.' }, { status: 401 })
        }
        const favorites = new Set(user ? readFavorites(user.id).nftIds : [])
        // Janela relativa à fixture mais recente, independente do relógio real.
        const newest = Math.max(...nfts.map(nft => nft.listedAt))
        const minPrice = search.minPrice === undefined ? undefined : ethToWei(search.minPrice)
        const maxPrice = search.maxPrice === undefined ? undefined : ethToWei(search.maxPrice)
        const filtered = nfts.filter((nft) => {
            return (
                (!search.favorites || favorites.has(nft.id))
                && (search.view !== 'new' || nft.listedAt >= newest - 5 * 86_400_000)
                && nft.name.toLowerCase().includes(term)
                && (!search.category || nft.category === search.category)
                && (!search.network || nft.network === search.network)
                && (minPrice === undefined || ethToWei(nft.price) >= minPrice)
                && (maxPrice === undefined || ethToWei(nft.price) <= maxPrice)
            )
        })

        if (search.sort === 'recent') {
            filtered.sort((a, b) => search.view === 'trending'
                ? b.popularity - a.popularity || b.listedAt - a.listedAt
                : b.listedAt - a.listedAt)
        } else {
            filtered.sort((first, second) => {
                const firstPrice = ethToWei(first.price)
                const secondPrice = ethToWei(second.price)

                const comparison = firstPrice < secondPrice
                    ? -1
                    : firstPrice > secondPrice
                        ? 1
                        : 0

                return search.sort === 'price-asc'
                    ? comparison
                    : -comparison
            })
        }

        const failure = await simulateNetwork('catalog', 600)
        if (failure) return failure

        return HttpResponse.json<NftListResponse>({
            items: filtered.slice(
                (search.page - 1) * pageSize,
                search.page * pageSize,
            ),
            total: filtered.length,
            page: search.page,
            pageSize,
        })
    }),

    http.get('/api/nfts/:id', async ({ params }) => {
        const failure = await simulateNetwork('detail', 500)
        if (failure) return failure

        const nft = nfts.find((item) => item.id === params.id)

        if (!nft) {
            return HttpResponse.json(
                { message: 'NFT não encontrado' },
                { status: 404 },
            )
        }

        return HttpResponse.json(nft)
    }),
]
