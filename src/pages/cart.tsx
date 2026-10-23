import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { parseCatalogSearch } from '@/lib/catalog-search'
import type { CartLine, CartView } from '@/types/cart'
import { sessionOptions } from '@/lib/session'

type CartAction =
    | { type: 'quantity'; item: CartLine; quantity: number }
    | { type: 'remove'; item: CartLine }
    | { type: 'coupon'; code: string }

export function CartPage() {
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const cartKey = ['cart', session.data?.user.id ?? 'guest']

    const cart = useQuery({
        queryKey: cartKey,
        enabled: session.isSuccess,
        queryFn: async ({ signal }) => {
            const response = await api.get<CartView>('/cart', { signal })

            return response.data
        },
    })

    const update = useMutation({
        mutationFn: async (action: CartAction) => {
            if (action.type === 'coupon') {
                await api.post('/cart/coupon', { code: action.code })
                return
            }

            const path = `/cart/items/${encodeURIComponent(action.item.nftId)}/${encodeURIComponent(action.item.editionId)}`

            if (action.type === 'remove') {
                await api.delete(path)
            } else {
                await api.patch(path, { quantity: action.quantity })
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: cartKey,
            })
        },
    })

    const message = axios.isAxiosError<{ message?: string }>(update.error)
        ? update.error.response?.data?.message ?? 'Não foi possível atualizar.'
        : 'Não foi possível atualizar.'

    return (
        <>
            <Header />

            <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
                <Link
                    to="/"
                    search={parseCatalogSearch({})}
                    className="text-sm text-muted-foreground underline"
                >
                    Continuar explorando
                </Link>

                <h1 className="mt-6 text-2xl font-bold">Carrinho de NFTs</h1>

                {session.isError && (
                    <div role="alert" className="mt-6">
                        <p>Não foi possível verificar sua sessão.</p>
                        <Button onClick={() => void session.refetch()}>
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {(session.isPending || (session.isSuccess && cart.isPending)) && (
                    <div role="status" className="mt-8 grid gap-6 md:grid-cols-3">
                        <span className="sr-only">Carregando carrinho</span>
                        <div
                            aria-hidden="true"
                            className="catalog-shimmer h-64 rounded-xl md:col-span-2"
                        />
                        <div
                            aria-hidden="true"
                            className="catalog-shimmer h-64 rounded-xl"
                        />
                    </div>
                )}

                {cart.isError && (
                    <div role="alert" className="mt-8">
                        <p>Não foi possível carregar o carrinho.</p>
                        <Button
                            className="mt-4"
                            onClick={() => void cart.refetch()}
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {cart.data && cart.data.items.length === 0 && (
                    <p role="status" className="py-12 text-muted-foreground">
                        Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.
                    </p>
                )}

                {cart.data && cart.data.items.length > 0 && (
                    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
                        <section aria-label="Itens do carrinho" className="space-y-4">
                            {cart.data.lines.map((item) => (
                                <article
                                    key={`${item.nftId}:${item.editionId}`}
                                    className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-3"
                                >
                                    <Link
                                        to="/nfts/$nftId"
                                        params={{ nftId: item.nftId }}
                                        aria-label={`Ver ${item.name}`}
                                    >
                                        <img
                                            src={item.image}
                                            alt=""
                                            width={96}
                                            height={96}
                                            className="size-20 rounded-xl object-cover md:size-24"
                                        />
                                    </Link>

                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-sm font-bold">{item.name}</h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {item.editionName}
                                        </p>
                                        <p className="mt-2 font-bold text-primary">
                                            {item.subtotal} ETH
                                        </p>

                                        {item.quantity > item.available && (
                                            <p className="mt-2 text-xs">
                                                Disponibilidade alterada: {item.available} unidades.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={update.isPending || item.quantity <= 1}
                                            aria-label={`Diminuir quantidade de ${item.name}`}
                                            onClick={() => update.mutate({
                                                type: 'quantity',
                                                item,
                                                quantity: item.quantity - 1,
                                            })}
                                        >
                                            <Minus size={14} />
                                        </Button>

                                        <span aria-label={`Quantidade: ${item.quantity}`}>
                                            {item.quantity}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={
                                                update.isPending || item.quantity >= item.available
                                            }
                                            aria-label={`Aumentar quantidade de ${item.name}`}
                                            onClick={() => update.mutate({
                                                type: 'quantity',
                                                item,
                                                quantity: item.quantity + 1,
                                            })}
                                        >
                                            <Plus size={14} />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={update.isPending}
                                            aria-label={`Remover ${item.name}, ${item.editionName}`}
                                            onClick={() => update.mutate({ type: 'remove', item })}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </article>
                            ))}
                        </section>

                        <aside
                            aria-labelledby="summary-title"
                            className="rounded-2xl bg-card p-5"
                        >
                            <h2 id="summary-title" className="font-bold">
                                Resumo da carteira
                            </h2>

                            <form
                                className="mt-5"
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    const form = new FormData(event.currentTarget)

                                    update.mutate({
                                        type: 'coupon',
                                        code: String(form.get('coupon') ?? ''),
                                    })
                                }}
                            >
                                <label htmlFor="coupon" className="text-xs">
                                    Código promocional
                                </label>

                                <div className="mt-2 flex gap-2">
                                    <Input
                                        id="coupon"
                                        name="coupon"
                                        placeholder="Digite o código"
                                        className="min-w-0"
                                        required
                                        disabled={update.isPending}
                                    />

                                    <Button type="submit" disabled={update.isPending}>
                                        Aplicar
                                    </Button>
                                </div>
                            </form>

                            {cart.data.coupon && (
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="text-xs">{cart.data.coupon}</span>
                                    <Button
                                        variant="ghost"
                                        disabled={update.isPending}
                                        onClick={() =>
                                            update.mutate({ type: 'coupon', code: '' })
                                        }
                                    >
                                        Remover cupom
                                    </Button>
                                </div>
                            )}

                            <dl className="mt-6 space-y-4 text-sm">
                                <div className="flex justify-between gap-4">
                                    <dt>Subtotal</dt>
                                    <dd>{cart.data.subtotal} ETH</dd>
                                </div>

                                <div className="flex justify-between gap-4">
                                    <dt>Desconto</dt>
                                    <dd>− {cart.data.discount} ETH</dd>
                                </div>

                                <div className="flex justify-between gap-4">
                                    <dt>Taxa de rede estimada</dt>
                                    <dd>{cart.data.networkFee} ETH</dd>
                                </div>

                                <div className="flex justify-between gap-4 border-t border-border pt-4 font-bold">
                                    <dt>Total</dt>
                                    <dd className="text-primary">{cart.data.total} ETH</dd>
                                </div>
                            </dl>

                            <Button className="mt-6 w-full" disabled>
                                Conectar e finalizar
                            </Button>

                            <Link
                                to="/checkout"
                                className="mt-6 flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                            >
                                Conectar e finalizar
                            </Link>
                        </aside>
                    </div>
                )}

                {update.isError && (
                    <p role="alert" className="mt-5">{message}</p>
                )}

                <p role="status" className="mt-4 min-h-5 text-sm">
                    {update.isPending
                        ? 'Atualizando carrinho...'
                        : update.isSuccess
                            ? 'Carrinho atualizado.'
                            : ''}
                </p>
            </main>
        </>
    )
}