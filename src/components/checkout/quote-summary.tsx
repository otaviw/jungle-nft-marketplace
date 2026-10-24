import type { Quote } from '@/types/quote'
import { CartTotals } from './purchase-summary'

export function QuoteSummary({ quote }: { quote: Quote }) {
    return <section className="reviewed-quote" aria-labelledby="quote-summary-title">
        <h3 id="quote-summary-title" className="quote-reviewed-title">Cotação revisada</h3>
        <CartTotals cart={quote.cart} />
        <p className="quote-note">Carteira: {quote.wallet.nickname} · {quote.wallet.network}</p>
    </section>
}
