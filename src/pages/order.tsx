import { useEffect } from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { CommerceLayout } from '@/components/layout/commerce-layout'
import { CartTotals, PurchaseLines } from '@/components/checkout/purchase-summary'
import { Check, Clock3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { sessionOptions } from '@/lib/session'
import { parseCatalogSearch } from '@/lib/catalog-search'
import {
    clearOrderAttempt,
    readOrderAttempt,
} from '@/lib/order-attempt'
import type { Order } from '@/types/order'
import { useOrderRealtime } from '@/hooks/use-order-realtime'

export function OrderPage() {
    const { orderId } = useParams({ from: '/orders/$orderId' })
    const queryClient = useQueryClient()
    const session = useQuery(sessionOptions)
    const userId = session.data?.user.id
    const realtimeMessage = useOrderRealtime(userId, orderId)

    const order = useQuery({
        queryKey: ['orders', userId, orderId],
        enabled: Boolean(userId),
        queryFn: async ({ signal }) => {
            const response = await api.get<Order>(
                `/orders/${encodeURIComponent(orderId)}`,
                { signal },
            )

            const cached = queryClient.getQueryData<Order>([
                'orders',
                userId,
                orderId,
            ])

            return cached && cached.version > response.data.version
                ? cached
                : response.data
        },
        refetchInterval: (query) => {
            return query.state.data?.status === 'pending' ? 15_000 : false
        },
    })

    const status = order.data?.status

    useEffect(() => {
        if (!userId || !status || status === 'pending') {
            return
        }

        try {
            const attempt = readOrderAttempt(userId)

            if (attempt?.orderId === orderId) {
                clearOrderAttempt(userId)
            }
        } catch {
            //ignore
        }

        void queryClient.invalidateQueries({ queryKey: ['cart', userId] })
        void queryClient.invalidateQueries({ queryKey: ['nfts'] })
        void queryClient.invalidateQueries({ queryKey: ['nft'] })
    }, [orderId, queryClient, status, userId])

    const notFound = axios.isAxiosError(order.error)
        && order.error.response?.status === 404

    return <CommerceLayout title="Recibo da compra" step="receipt">
        <p role="status" className="receipt-realtime">{realtimeMessage}</p>
        {order.isPending && <div role="status" className="commerce-loading"><span className="sr-only">Consultando pedido</span><div aria-hidden="true" className="catalog-shimmer h-96 rounded-2xl" /></div>}
        {order.isError && <section role="alert" className="commerce-state"><h1>{notFound ? 'Pedido não encontrado' : 'Não foi possível consultar o pedido'}</h1><p>Nenhuma nova compra será criada ao tentar consultar novamente.</p>{!notFound && <Button onClick={() => void order.refetch()}>Consultar novamente</Button>}<Link to="/cart" className="text-primary underline">Ver carrinho</Link></section>}
        {order.data && <article className="receipt" data-status={status}>
            <header className="receipt-heading" role="status" aria-live="polite">
                <span className="receipt-status-icon" aria-hidden="true">{status === 'confirmed' ? <Check /> : status === 'declined' ? <X /> : <Clock3 />}</span>
                <h1>{status === 'confirmed' ? 'Seus NFTs agora estão na sua carteira' : status === 'declined' ? 'Pagamento recusado' : 'Aguardando confirmação'}</h1>
                {status === 'pending' && <p>Estamos consultando o resultado da simulação. Você pode atualizar esta página sem criar outra compra.</p>}
                {status === 'declined' && <p>{order.data.rejectionReason} Os itens desta tentativa não foram removidos do carrinho.</p>}
                {status === 'confirmed' && <p>Compra confirmada na simulação. Confira os dados do seu pedido.</p>}
            </header>
            <div className="receipt-grid">
                <section aria-labelledby="receipt-details-title"><h2 id="receipt-details-title">Detalhes da transação</h2>
                    <dl className="receipt-details">
                        <div><dt>Pedido</dt><dd>{order.data.id}</dd></div>
                        <div><dt>Data</dt><dd>{new Date(order.data.updatedAt).toLocaleString('pt-BR')}</dd></div>
                        {status === 'confirmed' && <div className="receipt-transaction"><dt>Transação simulada</dt><dd>{order.data.transactionId}</dd></div>}
                        <div><dt>Colecionador</dt><dd>{order.data.collector.name}</dd></div>
                        <div><dt>E-mail</dt><dd>{order.data.collector.email}</dd></div>
                        <div><dt>Carteira</dt><dd>{order.data.snapshot.wallet.nickname}</dd></div>
                        <div><dt>Rede</dt><dd>{order.data.snapshot.wallet.network}</dd></div>
                        <div className="receipt-address"><dt>Endereço da carteira</dt><dd>{order.data.snapshot.wallet.address}</dd></div>
                        {order.data.collector.notes && <div className="receipt-notes"><dt>Observações do colecionador</dt><dd>{order.data.collector.notes}</dd></div>}
                    </dl>
                    <p className="receipt-disclaimer">Compra e transação simuladas. Nenhum ativo foi transferido em uma blockchain real.</p>
                </section>
                <section className="receipt-summary" aria-labelledby="receipt-summary-title"><h2 id="receipt-summary-title">Seus NFTs</h2><PurchaseLines lines={order.data.snapshot.cart.lines} /><CartTotals cart={order.data.snapshot.cart} /></section>
            </div>
            <nav className="receipt-actions" aria-label="Próximos passos"><Link to="/" search={parseCatalogSearch({})} className="market-cta">Explorar NFTs</Link><Link to="/cart">Ver carrinho</Link></nav>
        </article>}
    </CommerceLayout>
}