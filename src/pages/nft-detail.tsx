import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { api } from '@/lib/api'
import type { Nft } from '@/types/nft'
import { PurchaseOptions } from '@/components/nft/purchase-options'
import { FavoriteButton } from '@/components/nft/favorite-button'

export function NftDetailPage() {
    const { nftId } = useParams({ from: '/nfts/$nftId' })

    const { data: nft, isPending, isError, error, refetch } = useQuery({
        queryKey: ['nft', nftId],
        queryFn: async ({ signal }) => {
            const response = await api.get<Nft>(
                `/nfts/${encodeURIComponent(nftId)}`,
                { signal },
            )

            return response.data
        },
    })

    const notFound = axios.isAxiosError(error)
        && error.response?.status === 404

    return (
        <>
            <Header />

            <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
                <Link
                    to="/"
                    search={parseCatalogSearch({})}
                    className="inline-block text-sm text-muted-foreground underline underline-offset-4"
                >
                    Voltar ao catálogo
                </Link>

                {isPending && (
                    <div role="status" className="mt-8">
                        <span className="sr-only">Carregando detalhes do NFT</span>

                        <div
                            aria-hidden="true"
                            className="grid gap-8 md:grid-cols-2"
                        >
                            <div className="catalog-shimmer aspect-square rounded-2xl" />

                            <div className="space-y-5">
                                <div className="catalog-shimmer h-9 w-3/4 rounded" />
                                <div className="catalog-shimmer h-5 w-1/2 rounded" />
                                <div className="catalog-shimmer h-24 rounded" />
                            </div>
                        </div>
                    </div>
                )}

                {isError && (
                    <section role="alert" className="mt-8 rounded-xl bg-card p-6">
                        <h1 className="text-xl font-bold">
                            {notFound
                                ? 'NFT não encontrado'
                                : 'Não foi possível carregar este NFT'}
                        </h1>

                        <p className="mt-3 text-muted-foreground">
                            {notFound
                                ? 'Este endereço não corresponde a um NFT disponível.'
                                : 'Verifique sua conexão e tente novamente.'}
                        </p>

                        {!notFound && (
                            <Button className="mt-5" onClick={() => void refetch()}>
                                Tentar novamente
                            </Button>
                        )}
                    </section>
                )}

                {nft && (
                    <article className="mt-8 grid items-start gap-8 md:grid-cols-2 md:gap-12">
                        <img
                            src={nft.image}
                            alt={nft.name}
                            width={600}
                            height={600}
                            fetchPriority="high"
                            className="aspect-square w-full rounded-2xl object-cover"
                        />

                        <div>
                            <p className="text-sm text-muted-foreground">
                                {nft.category}
                            </p>

                            <div className="mt-3 flex items-start justify-between gap-4">
                                <h1 className="text-3xl font-bold">{nft.name}</h1>
                                <FavoriteButton nftId={nft.id} />
                            </div>

                            <dl className="mt-8 space-y-5">
                                <div>
                                    <dt className="text-sm text-muted-foreground">
                                        Preço
                                    </dt>
                                    <dd className="mt-1 text-2xl font-bold text-primary">
                                        {nft.price} ETH
                                    </dd>
                                </div>

                                <div>
                                    <dt className="text-sm text-muted-foreground">
                                        Rede
                                    </dt>
                                    <dd className="mt-1">{nft.network}</dd>
                                </div>
                            </dl>

                            <PurchaseOptions key={nft.id} nft={nft} />
                        </div>
                    </article>
                )}
            </main>
        </>
    )
}