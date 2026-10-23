import { ethToWei, weiToEth } from '@/lib/eth'
import type { Cart, CartLine, CartView } from '@/types/cart'
import { nfts } from './fixtures'

export function createCartView(cart: Cart): CartView {
    const lines: CartLine[] = cart.items.map((item) => {
        const nft = nfts.find((nft) => nft.id === item.nftId)
        const edition = nft?.editions.find(
            (edition) => edition.id === item.editionId,
        )

        if (!nft || !edition) {
            throw new Error('O carrinho contém um item indisponível.')
        }

        return {
            ...item,
            name: nft.name,
            image: nft.image,
            editionName: edition.name,
            available: edition.available,
            unitPrice: edition.price,
            subtotal: weiToEth(
                ethToWei(edition.price) * BigInt(item.quantity),
            ),
        }
    })

    const subtotal = lines.reduce(
        (sum, line) => sum + ethToWei(line.subtotal),
        0n,
    )

    const discount = cart.coupon === 'KURIO10'
        ? subtotal / 10n
        : 0n

    const networkFee = lines.length > 0 ? ethToWei('0.016') : 0n

    return {
        ...cart,
        lines,
        subtotal: weiToEth(subtotal),
        discount: weiToEth(discount),
        networkFee: weiToEth(networkFee),
        total: weiToEth(subtotal - discount + networkFee),
    }
}