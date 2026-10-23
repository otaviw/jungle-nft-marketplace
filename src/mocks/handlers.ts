import { delay, http, HttpResponse } from 'msw'
import type { NftListResponse } from '@/types/nft'
import { nfts } from './fixtures'

export const handlers = [
  http.get('/api/nfts', async ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const requestedPage = Number(url.searchParams.get('page') ?? 1)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1
    const pageSize = 9

    const filtered = nfts.filter((nft) =>
      nft.name.toLowerCase().includes(search),
    )

    await delay(600)

    return HttpResponse.json<NftListResponse>({
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    })
  }),
]