import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { sortOptions } from '@/lib/catalog-search'
import type { NftListResponse } from '@/types/nft'
import { CatalogFilters } from './catalog-filters'
import { FavoriteButton } from '@/components/nft/favorite-button'

export function Catalog({ filtersOpen, onCloseFilters }: { filtersOpen: boolean; onCloseFilters: () => void }) {
    const search = useSearch({ from: '/' })
    const navigate = useNavigate({ from: '/' })
    const { data, isPending, isError, isFetching, refetch } = useQuery({
        queryKey: ['nfts', search],
        queryFn: async ({ signal }) => (await api.get<NftListResponse>('/nfts', { params: search, signal })).data,
    })
    const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
    return (
        <section id="catalogo" aria-labelledby="catalog-title" className="market-container catalog-layout">
            <aside className="catalog-sidebar" data-open={filtersOpen}>
                <button type="button" className="close-filters" onClick={onCloseFilters}>Fechar filtros <X size={17} /></button>
                <CatalogFilters onApply={onCloseFilters} />
                <div className="featured-nft"><h3>NFT em destaque</h3><p>Descubra a coleção</p><Link to="/nfts/$nftId" params={{ nftId: 'nft-002' }} aria-label="Conhecer Sage Nomad"><img src="/images/nfts/sage-nomad.png" alt="Sage Nomad" width={310} height={370} loading="lazy" /></Link></div>
            </aside>
            <div className="catalog-results">
                <div className="catalog-toolbar"><div className="catalog-tabs"><h2 id="catalog-title">Todos os NFTs</h2><span title="Datas de lançamento não disponíveis na simulação" aria-disabled="true">Novos lançamentos</span><span title="Ranking de popularidade não disponível na simulação" aria-disabled="true">Em alta</span></div><label className="catalog-sort"><span id="catalog-sort-label">Ordenar por</span><span aria-hidden="true">:</span><select key={search.sort} aria-labelledby="catalog-sort-label" name="sort" form="catalog-filters" defaultValue={search.sort}>{sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
                <p role="status" className="catalog-status">{isPending ? 'Carregando NFTs...' : isFetching ? 'Atualizando catálogo...' : data ? `${data.total} NFTs encontrados` : ''}</p>
                {isPending && <div className="nft-grid">{Array.from({ length: 9 }, (_, index) => <div key={index} aria-hidden="true"><div className="catalog-shimmer aspect-square rounded-2xl" /><div className="catalog-shimmer mt-3 h-4 w-3/4 rounded" /><div className="catalog-shimmer mt-2 h-4 w-1/2 rounded" /></div>)}</div>}
                {isError && <div role="alert" className="market-error"><p>Não foi possível carregar os NFTs.</p><Button onClick={() => void refetch()}>Tentar novamente</Button></div>}
                {data && <>
                    {data.items.length === 0 ? <p className="empty-catalog">Nenhum NFT encontrado. Tente outra busca.</p> : <div className="nft-grid">{data.items.map(nft => <article key={nft.id} className="nft-card"><Link to="/nfts/$nftId" params={{ nftId: nft.id }}><div className="nft-card-art"><img src={nft.image} alt={nft.name} width={250} height={250} loading="lazy" /></div><h3>{nft.name}</h3><p className="nft-card-price">{nft.price} ETH</p></Link><div className="card-favorite"><FavoriteButton nftId={nft.id} /></div></article>)}</div>}
                    <nav aria-label="Paginação do catálogo" className="catalog-pagination"><Button variant="ghost" aria-label="Anterior" disabled={search.page <= 1} onClick={() => void navigate({ search: { ...search, page: search.page - 1 } })}><ChevronLeft aria-hidden="true" /></Button>{Array.from({ length: pages }, (_, index) => <button type="button" key={index} aria-label={`Página ${index + 1}`} aria-current={search.page === index + 1 ? 'page' : undefined} onClick={() => void navigate({ search: { ...search, page: index + 1 } })}>{index + 1}</button>)}<span className="sr-only">{search.page} / {pages}</span><Button variant="ghost" aria-label="Próxima" disabled={search.page >= pages} onClick={() => void navigate({ search: { ...search, page: search.page + 1 } })}><ChevronRight aria-hidden="true" /></Button></nav>
                </>}
            </div>
        </section>
    )
}
