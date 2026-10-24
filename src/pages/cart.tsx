import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { CommerceLayout } from '@/components/layout/commerce-layout'
import { CartTotals } from '@/components/checkout/purchase-summary'
import { CartSuggestions } from '@/components/checkout/cart-suggestions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { parseCatalogSearch } from '@/lib/catalog-search'
import type { CartLine, CartView } from '@/types/cart'
import { sessionOptions } from '@/lib/session'

type CartAction = { type: 'quantity'; item: CartLine; quantity: number } | { type: 'remove'; item: CartLine } | { type: 'coupon'; code: string }

export function CartPage() {
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const cartKey = ['cart', session.data?.user.id ?? 'guest']
    const cart = useQuery({ queryKey: cartKey, enabled: session.isSuccess, queryFn: async ({ signal }) => (await api.get<CartView>('/cart', { signal })).data })
    const update = useMutation({
        mutationFn: async (action: CartAction) => {
            if (action.type === 'coupon') { await api.post('/cart/coupon', { code: action.code }); return }
            const path = `/cart/items/${encodeURIComponent(action.item.nftId)}/${encodeURIComponent(action.item.editionId)}`
            if (action.type === 'remove') await api.delete(path)
            else await api.patch(path, { quantity: action.quantity })
        },
        onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: cartKey }) },
    })
    const message = axios.isAxiosError<{ message?: string }>(update.error) ? update.error.response?.data?.message ?? 'Não foi possível atualizar.' : 'Não foi possível atualizar.'
    return <CommerceLayout title="Carrinho de NFTs" step="cart">
        {session.isError && <div role="alert" className="commerce-state"><p>Não foi possível verificar sua sessão.</p><Button onClick={() => void session.refetch()}>Tentar novamente</Button></div>}
        {(session.isPending || (session.isSuccess && cart.isPending)) && <div role="status" className="commerce-grid commerce-loading"><span className="sr-only">Carregando carrinho</span><div aria-hidden="true" className="catalog-shimmer h-64 rounded-xl" /><div aria-hidden="true" className="catalog-shimmer h-64 rounded-xl" /></div>}
        {cart.isError && <div role="alert" className="commerce-state"><p>Não foi possível carregar o carrinho.</p><Button onClick={() => void cart.refetch()}>Tentar novamente</Button></div>}
        {cart.data?.items.length === 0 && <section className="commerce-state commerce-empty"><ShoppingBag size={40} aria-hidden="true" /><p role="status">Seu carrinho está vazio. Explore o catálogo para adicionar NFTs.</p><Link to="/" search={parseCatalogSearch({})} className="market-cta">Explorar NFTs</Link></section>}
        {cart.data && cart.data.items.length > 0 && <>
            <div className="commerce-grid cart-content">
                <section aria-label="Itens do carrinho" className="cart-items">
                    <div className="cart-column-headings" aria-hidden="true"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span></div>
                    {cart.data.lines.map(item => <article className="commerce-cart-line" key={`${item.nftId}:${item.editionId}`}>
                        <Link className="cart-item-art" to="/nfts/$nftId" params={{ nftId: item.nftId }} aria-label={`Ver ${item.name}`}><img src={item.image} alt="" width={100} height={100} /></Link>
                        <div className="cart-item-details"><h2>{item.name}</h2><p className="cart-item-id">ID do token: {item.nftId}</p><p className="cart-item-edition">{item.editionName}</p>{item.quantity > item.available && <p className="stock-warning" role="alert">Disponibilidade alterada: {item.available} unidades.</p>}</div>
                        <p className="cart-unit-price"><span className="sr-only">Preço por unidade: </span>{item.unitPrice} ETH</p>
                        <div className="cart-stepper">
                            <Button variant="outline" size="icon" disabled={update.isPending || item.quantity <= 1} aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => update.mutate({ type: 'quantity', item, quantity: item.quantity - 1 })}><Minus size={14} aria-hidden="true" /></Button>
                            <span aria-label={`Quantidade: ${item.quantity}`}>{item.quantity}</span>
                            <Button variant="outline" size="icon" disabled={update.isPending || item.quantity >= item.available} aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => update.mutate({ type: 'quantity', item, quantity: item.quantity + 1 })}><Plus size={14} aria-hidden="true" /></Button>
                        </div>
                        <p className="cart-line-total">{item.subtotal} ETH</p>
                        <Button className="cart-remove" variant="ghost" size="icon" disabled={update.isPending} aria-label={`Remover ${item.name}, ${item.editionName}`} onClick={() => update.mutate({ type: 'remove', item })}><Trash2 size={18} aria-hidden="true" /></Button>
                    </article>)}
                </section>
                <aside aria-labelledby="summary-title" className="cart-summary">
                    <h2 id="summary-title">Resumo da carteira</h2>
                    <form className="coupon-form" onSubmit={event => { event.preventDefault(); update.mutate({ type: 'coupon', code: String(new FormData(event.currentTarget).get('coupon') ?? '') }) }}>
                        <label htmlFor="coupon">Código promocional</label><div><Input id="coupon" name="coupon" aria-describedby={update.isError ? 'cart-update-error' : undefined} placeholder="Digite o código promocional..." required disabled={update.isPending} /><Button type="submit" disabled={update.isPending}>Aplicar</Button></div>
                    </form>
                    {cart.data.coupon && <div className="applied-coupon"><span>{cart.data.coupon}</span><Button variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ type: 'coupon', code: '' })}>Remover cupom</Button></div>}
                    <CartTotals cart={cart.data} estimated />
                    <Link to="/checkout" className="market-cta cart-checkout">Conectar e finalizar</Link>
                    <Link to="/" search={parseCatalogSearch({})} className="continue-shopping">Continuar explorando</Link>
                    {update.isError && <p id="cart-update-error" role="alert" className="commerce-feedback">{message}</p>}
                    <p role="status" className="commerce-feedback">{update.isPending ? 'Atualizando carrinho...' : update.isSuccess ? 'Carrinho atualizado.' : ''}</p>
                </aside>
            </div>
            <CartSuggestions exclude={cart.data.items.map(item => item.nftId)} />
        </>}
    </CommerceLayout>
}
