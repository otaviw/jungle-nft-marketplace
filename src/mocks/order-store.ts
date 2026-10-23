import type { Order, OrderInput } from '@/types/order'
import { readCart, writeCart } from './cart-store'
import { nfts } from './fixtures'
import { QuoteError, validateQuote } from './quote-store'
import { getWalletConnection } from './wallet-connection-handlers'
import { syncCatalogState } from './catalog-state'

interface StoredOrder extends Order {
    userId: string
    idempotencyKey: string
    requestContent: string
    resolveAt: number
    outcome: 'confirmed' | 'declined'
}

interface OrderDatabase {
    orders: StoredOrder[]
}

const storageKey = 'kurio:orders:v1'

const initialStock = new Map(
    nfts.flatMap((nft) =>
        nft.editions.map((edition) => [
            `${nft.id}:${edition.id}`,
            edition.available,
        ] as const),
    ),
)

function readDatabase(): OrderDatabase {
    const stored = localStorage.getItem(storageKey)

    return stored
        ? JSON.parse(stored) as OrderDatabase
        : { orders: [] }
}

function writeDatabase(database: OrderDatabase) {
    localStorage.setItem(storageKey, JSON.stringify(database))
}

export function restoreInventory() {
    const confirmed = readDatabase().orders.filter(
        (order) => order.status === 'confirmed',
    )

    for (const nft of nfts) {
        for (const edition of nft.editions) {
            const sold = confirmed.reduce((total, order) => {
                return total + order.snapshot.cart.items
                    .filter(
                        (item) => item.nftId === nft.id
                            && item.editionId === edition.id,
                    )
                    .reduce((sum, item) => sum + item.quantity, 0)
            }, 0)

            edition.available = Math.max(
                0,
                (initialStock.get(`${nft.id}:${edition.id}`) ?? 0) - sold,
            )
        }
    }

    syncCatalogState()
}

function publicOrder(order: StoredOrder): Order {
    return {
        id: order.id,
        status: order.status,
        version: order.version,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        transactionId: order.transactionId,
        rejectionReason: order.rejectionReason,
        collector: order.collector,
        snapshot: order.snapshot,
    }
}

export function createOrder(
    userId: string,
    idempotencyKey: string,
    input: OrderInput,
): Order {
    const database = readDatabase()
    const requestContent = JSON.stringify(input)

    const existing = database.orders.find(
        (order) => order.userId === userId
            && order.idempotencyKey === idempotencyKey,
    )

    if (existing) {
        if (existing.requestContent !== requestContent) {
            throw new QuoteError(
                'Esta chave já foi utilizada com outros dados.',
                409,
                'IDEMPOTENCY_CONFLICT',
            )
        }

        return publicOrder(existing)
    }

    const quoteAlreadyUsed = database.orders.some(
        (order) => order.userId === userId
            && order.snapshot.id === input.quoteId,
    )

    if (quoteAlreadyUsed) {
        throw new QuoteError(
            'Esta cotação já foi utilizada em um pedido.',
            409,
            'QUOTE_ALREADY_USED',
        )
    }

    restoreInventory()

    const snapshot = validateQuote(userId, input.quoteId)
    const connection = getWalletConnection(userId)

    if (!connection || connection.walletId !== snapshot.wallet.id) {
        throw new QuoteError(
            'Conecte novamente a carteira selecionada antes de comprar.',
            409,
        )
    }
    const now = Date.now()

    const order: StoredOrder = {
        id: crypto.randomUUID(),
        userId,
        idempotencyKey,
        requestContent,
        status: 'pending',
        version: 1,
        createdAt: now,
        updatedAt: now,
        resolveAt: now + 3000,
        outcome: localStorage.getItem('kurio:scenario:payment') === 'declined'
            ? 'declined'
            : 'confirmed',
        transactionId: null,
        rejectionReason: null,
        collector: input.collector,
        snapshot,
    }

    database.orders.push(order)
    writeDatabase(database)

    return publicOrder(order)
}

export function getOrder(userId: string, orderId: string): Order {
    const database = readDatabase()
    const order = database.orders.find(
        (order) => order.id === orderId && order.userId === userId,
    )

    if (!order) {
        throw new QuoteError('Pedido não encontrado.', 404)
    }

    // Estados terminais nunca voltam a pendente.
    if (order.status !== 'pending' || Date.now() < order.resolveAt) {
        return publicOrder(order)
    }

    restoreInventory()

    const hasStock = order.snapshot.cart.items.every((item) => {
        const nft = nfts.find((nft) => nft.id === item.nftId)
        const edition = nft?.editions.find(
            (edition) => edition.id === item.editionId,
        )

        return edition && edition.available >= item.quantity
    })

    const confirmed = order.outcome === 'confirmed' && hasStock

    order.status = confirmed ? 'confirmed' : 'declined'
    order.version += 1
    order.updatedAt = Date.now()
    order.transactionId = confirmed
        ? `sim-${crypto.randomUUID()}`
        : null
    order.rejectionReason = confirmed
        ? null
        : hasStock
            ? 'Pagamento recusado pela simulação.'
            : 'Uma edição ficou sem disponibilidade.'

    if (confirmed) {
        const cart = readCart(userId)

        // Remove somente as quantidades compradas.
        cart.items = cart.items.flatMap((item) => {
            const purchased = order.snapshot.cart.items.find(
                (purchased) => purchased.nftId === item.nftId
                    && purchased.editionId === item.editionId,
            )

            const remaining = item.quantity - (purchased?.quantity ?? 0)

            return remaining > 0 ? [{ ...item, quantity: remaining }] : []
        })

        if (cart.items.length === 0) {
            cart.coupon = undefined
        }

        writeCart(cart, userId)
    }

    writeDatabase(database)
    restoreInventory()

    return publicOrder(order)
}