import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '@/lib/api'
import type { NftReviewsResponse } from '@/types/review'
import './nft-reviews.css'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
const ratingFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function ReviewStars({ rating }: { rating: number }) {
    return <span className="nft-review-stars" aria-hidden="true">
        <span>★★★★★</span><span className="nft-review-stars-fill" style={{ width: `${rating / 5 * 100}%` }}>★★★★★</span>
    </span>
}

export function NftReviews({ nftId, variant }: { nftId: string; variant: 'badge' | 'summary' | 'comments' }) {
    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ['nft-reviews', nftId],
        queryFn: async ({ signal }) => (await api.get<NftReviewsResponse>(`/nfts/${encodeURIComponent(nftId)}/reviews`, { signal })).data,
        // Read-only demonstration data; all three views share one cached response.
        staleTime: Infinity,
    })
    if (isPending) return variant === 'badge' ? null : <p className="nft-review-state" role="status">Carregando avaliações...</p>
    if (isError) return variant === 'badge' ? null : <div className="nft-review-state" role="alert">
        <p>Não foi possível carregar as avaliações.</p><button type="button" onClick={() => void refetch()}>Tentar novamente</button>
    </div>
    if (!data || data.total === 0) return variant === 'badge' ? null : <p className="nft-review-state">Ainda não há avaliações de colecionadores para este NFT.</p>

    const average = ratingFormat.format(data.average)
    const count = `${data.total} ${data.total === 1 ? 'avaliação' : 'avaliações'} de colecionadores`
    const accessibleSummary = `Média de ${average} de 5 estrelas, ${count}`

    if (variant === 'badge') return <span className="nft-review-badge" role="img" aria-label={accessibleSummary}>
        <Star size={12} fill="currentColor" aria-hidden="true" />
        <span aria-hidden="true">{average}<span className="nft-review-badge-count">({data.total})</span></span>
    </span>

    if (variant === 'summary') return <div className="nft-review-summary">
        <span role="img" aria-label={accessibleSummary}><ReviewStars rating={data.average} /><span aria-hidden="true">{count}</span></span>
    </div>

    return <div className="nft-review-comments">
        <p className="nft-review-demo">Avaliações de demonstração de colecionadores fictícios.</p>
        <ul className="nft-review-list" aria-label="Comentários de colecionadores">{data.items.map(review => <li key={review.id}>
            <article className="nft-review-card" aria-labelledby={`${review.id}-author`}>
                <header><h3 id={`${review.id}-author`}>{review.author}</h3><time dateTime={review.date}>{dateFormat.format(new Date(`${review.date}T00:00:00Z`))}</time></header>
                <span className="nft-review-score" role="img" aria-label={`${review.rating} de 5 estrelas`}><ReviewStars rating={review.rating} /></span>
                <p className="nft-review-comment">{review.comment}</p>
            </article>
        </li>)}</ul>
    </div>
}
