import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { parseCatalogSearch } from '@/lib/catalog-search'
import type { NftListResponse } from '@/types/nft'
import { Button } from '@/components/ui/button'

export function CartSuggestions({ exclude }: { exclude: string[] }) {
    const search = parseCatalogSearch({})
    const catalog = useQuery({ queryKey: ['nfts', search], queryFn: async ({ signal }) => (await api.get<NftListResponse>('/nfts', { params: search, signal })).data })
    return <section className="cart-suggestions" aria-labelledby="suggestions-title"><h2 id="suggestions-title">Explore também</h2>
        {catalog.isPending && <div role="status" aria-label="Carregando sugestões" className="catalog-shimmer h-48 rounded-xl" />}
        {catalog.isError && <div role="alert"><p>Não foi possível carregar as sugestões.</p><Button onClick={() => void catalog.refetch()}>Tentar novamente</Button></div>}
        <div className="related-grid">{catalog.data?.items.filter(item => !exclude.includes(item.id)).slice(0, 5).map(item => <article className="nft-card" key={item.id}><Link to="/nfts/$nftId" params={{ nftId: item.id }}><div className="nft-card-art"><img src={item.image} alt={item.name} width={250} height={250} loading="lazy" /></div><h3>{item.name}</h3><p className="nft-card-price">{item.price} ETH</p></Link></article>)}</div>
    </section>
}
