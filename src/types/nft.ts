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
    version: number
}

export interface NftListResponse {
    items: Nft[]
    total: number
    page: number
    pageSize: number
}