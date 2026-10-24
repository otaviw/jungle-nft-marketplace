import { useEffect, useRef, useState, type FormEvent } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CommerceLayout } from '@/components/layout/commerce-layout'
import { QuoteSummary } from '@/components/checkout/quote-summary'
import { CartTotals, PurchaseLines } from '@/components/checkout/purchase-summary'
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
import { walletProviders, type Wallet } from '@/lib/wallet-schema'
import type { WalletConnection } from '@/types/wallet-connection'
import type { Profile } from '@/types/profile'
import type { CartView } from '@/types/cart'
import { useMobile } from '@/hooks/use-mobile'

interface Draft {
    name: string
    email: string
    notes: string
    walletId: string
}

function draftKey(userId: string) {
    return `kurio:checkout-draft:${userId}`
}

function readDraft(user: User, profile?: Profile): Draft {
    try {
        const stored = sessionStorage.getItem(draftKey(user.id))
        const parsed: unknown = stored ? JSON.parse(stored) : null

        if (parsed && typeof parsed === 'object') {
            const value = parsed as Partial<Draft>

            return {
                name: typeof value.name === 'string' ? value.name : profile?.displayName ?? user.name,
                email: typeof value.email === 'string' ? value.email : profile?.email ?? user.email,
                notes: typeof value.notes === 'string' ? value.notes : '',
                walletId: typeof value.walletId === 'string' ? value.walletId : '',
            }
        }
    } catch {
        // ignore
    }

    return {
        name: profile?.displayName ?? user.name,
        email: profile?.email ?? user.email,
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
    const profile = useQuery({ queryKey: ['profile', session.data?.user.id], enabled: Boolean(session.data), queryFn: async ({ signal }) => (await api.get<Profile>('/profile', { signal })).data })

    return (
        <CommerceLayout title="Pagamento com carteira" step="checkout">
                {session.data && !profile.isPending && (
                    <CheckoutForm key={session.data.user.id} user={session.data.user} profile={profile.data} />
                )}
                {(session.isPending || (session.data && profile.isPending)) && (
                    <div role="status" className="commerce-loading"><span className="sr-only">Verificando sessão e perfil...</span><div aria-hidden="true" className="catalog-shimmer h-96 rounded-xl" /></div>
                )}
                {profile.isError && <div role="alert" className="commerce-feedback"><p>Não foi possível carregar os dados do perfil. Confira o nome e o e-mail antes de continuar.</p><Button onClick={() => void profile.refetch()}>Carregar perfil novamente</Button></div>}

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
        </CommerceLayout>
    )
}

function CheckoutForm({ user, profile }: { user: User; profile?: Profile }) {
    const mobile = useMobile()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const sendingRef = useRef(false)

    const [draft, setDraft] = useState(() => readDraft(user, profile))
    const [profileOpen, setProfileOpen] = useState(false)
    const [savedQuote, setQuote] = useState<Quote | null>(null)
    const [reviewRevision, setReviewRevision] = useState<string | null>(null)

    const catalogChange = useQuery<string | null>({
        queryKey: ['catalog-change'],
        queryFn: async () => null,
        enabled: false,
        initialData: null,
    })

    const quote = reviewRevision === catalogChange.data
        ? savedQuote
        : null
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

    const cart = useQuery({ queryKey: ['cart', user.id], queryFn: async ({ signal }) => (await api.get<CartView>('/cart', { signal })).data })

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

    const walletId = draft.walletId || connection.data?.walletId || wallets.data?.find(wallet => wallet.slot === 'primary')?.id || wallets.data?.[0]?.id || ''
    const selectedWallet = wallets.data?.find(wallet => wallet.id === walletId)
    const connected = Boolean(
        connection.data
        && connection.data.walletId === walletId
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
                { walletId },
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
                walletId,
            })

            return response.data
        },
        onSuccess: (value) => {
            setQuote(value)
            setReviewRevision(
                queryClient.getQueryData<string>(['catalog-change']) ?? null,
            )
        },
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
            <section className="commerce-state checkout-recovery">
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
            <div role="status" className="commerce-loading">
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
            <section role="alert" className="commerce-state">
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
            <section className="commerce-state">
                <p>Cadastre uma carteira antes de continuar.</p>
                <Link to="/wallets" className="mt-4 inline-block text-primary underline">
                    Cadastrar carteira
                </Link>
            </section>
        )
    }

    if (cart.isPending) return <div role="status" className="commerce-loading"><span className="sr-only">Carregando resumo da compra</span><div aria-hidden="true" className="catalog-shimmer h-72 rounded-xl" /></div>
    if (cart.isError) return <section role="alert" className="commerce-state"><p>Não foi possível carregar o resumo da compra.</p><Button onClick={() => void cart.refetch()}>Tentar novamente</Button></section>
    if (!cart.data.items.length) return <section className="commerce-state"><p role="status">Seu carrinho está vazio. Adicione NFTs antes de continuar.</p><Link to="/cart" className="market-cta">Voltar ao carrinho</Link></section>

    const busy = purchase.isPending || review.isPending || connect.isPending
    const previewCart = quote?.cart ?? cart.data
    const readOnlyFields = [
        { label: 'Apelido da carteira', value: selectedWallet?.nickname },
        { label: 'Rede', value: selectedWallet?.network },
        { label: 'Nome do perfil', value: selectedWallet?.profileName },
        { label: 'Endereço da carteira', value: selectedWallet?.address },
        { label: 'Outra carteira (opcional)', value: wallets.data.find(wallet => wallet.id !== walletId)?.address },
        { label: 'Tipo de carteira', value: selectedWallet?.provider },
        { label: 'Código de indicação (opcional)', value: selectedWallet?.referralCode },
        { label: 'Nome ENS', value: selectedWallet?.ens },
    ]

    const formProps = {
        id: 'checkout-review-form',
        onInvalidCapture: (event: FormEvent<HTMLFormElement>) => {
            setProfileOpen(true)
            const field = event.target as HTMLElement
            requestAnimationFrame(() => field.focus())
        },
        onSubmit: (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (connected && !busy) review.mutate()
        },
    }
    const fields = (
                <div className="collector-grid">
                    <label className="collector-name"><span id="checkout-name-label">Nome de exibição</span><span aria-hidden="true" className="required-mark"> *</span><Input aria-labelledby="checkout-name-label" value={draft.name} required minLength={2} maxLength={80} autoComplete="name" disabled={busy} onChange={event => changeDraft({ name: event.target.value })} /></label>
                    {readOnlyFields.slice(0, 7).map((field, index) => <label key={field.label} className={`collector-wallet-field collector-wallet-field-${index}`}><span id={`checkout-wallet-${index}-label`}>{field.label}</span><Input aria-labelledby={`checkout-wallet-${index}-label`} aria-describedby="wallet-data-help" value={field.value ?? ''} readOnly placeholder="Não informado" /></label>)}
                    <label className="collector-email"><span id="checkout-email-label">E-mail</span><span aria-hidden="true" className="required-mark"> *</span><Input aria-labelledby="checkout-email-label" value={draft.email} type="email" required autoComplete="email" disabled={busy} onChange={event => changeDraft({ email: event.target.value })} /></label>
                    <label className="collector-wallet-field collector-wallet-field-7"><span id="checkout-wallet-7-label">Nome ENS</span><Input aria-labelledby="checkout-wallet-7-label" aria-describedby="wallet-data-help" value={selectedWallet?.ens ?? ''} readOnly placeholder="Não informado" /></label>
                </div>
    )
    const notes = (<>
                <p id="wallet-data-help" className="wallet-data-help">Dados da carteira selecionada. <Link to="/wallets">Editar cadastro da carteira</Link></p>
                <label className="collector-notes"><span id="checkout-notes-label">Observações do colecionador (opcional)</span><textarea aria-labelledby="checkout-notes-label" value={draft.notes} maxLength={1000} disabled={busy} onChange={event => changeDraft({ notes: event.target.value })} /></label>
    </>)
    const walletChoices = (
            <section className="checkout-wallet-choice">
                <div className="checkout-wallet-heading"><h2>{connected ? 'Carteira conectada' : 'Carteira cadastrada'}</h2><Link to="/wallets">Gerenciar carteiras</Link></div>
                <fieldset className="checkout-wallets" disabled={busy}><legend className="sr-only">Selecionar carteira cadastrada</legend>
                    {wallets.data.map(wallet => <label key={wallet.id} data-selected={walletId === wallet.id}><input type="radio" name="wallet" form="checkout-review-form" value={wallet.id} checked={walletId === wallet.id} required onChange={() => changeDraft({ walletId: wallet.id })} /><span><strong>{wallet.nickname}</strong><span className="wallet-short-address">{wallet.ens || `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}</span><span>Rede {wallet.network}</span></span></label>)}
                </fieldset>
            </section>
    )
    const summaryTotals = review.isPending ? <div role="status"><span className="sr-only">Calculando cotação</span><div aria-hidden="true" className="catalog-shimmer h-40 rounded-xl" /></div> : quote ? <QuoteSummary quote={quote} /> : <CartTotals cart={previewCart} estimated />
    const couponLink = <Link to="/cart" className="checkout-coupon-link">Tem um código promocional? Aplique no carrinho</Link>
    const summary = <section className="checkout-summary" aria-labelledby="checkout-summary-title">
        <h2 id="checkout-summary-title">Seus NFTs</h2>
        {mobile ? <>{summaryTotals}<details className="checkout-mobile-items"><summary>Ver NFTs e taxas</summary><PurchaseLines lines={previewCart.lines} />{couponLink}</details></> : <><div className="checkout-desktop-items"><PurchaseLines lines={previewCart.lines} /></div>{couponLink}{summaryTotals}</>}
        {!quote && <p className="quote-note">Estimativa do carrinho. Conecte a carteira e revise para calcular a taxa da rede selecionada.</p>}
    </section>
    const providers = (
            <section className="checkout-wallet-section">
                <h2 className="wallet-provider-title">Carteira e rede</h2>
                <div className="checkout-providers">{walletProviders.map(provider => {
                    const registered = wallets.data.find(wallet => wallet.provider === provider)
                    const active = selectedWallet?.provider === provider
                    return <button key={provider} type="button" disabled={busy || !registered} aria-pressed={active} onClick={() => { if (registered && !active) changeDraft({ walletId: registered.id }) }}><span className="provider-mark" aria-hidden="true">{provider === 'Coinbase Wallet' ? '▱' : provider[0]}</span><span>{provider}{!registered && <small>Sem carteira cadastrada</small>}</span><span className="provider-radio" aria-hidden="true">{active ? '◉' : '○'}</span></button>
                })}</div>
            </section>
    )
    const connectionControls = (<>
                <div className="checkout-connection"><Button type="button" variant="outline" disabled={!walletId || busy} onClick={() => connect.mutate(connected ? 'disconnect' : 'connect')}>{connect.isPending ? 'Aguarde...' : connected ? 'Desconectar carteira' : 'Conectar carteira'}</Button><span role="status">{connected ? 'Carteira conectada na simulação' : 'Carteira desconectada'}</span></div>
                {connect.isError && <p role="alert" className="commerce-feedback">{errorMessage(connect.error)}</p>}
    </>)
    const actions = (<>
            <div className="checkout-actions">
                <Button type="submit" form="checkout-review-form" variant="outline" disabled={!connected || busy}>{review.isPending ? 'Calculando...' : 'Revisar compra'}</Button>
                {quote && <Button className="checkout-confirm" disabled={!connected || busy} onClick={() => purchase.mutate({ quoteId: quote.id, collector: { name: draft.name.trim(), email: draft.email.trim(), notes: draft.notes.trim() } })}>{purchase.isPending ? 'Enviando...' : 'Confirmar compra'}</Button>}
            </div>
            {quote && <p className="quote-note">Colecionador: {draft.name}<br />{draft.email}<br />A cotação será revalidada antes do envio. Nenhum pagamento real será realizado.</p>}
            {review.isError && <p role="alert" className="commerce-feedback">{errorMessage(review.error)}</p>}
            {purchase.isError && <p role="alert" className="commerce-feedback">{errorMessage(purchase.error)}</p>}
    </>)
    return <div className="checkout-grid">
        {mobile ? <form {...formProps} className="collector-form checkout-mobile-form">
            {walletChoices}{providers}{summary}{connectionControls}
            <button type="button" className="collector-toggle" aria-expanded={profileOpen} aria-controls="collector-fields" onClick={() => setProfileOpen(!profileOpen)}>Dados do colecionador <span aria-hidden="true">{profileOpen ? '−' : '+'}</span></button>
            <div id="collector-fields" className="collector-fields" data-open={profileOpen}>{fields}{notes}</div>
            {actions}
        </form> : <>
            <form {...formProps} className="collector-form"><h2>Perfil do colecionador</h2>{fields}{walletChoices}{notes}</form>
            <aside className="checkout-sidebar">{summary}{providers}{connectionControls}{actions}</aside>
        </>}
    </div>
}
