export const categories = [
    'Arte digital',
    'Colecionáveis',
    'Arte 3D',
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

    return {
        q: typeof search.q === 'string' ? search.q : '',
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        category: categories.find((category) => category === search.category),
        network: networks.find((network) => network === search.network),
        sort: sortOptions.find((option) => option.value === search.sort)?.value
            ?? 'recent',
    }
}