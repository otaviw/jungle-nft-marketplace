import { http, HttpResponse } from 'msw'
import type { NftReviewsResponse } from '@/types/review'
import { nftReviews } from './review-fixtures'

export const reviewHandlers = [
    http.get('/api/nfts/:nftId/reviews', ({ params }) => {
        const id = String(params.nftId)
        if (!Object.hasOwn(nftReviews, id)) {
            return HttpResponse.json({ message: 'NFT não encontrado' }, { status: 404 })
        }
        const items = nftReviews[id]
        const total = items.length
        const sum = items.reduce((value, review) => value + review.rating, 0)
        return HttpResponse.json<NftReviewsResponse>({
            items,
            total,
            average: total ? Math.round(sum / total * 10) / 10 : 0,
        })
    }),
]
