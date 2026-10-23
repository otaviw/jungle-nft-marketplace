import type { Nft } from '@/types/nft'

const artworks = [
    { name: 'Emerald Ape', image: 'emerald-ape.png' },
    { name: 'Sage Nomad', image: 'sage-nomad.png' },
    { name: 'Neon Vessel', image: 'neon-vessel.png' },
    { name: 'Golden Beat', image: 'golden-beat.png' },
]

const prices = ['1.19', '1.69', '1.99', '0.99']
const categories = ['Arte digital', 'Colecionáveis', 'Arte 3D']
const networks = ['Ethereum', 'Polygon', 'Solana']

export const nfts: Nft[] = Array.from({ length: 24 }, (_, index) => {
    const artwork = artworks[index % artworks.length]
    const number = String(index + 1).padStart(3, '0')

    return {
        id: `nft-${number}`,
        name: `${artwork.name} #${number}`,
        image: `/images/nfts/${artwork.image}`,
        price: prices[index % prices.length],
        category: categories[index % categories.length],
        network: networks[index % networks.length],
        editions: [
            {
                id: 'standard',
                name: 'Edição padrão',
                price: prices[index % prices.length],
                available: 5,
            },
            {
                id: 'limited',
                name: 'Edição limitada',
                price: '2.49',
                available: index % 3 === 0 ? 0 : 2,
            },
        ],
        version: 1,
    }
})