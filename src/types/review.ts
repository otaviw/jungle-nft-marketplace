export interface NftReview {
    id: string
    author: string
    rating: 1 | 2 | 3 | 4 | 5
    date: string
    comment: string
}

export interface NftReviewsResponse {
    items: NftReview[]
    average: number
    total: number
}
