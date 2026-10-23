import { nfts } from './fixtures'

interface CatalogEntry {
    fingerprint: string
    version: number
}

const pricesKey = 'kurio:catalog-prices:v1'
const versionsKey = 'kurio:catalog-versions:v1'

export function syncCatalogState() {
    const prices = JSON.parse(
        localStorage.getItem(pricesKey) ?? '{}',
    ) as Record<string, Record<string, string>>

    const versions = JSON.parse(
        localStorage.getItem(versionsKey) ?? '{}',
    ) as Record<string, CatalogEntry>

    for (const nft of nfts) {
        for (const edition of nft.editions) {
            const price = prices[nft.id]?.[edition.id]

            if (price !== undefined) {
                edition.price = price
            }
        }

        nft.price = nft.editions[0]?.price ?? nft.price

        const fingerprint = JSON.stringify({
            price: nft.price,
            editions: nft.editions,
        })

        const previous = versions[nft.id]

        const version = previous
            ? previous.version + (previous.fingerprint === fingerprint ? 0 : 1)
            : 1

        nft.version = version
        versions[nft.id] = { fingerprint, version }
    }

    localStorage.setItem(versionsKey, JSON.stringify(versions))
}

export function changeNftPrice(
    nftId: string,
    editionId: string,
    price: string,
) {
    const nft = nfts.find((item) => item.id === nftId)
    const edition = nft?.editions.find((item) => item.id === editionId)

    if (!nft || !edition) {
        return null
    }

    const prices = JSON.parse(
        localStorage.getItem(pricesKey) ?? '{}',
    ) as Record<string, Record<string, string>>

    prices[nftId] = {
        ...prices[nftId],
        [editionId]: price,
    }

    localStorage.setItem(pricesKey, JSON.stringify(prices))
    syncCatalogState()

    return nft
}