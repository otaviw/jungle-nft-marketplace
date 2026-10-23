import { ethToWei, weiToEth } from '@/lib/eth'
import type { Quote } from '@/types/quote'
import { readCart } from './cart-store'
import { createCartView } from './cart-summary'
import { readWallets } from './wallet-handlers'

interface StoredQuote extends Quote {
    userId: string
    fingerprint: string
}

const networkFees = {
    Ethereum: '0.016',
    Polygon: '0.001',
    Solana: '0.0005',
} as const

export class QuoteError extends Error {
    status: number
    code: string

    constructor(
        message: string,
        status: number,
        code = 'QUOTE_REJECTED',
    ) {
        super(message)
        this.name = 'QuoteError'
        this.status = status
        this.code = code
    }
}

function calculateQuote(userId: string, walletId: string) {
    const wallet = readWallets(userId).find(
        (wallet) => wallet.id === walletId,
    )

    if (!wallet) {
        throw new QuoteError('Selecione uma carteira cadastrada.', 422)
    }

    const cart = createCartView(readCart(userId))

    if (cart.lines.length === 0) {
        throw new QuoteError('Seu carrinho está vazio.', 409)
    }

    if (cart.lines.some((line) => line.quantity > line.available)) {
        throw new QuoteError(
            'A disponibilidade mudou. Ajuste as quantidades no carrinho.',
            409,
        )
    }

    if (cart.coupon && cart.coupon !== 'KURIO10') {
        throw new QuoteError('O cupom não é mais válido. Revise o carrinho.', 409)
    }

    const networkFee = networkFees[wallet.network]

    const quotedCart = {
        ...cart,
        networkFee,
        total: weiToEth(
            ethToWei(cart.subtotal)
            - ethToWei(cart.discount)
            + ethToWei(networkFee),
        ),
    }

    return {
        cart: quotedCart,
        wallet,
        fingerprint: JSON.stringify({
            cart: quotedCart,
            wallet,
        }),
    }
}

export function createQuote(userId: string, walletId: string): Quote {
    const calculated = calculateQuote(userId, walletId)

    const quote: StoredQuote = {
        id: crypto.randomUUID(),
        userId,
        expiresAt: Date.now() + 5 * 60 * 1000,
        ...calculated,
    }

    localStorage.setItem(
        `kurio:quote:${quote.id}`,
        JSON.stringify(quote),
    )

    return publicQuote(quote)
}

function publicQuote(quote: StoredQuote): Quote {
    return {
        id: quote.id,
        expiresAt: quote.expiresAt,
        cart: quote.cart,
        wallet: quote.wallet,
    }
}

export function validateQuote(userId: string, quoteId: string): Quote {
    const stored = localStorage.getItem(`kurio:quote:${quoteId}`)

    if (!stored) {
        throw new QuoteError('Cotação não encontrada. Gere uma nova.', 404)
    }

    const quote = JSON.parse(stored) as StoredQuote

    if (quote.userId !== userId) {
        throw new QuoteError('Cotação não encontrada.', 404)
    }

    if (quote.expiresAt <= Date.now()) {
        throw new QuoteError('A cotação expirou. Revise os valores novamente.', 409)
    }

    const current = calculateQuote(userId, quote.wallet.id)

    if (current.fingerprint !== quote.fingerprint) {
        throw new QuoteError(
            'Os dados da compra mudaram. Gere uma nova cotação e confirme novamente.',
            409,
        )
    }

    return publicQuote(quote)
}