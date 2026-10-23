import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { NftListResponse } from '@/types/nft'

export function Catalog() {
    const search = useSearch({ from: '/' })
    const navigate = useNavigate({ from: '/' })

    const { data, isPending, isError, isFetching, refetch } = useQuery({
        queryKey: ['nfts', search],
        queryFn: async ({ signal }) => {
            const response = await api.get<NftListResponse>('/nfts', {
                params: search,
                signal,
            })

            return response.data
        },
    })

    return (
        <section
            id="catalogo"
            aria-labelledby="catalog-title"
            className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-20"
        >
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <h2 id="catalog-title" className="text-lg font-bold text-primary">
                    Todos os NFTs
                </h2>

                <form
                    className="flex w-full gap-2 sm:w-auto"
                    onSubmit={(event) => {
                        event.preventDefault()

                        const form = new FormData(event.currentTarget)
                        const q = String(form.get('q') ?? '').trim()

                        void navigate({ search: { q, page: 1 } })
                    }}
                >
                    <label htmlFor="catalog-search" className="sr-only">
                        Buscar NFTs pelo nome
                    </label>

                    <Input
                        key={search.q}
                        id="catalog-search"
                        name="q"
                        type="search"
                        defaultValue={search.q}
                        placeholder="Buscar NFTs"
                        className="min-w-0"
                    />

                    <Button type="submit">Buscar</Button>
                </form>
            </div>

            <p role="status" className="mb-4 min-h-5 text-xs text-muted-foreground">
                {isPending
                    ? 'Carregando NFTs...'
                    : isFetching
                        ? 'Atualizando catálogo...'
                        : data
                            ? `${data.total} NFTs encontrados`
                            : ''}
            </p>

            {isPending && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
                    {Array.from({ length: 9 }, (_, index) => (
                        <div key={index} aria-hidden="true">
                            <div className="catalog-shimmer aspect-square rounded-2xl" />
                            <div className="catalog-shimmer mt-3 h-4 w-3/4 rounded" />
                            <div className="catalog-shimmer mt-2 h-4 w-1/2 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {isError && (
                <div role="alert" className="rounded-xl bg-card p-6">
                    <p>Não foi possível carregar os NFTs.</p>
                    <Button className="mt-4" onClick={() => void refetch()}>
                        Tentar novamente
                    </Button>
                </div>
            )}

            {data && (
                <>
                    {data.items.length === 0 ? (
                        <p className="py-12 text-muted-foreground">
                            Nenhum NFT encontrado. Tente outra busca.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
                            {data.items.map((nft) => (
                                <article key={nft.id} className="min-w-0">
                                    <div className="rounded-2xl bg-card p-2 md:rounded-none">
                                        <img
                                            src={nft.image}
                                            alt={nft.name}
                                            width={400}
                                            height={400}
                                            loading="lazy"
                                            className="aspect-square w-full rounded-xl object-cover"
                                        />
                                    </div>

                                    <h3 className="mt-3 text-sm">{nft.name}</h3>
                                    <p className="mt-1 font-bold text-primary">
                                        {nft.price} ETH
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}

                    <nav
                        aria-label="Paginação do catálogo"
                        className="mt-8 flex items-center justify-end gap-3"
                    >
                        <Button
                            variant="outline"
                            disabled={search.page <= 1}
                            onClick={() =>
                                void navigate({
                                    search: { ...search, page: search.page - 1 },
                                })
                            }
                        >
                            Anterior
                        </Button>

                        <span className="text-sm">
                            {search.page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}
                        </span>

                        <Button
                            variant="outline"
                            disabled={search.page * data.pageSize >= data.total}
                            onClick={() =>
                                void navigate({
                                    search: { ...search, page: search.page + 1 },
                                })
                            }
                        >
                            Próxima
                        </Button>
                    </nav>
                </>
            )}
        </section>
    )
}