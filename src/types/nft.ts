export interface NftEdition {
    id: string
    name: string
    price: string
    available: number
}

export interface Nft {
    id: string
    name: string
    image: string
    price: string
    category: string
    network: string
    editions: NftEdition[]
    listedAt: number
    popularity: number
    version: number
}

export interface NftListResponse {
    items: Nft[]
    total: number
    page: number
    pageSize: number
}

export interface CatalogFacets {
    categories: Record<string, number>
    networks: Record<string, number>
    maxPrice: string
}
