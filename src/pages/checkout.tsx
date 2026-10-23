import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { QuoteSummary } from '@/components/checkout/quote-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { sessionOptions } from '@/lib/session'
import {
    readOrderAttempt,
    submitOrderAttempt,
} from '@/lib/order-attempt'
import type { User } from '@/types/auth'
import type { OrderInput } from '@/types/order'
import type { Quote } from '@/types/quote'
import type { Wallet } from '@/lib/wallet-schema'
import type { WalletConnection } from '@/types/wallet-connection'

interface Draft {
    name: string
    email: string
    notes: string
    walletId: string
}

function draftKey(userId: string) {
    return `kurio:checkout-draft:${userId}`
}

function readDraft(user: User): Draft {
    try {
        const stored = sessionStorage.getItem(draftKey(user.id))
        const parsed: unknown = stored ? JSON.parse(stored) : null

        if (parsed && typeof parsed === 'object') {
            const value = parsed as Partial<Draft>

            return {
                name: typeof value.name === 'string' ? value.name : user.name,
                email: typeof value.email === 'string' ? value.email : user.email,
                notes: typeof value.notes === 'string' ? value.notes : '',
                walletId: typeof value.walletId === 'string' ? value.walletId : '',
            }
        }
    } catch {
    }

    return {
        name: user.name,
        email: user.email,
        notes: '',
        walletId: '',
    }
}

function errorMessage(error: unknown) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message
            ?? 'A resposta não chegou. Recupere a tentativa antes de comprar novamente.'
    }

    return error instanceof Error
        ? error.message
        : 'Não foi possível concluir a operação.'
}

export function CheckoutPage() {
    const session = useQuery(sessionOptions)

    return (
        <>
            <Header />

            <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
                <Link to="/cart" className="text-sm text-muted-foreground underline">
                    Voltar ao carrinho
                </Link>

                <h1 className="mt-6 text-2xl font-bold">
                    Pagamento com carteira
                </h1>

                {session.data && (
                    <CheckoutForm key={session.data.user.id} user={session.data.user} />
                )}

                {session.isPending && (
                    <p role="status" className="mt-6">Verificando sessão...</p>
                )}

                {session.isError && (
                    <div role="alert" className="mt-6">
                        <p>Não foi possível verificar sua sessão.</p>
                        <Button onClick={() => void session.refetch()}>
                            Tentar novamente
                        </Button>
                    </div>
                )}

                {session.isSuccess && !session.data && (
                    <Link
                        to="/login"
                        search={{ mode: 'login', redirect: '/checkout' }}
                        className="mt-6 inline-block text-primary underline"
                    >
                        Sua sessão expirou. Entre para continuar.
                    </Link>
                )}
            </main>
        </>
    )
}

function CheckoutForm({ user }: { user: User }) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const sendingRef = useRef(false)

    const [draft, setDraft] = useState(() => readDraft(user))
    const [quote, setQuote] = useState<Quote | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const [hasAttempt, setHasAttempt] = useState(
        () => Boolean(readOrderAttempt(user.id)),
    )

    useEffect(() => {
        sessionStorage.setItem(draftKey(user.id), JSON.stringify(draft))
    }, [draft, user.id])

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => window.clearInterval(timer)
    }, [])

    const wallets = useQuery({
        queryKey: ['wallets', user.id],
        queryFn: async ({ signal }) => {
            const response = await api.get<Wallet[]>('/wallets', { signal })
            return response.data
        },
    })

    const connection = useQuery({
        queryKey: ['wallet-connection', user.id],
        queryFn: async ({ signal }) => {
            const response = await api.get<WalletConnection | null>(
                '/wallet-connection',
                { signal },
            )
            return response.data
        },
        staleTime: 0,
        refetchInterval: 30_000,
    })

    const connected = Boolean(
        connection.data
        && connection.data.walletId === draft.walletId
        && connection.data.expiresAt > now,
    )

    const connect = useMutation({
        mutationFn: async (action: 'connect' | 'disconnect') => {
            if (action === 'disconnect') {
                await api.delete('/wallet-connection')
                return null
            }

            const response = await api.post<WalletConnection>(
                '/wallet-connection',
                { walletId: draft.walletId },
            )

            return response.data
        },
        onSuccess: (value) => {
            queryClient.setQueryData(['wallet-connection', user.id], value)
            setQuote(null)
        },
    })

    const review = useMutation({
        mutationFn: async () => {
            const response = await api.post<Quote>('/quotes', {
                walletId: draft.walletId,
            })

            return response.data
        },
        onSuccess: (value) => setQuote(value),
        onError: () => setQuote(null),
    })

    const purchase = useMutation({
        mutationFn: async (input: OrderInput | undefined) => {
            if (sendingRef.current) {
                throw new Error('Já existe um envio em andamento.')
            }

            sendingRef.current = true

            try {
                if (input && !readOrderAttempt(user.id)) {
                    await api.get(`/quotes/${encodeURIComponent(input.quoteId)}`)
                }

                return await submitOrderAttempt(user.id, input)
            } finally {
                sendingRef.current = false
            }
        },
        onSuccess: async (order) => {
            queryClient.setQueryData(['orders', user.id, order.id], order)

            await navigate({
                to: '/orders/$orderId',
                params: { orderId: order.id },
            })
        },
        onError: () => {
            setHasAttempt(Boolean(readOrderAttempt(user.id)))

            // Uma cotação alterada precisa passar por revisão novamente.
            setQuote(null)
        },
    })

    function changeDraft(patch: Partial<Draft>) {
        setDraft((previous) => ({ ...previous, ...patch }))
        setQuote(null)
        review.reset()
    }

    if (hasAttempt) {
        return (
            <section className="mt-8 rounded-xl bg-card p-6">
                <h2 className="font-bold">Recuperar tentativa anterior</h2>

                <p className="mt-3 text-sm text-muted-foreground">
                    Vamos consultar ou reenviar a mesma tentativa, usando a mesma chave.
                    Isso evita criar outra compra após uma interrupção.
                </p>

                <Button
                    className="mt-5"
                    disabled={purchase.isPending}
                    onClick={() => purchase.mutate(undefined)}
                >
                    {purchase.isPending ? 'Recuperando...' : 'Recuperar pedido'}
                </Button>

                {purchase.isError && (
                    <p role="alert" className="mt-4 text-sm">
                        {errorMessage(purchase.error)}
                    </p>
                )}
            </section>
        )
    }

    if (wallets.isPending || connection.isPending) {
        return (
            <div role="status" className="mt-8">
                <span className="sr-only">Carregando pagamento</span>
                <div
                    aria-hidden="true"
                    className="catalog-shimmer h-96 rounded-xl"
                />
            </div>
        )
    }

    if (wallets.isError || connection.isError) {
        return (
            <section role="alert" className="mt-8">
                <p>Não foi possível carregar as carteiras.</p>
                <Button
                    className="mt-4"
                    onClick={() => {
                        void wallets.refetch()
                        void connection.refetch()
                    }}
                >
                    Tentar novamente
                </Button>
            </section>
        )
    }

    if (!wallets.data?.length) {
        return (
            <section className="mt-8">
                <p>Cadastre uma carteira antes de continuar.</p>
                <Link to="/wallets" className="mt-4 inline-block text-primary underline">
                    Cadastrar carteira
                </Link>
            </section>
        )
    }

    const busy = purchase.isPending || review.isPending || connect.isPending

    return (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault()

                    if (connected && !busy) {
                        review.mutate()
                    }
                }}
            >
                <h2 className="font-bold">Perfil do colecionador</h2>

                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm">
                        Nome de exibição
                        <Input
                            value={draft.name}
                            required
                            minLength={2}
                            maxLength={80}
                            autoComplete="name"
                            disabled={busy}
                            className="mt-2"
                            onChange={(event) => changeDraft({ name: event.target.value })}
                        />
                    </label>

                    <label className="text-sm">
                        E-mail
                        <Input
                            value={draft.email}
                            type="email"
                            required
                            autoComplete="email"
                            disabled={busy}
                            className="mt-2"
                            onChange={(event) => changeDraft({ email: event.target.value })}
                        />
                    </label>
                </div>

                <label className="block text-sm">
                    Observações do colecionador (opcional)
                    <textarea
                        value={draft.notes}
                        maxLength={1000}
                        disabled={busy}
                        className="mt-2 min-h-28 w-full rounded-md border border-input bg-background p-3"
                        onChange={(event) => changeDraft({ notes: event.target.value })}
                    />
                </label>

                <fieldset disabled={busy}>
                    <legend className="font-bold">Carteira e rede</legend>

                    <div className="mt-4 space-y-3">
                        {wallets.data.map((wallet) => (
                            <label
                                key={wallet.id}
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4"
                            >
                                <input
                                    type="radio"
                                    name="wallet"
                                    value={wallet.id}
                                    checked={draft.walletId === wallet.id}
                                    required
                                    className="mt-1"
                                    onChange={() => changeDraft({ walletId: wallet.id })}
                                />

                                <span className="min-w-0">
                                    <span className="block font-bold">{wallet.nickname}</span>
                                    <span className="mt-1 block text-sm text-muted-foreground">
                                        {wallet.provider} · {wallet.network}
                                    </span>
                                    <span className="mt-2 block break-all text-xs">
                                        {wallet.address}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div className="flex flex-wrap items-center gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!draft.walletId || busy}
                        onClick={() => connect.mutate(connected ? 'disconnect' : 'connect')}
                    >
                        {connect.isPending
                            ? 'Aguarde...'
                            : connected
                                ? 'Desconectar carteira'
                                : 'Conectar carteira'}
                    </Button>

                    <span role="status" className="text-sm">
                        {connected ? 'Carteira conectada na simulação' : 'Carteira desconectada'}
                    </span>
                </div>

                {connect.isError && (
                    <p role="alert" className="text-sm">
                        {errorMessage(connect.error)}
                    </p>
                )}

                <Button type="submit" disabled={!connected || busy}>
                    {review.isPending ? 'Calculando...' : 'Revisar compra'}
                </Button>

                <Link to="/wallets" className="ml-4 text-sm text-primary underline">
                    Gerenciar carteiras
                </Link>

                {review.isError && (
                    <p role="alert" className="text-sm">
                        {errorMessage(review.error)}
                    </p>
                )}
            </form>

            <aside className="rounded-2xl bg-card p-5">
                {review.isPending ? (
                    <div role="status">
                        <span className="sr-only">Calculando cotação</span>
                        <div
                            aria-hidden="true"
                            className="catalog-shimmer h-72 rounded-xl"
                        />
                    </div>
                ) : quote ? (
                    <>
                        <QuoteSummary quote={quote} />

                        <p className="mt-5 text-sm">
                            Colecionador: {draft.name}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                            {draft.email}
                        </p>

                        <Button
                            className="mt-6 w-full"
                            disabled={!connected || busy}
                            onClick={() => purchase.mutate({
                                quoteId: quote.id,
                                collector: {
                                    name: draft.name.trim(),
                                    email: draft.email.trim(),
                                    notes: draft.notes.trim(),
                                },
                            })}
                        >
                            {purchase.isPending ? 'Enviando...' : 'Confirmar compra'}
                        </Button>

                        <p className="mt-3 text-xs text-muted-foreground">
                            A cotação será revalidada antes do envio.
                            Nenhum pagamento real será realizado.
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Preencha os dados, conecte uma carteira e clique em
                        “Revisar compra” para consultar os valores.
                    </p>
                )}

                {purchase.isError && (
                    <p role="alert" className="mt-4 text-sm">
                        {errorMessage(purchase.error)}
                    </p>
                )}
            </aside>
        </div>
    )
}