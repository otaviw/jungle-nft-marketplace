import { useEffect } from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { sessionOptions } from '@/lib/session'
import { parseCatalogSearch } from '@/lib/catalog-search'
import {
    clearOrderAttempt,
    readOrderAttempt,
} from '@/lib/order-attempt'
import type { Order } from '@/types/order'

export function OrderPage() {
    const { orderId } = useParams({ from: '/orders/$orderId' })
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const userId = session.data?.user.id

    const order = useQuery({
        queryKey: ['orders', userId, orderId],
        enabled: Boolean(userId),
        queryFn: async ({ signal }) => {
            const response = await api.get<Order>(
                `/orders/${encodeURIComponent(orderId)}`,
                { signal },
            )

            return response.data
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'pending' ? 1000 : false
        },
    })

    const status = order.data?.status

    useEffect(() => {
        if (!userId || !status || status === 'pending') {
            return
        }

        try {
            const attempt = readOrderAttempt(userId)

            // Uma página antiga não pode apagar outra tentativa em andamento.
            if (attempt?.orderId === orderId) {
                clearOrderAttempt(userId)
            }
        } catch {
            // Não alteramos um registro que não conseguimos interpretar.
        }

        void queryClient.invalidateQueries({ queryKey: ['cart', userId] })
        void queryClient.invalidateQueries({ queryKey: ['nfts'] })
        void queryClient.invalidateQueries({ queryKey: ['nft'] })
    }, [orderId, queryClient, status, userId])

    const notFound = axios.isAxiosError(order.error)
        && order.error.response?.status === 404

    return (
        <>
            <Header />

            <main className="mx-auto max-w-2xl px-5 py-10">
                {order.isPending && (
                    <div role="status">
                        <span className="sr-only">Consultando pedido</span>
                        <div
                            aria-hidden="true"
                            className="catalog-shimmer h-96 rounded-2xl"
                        />
                    </div>
                )}

                {order.isError && (
                    <section role="alert" className="rounded-xl bg-card p-6">
                        <h1 className="text-xl font-bold">
                            {notFound
                                ? 'Pedido não encontrado'
                                : 'Não foi possível consultar o pedido'}
                        </h1>

                        <p className="mt-3 text-sm text-muted-foreground">
                            Nenhuma nova compra será criada ao tentar consultar novamente.
                        </p>

                        {!notFound && (
                            <Button
                                className="mt-5"
                                onClick={() => void order.refetch()}
                            >
                                Consultar novamente
                            </Button>
                        )}
                    </section>
                )}

                {order.data && (
                    <section className="rounded-2xl border-b-4 border-primary bg-card p-6 md:p-8">
                        <div role="status" aria-live="polite">
                            <h1 className="text-center text-xl font-bold">
                                {status === 'confirmed'
                                    ? 'Seus NFTs agora estão na sua carteira'
                                    : status === 'declined'
                                        ? 'Pagamento recusado'
                                        : 'Aguardando confirmação'}
                            </h1>

                            {status === 'pending' && (
                                <p className="mt-4 text-center text-sm text-muted-foreground">
                                    Estamos consultando o resultado da simulação.
                                    Você pode atualizar esta página sem criar outra compra.
                                </p>
                            )}

                            {status === 'declined' && (
                                <p className="mt-4 text-center text-sm">
                                    {order.data.rejectionReason}
                                    {' '}Os itens desta tentativa não foram removidos do carrinho.
                                </p>
                            )}
                        </div>

                        <p className="mt-6 break-all text-xs text-muted-foreground">
                            Pedido: {order.data.id}
                        </p>

                        {status === 'confirmed' && (
                            <>
                                <dl className="mt-5 grid gap-4 border-y border-border py-4 text-xs sm:grid-cols-2">
                                    <div>
                                        <dt className="text-muted-foreground">Transação simulada</dt>
                                        <dd className="mt-1 break-all">
                                            {order.data.transactionId}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-muted-foreground">Data</dt>
                                        <dd className="mt-1">
                                            {new Date(order.data.updatedAt).toLocaleString('pt-BR')}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-muted-foreground">Carteira</dt>
                                        <dd className="mt-1">
                                            {order.data.snapshot.wallet.nickname}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="text-muted-foreground">Rede</dt>
                                        <dd className="mt-1">
                                            {order.data.snapshot.wallet.network}
                                        </dd>
                                    </div>
                                </dl>

                                <h2 className="mt-6 font-bold">Detalhes da transação</h2>

                                <ul className="mt-4 space-y-4">
                                    {order.data.snapshot.cart.lines.map((item) => (
                                        <li
                                            key={`${item.nftId}:${item.editionId}`}
                                            className="flex items-center gap-3"
                                        >
                                            <img
                                                src={item.image}
                                                alt=""
                                                width={56}
                                                height={56}
                                                className="size-14 rounded-lg object-cover"
                                            />

                                            <div className="min-w-0 flex-1 text-sm">
                                                <p>{item.name}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {item.editionName} × {item.quantity}
                                                </p>
                                            </div>

                                            <span className="text-sm text-primary">
                                                {item.subtotal} ETH
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt>Subtotal</dt>
                                        <dd>{order.data.snapshot.cart.subtotal} ETH</dd>
                                    </div>

                                    <div className="flex justify-between gap-4">
                                        <dt>Desconto</dt>
                                        <dd>− {order.data.snapshot.cart.discount} ETH</dd>
                                    </div>

                                    <div className="flex justify-between gap-4">
                                        <dt>Taxa de rede</dt>
                                        <dd>{order.data.snapshot.cart.networkFee} ETH</dd>
                                    </div>

                                    <div className="flex justify-between gap-4 font-bold">
                                        <dt>Total</dt>
                                        <dd className="text-primary">
                                            {order.data.snapshot.cart.total} ETH
                                        </dd>
                                    </div>
                                </dl>

                                <p className="mt-5 text-xs text-muted-foreground">
                                    Compra e transação simuladas. Nenhum ativo foi transferido
                                    em uma blockchain real.
                                </p>
                            </>
                        )}

                        <div className="mt-8 flex flex-wrap justify-center gap-5 text-sm">
                            <Link
                                to="/"
                                search={parseCatalogSearch({})}
                                className="text-primary underline"
                            >
                                Explorar NFTs
                            </Link>

                            <Link to="/cart" className="text-primary underline">
                                Ver carrinho
                            </Link>
                        </div>
                    </section>
                )}
            </main>
        </>
    )
}