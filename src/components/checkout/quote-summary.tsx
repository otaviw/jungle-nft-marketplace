import type { Quote } from '@/types/quote'

export function QuoteSummary({ quote }: { quote: Quote }) {
    return (
        <section aria-labelledby="quote-summary-title">
            <h2 id="quote-summary-title" className="font-bold">
                Seus NFTs
            </h2>

            <ul className="mt-5 space-y-4">
                {quote.cart.lines.map((item) => (
                    <li
                        key={`${item.nftId}:${item.editionId}`}
                        className="flex items-center gap-3"
                    >
                        <img
                            src={item.image}
                            alt=""
                            width={48}
                            height={48}
                            className="size-12 rounded object-cover"
                        />

                        <div className="min-w-0 flex-1 text-xs">
                            <p>{item.name}</p>
                            <p className="mt-1 text-muted-foreground">
                                {item.editionName} × {item.quantity}
                            </p>
                        </div>

                        <span className="text-sm text-primary">
                            {item.subtotal} ETH
                        </span>
                    </li>
                ))}
            </ul>

            <dl className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                    <dt>Subtotal</dt>
                    <dd>{quote.cart.subtotal} ETH</dd>
                </div>

                <div className="flex justify-between gap-4">
                    <dt>Desconto</dt>
                    <dd>− {quote.cart.discount} ETH</dd>
                </div>

                <div className="flex justify-between gap-4">
                    <dt>Taxa de rede</dt>
                    <dd>{quote.cart.networkFee} ETH</dd>
                </div>

                <div className="flex justify-between gap-4 border-t border-border pt-4 font-bold">
                    <dt>Total</dt>
                    <dd className="text-primary">{quote.cart.total} ETH</dd>
                </div>
            </dl>

            <p className="mt-4 text-xs text-muted-foreground">
                Carteira: {quote.wallet.nickname} · {quote.wallet.network}
            </p>
        </section>
    )
}