import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { sortOptions } from '@/lib/catalog-search'
import { sessionOptions } from '@/lib/session'
import type { NftListResponse } from '@/types/nft'
import { CatalogFilters } from './catalog-filters'
import { FavoriteButton } from '@/components/nft/favorite-button'

const views = [
    { value: 'all', label: 'Todos os NFTs' },
    { value: 'new', label: 'Novos lançamentos' },
    { value: 'trending', label: 'Em alta' },
] as const

export function Catalog({ filtersOpen, onCloseFilters }: { filtersOpen: boolean; onCloseFilters: () => void }) {
    const search = useSearch({ from: '/' })
    const navigate = useNavigate({ from: '/' })
    const session = useQuery(sessionOptions)
    const needsLogin = Boolean(search.favorites && session.isSuccess && !session.data)
    const { data, isPending, isError, isFetching, refetch } = useQuery({
        queryKey: search.favorites ? ['nfts', search, session.data?.user.id ?? 'guest'] : ['nfts', search],
        enabled: !search.favorites || Boolean(session.data),
        queryFn: async ({ signal }) => (await api.get<NftListResponse>('/nfts', { params: search, signal })).data,
    })
    const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

    function changeSearch(patch: Partial<typeof search>) {
        void navigate({ search: { ...search, ...patch, page: 1 }, resetScroll: false })
    }

    return <section id="catalogo" aria-labelledby="catalog-title" className="market-container catalog-layout">
        <aside className="catalog-sidebar" data-open={filtersOpen}>
            <button type="button" className="close-filters" onClick={onCloseFilters}>Fechar filtros <X size={17} aria-hidden="true" /></button>
            <CatalogFilters onApply={onCloseFilters} />
            <div className="featured-nft"><h3>NFT em destaque</h3><p>Descubra a coleção</p><Link to="/nfts/$nftId" params={{ nftId: 'nft-002' }} aria-label="Conhecer Sage Nomad"><img src="/images/nfts/sage-nomad.png" alt="Sage Nomad" width={310} height={370} loading="lazy" /></Link></div>
        </aside>
        <div className="catalog-results">
            <h2 id="catalog-title" className="sr-only">Catálogo de NFTs</h2>
            <div className="catalog-toolbar">
                <div role="tablist" aria-label="Visualização do catálogo" className="catalog-tabs" onKeyDown={event => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                    event.preventDefault()
                    const current = views.findIndex(view => view.value === search.view)
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length
                    changeSearch({ view: views[next].value, sort: 'recent' })
                    event.currentTarget.querySelector<HTMLButtonElement>(`#catalog-${views[next].value}-tab`)?.focus()
                }}>
                    {views.map(view => <button key={view.value} id={`catalog-${view.value}-tab`} type="button" role="tab" aria-selected={search.view === view.value} tabIndex={search.view === view.value ? 0 : -1} aria-controls="catalog-results-panel" onClick={() => changeSearch({ view: view.value, sort: 'recent' })}>{view.label}</button>)}
                </div>
                <div className="catalog-sort">
                    <span id="catalog-sort-label">Ordenar por</span>
                    <Select value={search.sort} items={sortOptions.map(option => ({ value: option.value, label: option.label }))} onValueChange={value => {
                        const sort = sortOptions.find(option => option.value === value)?.value
                        if (sort) changeSearch({ sort })
                    }}>
                        <SelectTrigger aria-labelledby="catalog-sort-label"><SelectValue /></SelectTrigger>
                        <SelectContent align="end">{sortOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="catalog-preferences">
                <button type="button" aria-label="Somente favoritos" aria-pressed={Boolean(search.favorites)} onClick={() => {
                    if (!session.data) {
                        void navigate({ to: '/login', search: { mode: 'login', redirect: '/?favorites=true#catalogo' } })
                    } else changeSearch({ favorites: search.favorites ? undefined : true })
                }}><Heart size={16} aria-hidden="true" fill={search.favorites ? 'currentColor' : 'none'} />Somente favoritos</button>
                <p role="status" className="catalog-status">{needsLogin ? '' : isPending ? 'Carregando NFTs...' : isFetching ? 'Atualizando catálogo...' : data ? `${data.total} NFTs encontrados` : ''}</p>
            </div>
            <div id="catalog-results-panel" role="tabpanel" aria-labelledby={`catalog-${search.view}-tab`}>
                {needsLogin ? <div className="market-error"><p>Entre na conta para consultar seus favoritos.</p><Link to="/login" search={{ mode: 'login', redirect: '/?favorites=true#catalogo' }} className="market-cta">Entrar para ver favoritos</Link></div> : <>
                    {isPending && <div className="nft-grid">{Array.from({ length: 9 }, (_, index) => <div key={index} aria-hidden="true"><div className="catalog-shimmer aspect-square rounded-2xl" /><div className="catalog-shimmer mt-3 h-4 w-3/4 rounded" /><div className="catalog-shimmer mt-2 h-4 w-1/2 rounded" /></div>)}</div>}
                    {isError && <div role="alert" className="market-error"><p>Não foi possível carregar os NFTs.</p><Button onClick={() => void refetch()}>Tentar novamente</Button></div>}
                    {data && <>
                        {data.items.length === 0 ? <p className="empty-catalog">{search.favorites ? 'Você ainda não tem favoritos com estes filtros.' : 'Nenhum NFT encontrado. Tente outra busca.'}</p> : <div className="nft-grid">{data.items.map(nft => <article key={nft.id} className="nft-card"><Link to="/nfts/$nftId" params={{ nftId: nft.id }}><div className="nft-card-art"><img src={nft.image} alt={nft.name} width={250} height={250} loading="lazy" /></div><h3>{nft.name}</h3><p className="nft-card-price">{nft.price} ETH</p></Link><div className="card-favorite"><FavoriteButton nftId={nft.id} /></div></article>)}</div>}
                        <nav aria-label="Paginação do catálogo" className="catalog-pagination"><Button variant="ghost" aria-label="Anterior" disabled={search.page <= 1} onClick={() => void navigate({ search: { ...search, page: search.page - 1 }, resetScroll: false })}><ChevronLeft aria-hidden="true" /></Button>{Array.from({ length: pages }, (_, index) => <button type="button" key={index} aria-label={`Página ${index + 1}`} aria-current={search.page === index + 1 ? 'page' : undefined} onClick={() => void navigate({ search: { ...search, page: index + 1 }, resetScroll: false })}>{index + 1}</button>)}<span className="sr-only">{search.page} / {pages}</span><Button variant="ghost" aria-label="Próxima" disabled={search.page >= pages} onClick={() => void navigate({ search: { ...search, page: search.page + 1 }, resetScroll: false })}><ChevronRight aria-hidden="true" /></Button></nav>
                    </>}
                </>}
            </div>
        </div>
    </section>
}
