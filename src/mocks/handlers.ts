import { http, HttpResponse } from 'msw'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { ethToWei } from '@/lib/eth'
import type { NftListResponse } from '@/types/nft'
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
import { favoriteHandlers } from './favorite-handlers'
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

    http.get('/api/nfts', async ({ request }) => {
        const url = new URL(request.url)

        const search = parseCatalogSearch(
            Object.fromEntries(url.searchParams),
        )

        const term = search.q.trim().toLowerCase()
        const pageSize = 9

        const filtered = nfts.filter((nft) => {
            return (
                nft.name.toLowerCase().includes(term)
                && (!search.category || nft.category === search.category)
                && (!search.network || nft.network === search.network)
            )
        })

        if (search.sort !== 'recent') {
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
