import { ethToWei } from './eth'

export const categories = [
    'Arte digital',
    'Fotografia',
    'Música',
    'Arte 3D',
    'Colecionáveis',
    'Generativa',
    'Jogos',
    'Assinaturas',
    'Utilidade',
] as const

export const networks = [
    'Ethereum',
    'Polygon',
    'Solana',
] as const

export const sortOptions = [
    { value: 'recent', label: 'Listados recentemente' },
    { value: 'price-asc', label: 'Menor preço' },
    { value: 'price-desc', label: 'Maior preço' },
] as const

export function parseCatalogSearch(search: Record<string, unknown>) {
    const page = Number(search.page)
    // Keep decimal strings intact: Number would lose precision at wei boundaries.
    const price = (value: unknown) => typeof value === 'string' && /^\d+(\.\d{1,18})?$/.test(value)
        ? value : undefined
    let minPrice = price(search.minPrice)
    let maxPrice = price(search.maxPrice)
    if (minPrice !== undefined && maxPrice !== undefined && ethToWei(minPrice) > ethToWei(maxPrice)) {
        [minPrice, maxPrice] = [maxPrice, minPrice]
    }

    return {
        view: search.view === 'new' || search.view === 'trending' ? search.view : 'all' as 'all' | 'new' | 'trending',
        favorites: search.favorites === true || search.favorites === 'true' ? true : undefined,
        q: typeof search.q === 'string' ? search.q : '',
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        category: categories.find((category) => category === search.category),
        network: networks.find((network) => network === search.network),
        minPrice,
        maxPrice,
        sort: sortOptions.find((option) => option.value === search.sort)?.value
            ?? 'recent',
    }
}
