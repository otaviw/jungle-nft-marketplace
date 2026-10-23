export interface Nft {
    id: string
    name: string
    image: string
    price: string
    category: string
    network: string
}

export interface NftListResponse {
    items: Nft[]
    total: number
    page: number
    pageSize: number
}