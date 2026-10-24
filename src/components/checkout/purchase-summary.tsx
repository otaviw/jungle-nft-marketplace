import type { CartLine, CartView } from '@/types/cart'

export function PurchaseLines({ lines }: { lines: CartLine[] }) {
    return <><div className="purchase-lines-heading" aria-hidden="true"><span>NFTs</span><span>Subtotal</span></div><ul className="purchase-lines">{lines.map(item => <li key={`${item.nftId}:${item.editionId}`}>
        <img src={item.image} alt="" width={70} height={70} />
        <div><p className="purchase-item-name">{item.name}</p><p className="purchase-item-meta">{item.editionName} <span>× {item.quantity}</span></p></div>
        <span className="purchase-line-total">{item.subtotal} ETH</span>
    </li>)}</ul></>
}

export function CartTotals({ cart, estimated = false }: { cart: CartView; estimated?: boolean }) {
    return <dl className="commerce-totals">
        <div><dt>Subtotal</dt><dd>{cart.subtotal} ETH</dd></div>
        <div><dt>Desconto do lançamento</dt><dd>− {cart.discount} ETH</dd></div>
        <div><dt>Taxa de rede</dt><dd>{cart.networkFee} ETH{estimated && <small>Taxa estimada</small>}</dd></div>
        <div className="commerce-total"><dt>Total</dt><dd>{cart.total} ETH</dd></div>
    </dl>
}
