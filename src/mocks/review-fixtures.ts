import type { NftReview } from '@/types/review'
import { nfts } from './fixtures'

// Fictitious collectors and fixed dates; no clock, randomness or purchase state.
const reviews = [
    ['Lia Aurora', 5, '2026-10-20', 'As cores esmeralda e os detalhes da obra ficaram incríveis na minha coleção.'],
    ['Caio Neblina', 5, '2026-10-19', 'A composição tem muita personalidade. Sempre encontro um detalhe novo ao observar a arte.'],
    ['Nina Solar', 5, '2026-10-18', 'Gostei especialmente do contraste entre a luz e o fundo. Uma das minhas peças favoritas.'],
    ['Theo Brisa', 5, '2026-10-17', 'O acabamento visual é muito bonito e combina com as outras obras da minha coleção.'],
    ['Maya Luar', 5, '2026-10-16', 'A paleta de cores foi o que me conquistou. A imagem continua interessante mesmo ampliada.'],
    ['Ivo Horizonte', 5, '2026-10-15', 'Uma arte expressiva, com detalhes que dão bastante profundidade ao personagem.'],
    ['Bia Cometa', 5, '2026-10-14', 'Adorei a identidade desta obra. Ela traz um ponto de cor especial para minha seleção.'],
    ['Ravi Oceano', 5, '2026-10-13', 'Os tons e as texturas conversam muito bem. Fiquei bastante satisfeito com a composição.'],
    ['Clara Vento', 5, '2026-10-12', 'A expressão do personagem e o cuidado com a iluminação fazem toda a diferença.'],
    ['Noah Cedro', 5, '2026-10-11', 'A obra tem presença sem exagerar nos elementos. Gostei muito do equilíbrio visual.'],
    ['Eva Estrela', 5, '2026-10-10', 'Uma combinação marcante de cores e formas. Ficou ótima ao lado das minhas outras peças.'],
    ['Davi Maré', 5, '2026-10-09', 'Gostei da riqueza dos pequenos detalhes e da personalidade que a imagem transmite.'],
    ['Yara Cristal', 5, '2026-10-08', 'A direção de arte é consistente e o resultado tem uma identidade fácil de reconhecer.'],
    ['Leo Ametista', 5, '2026-10-07', 'A escolha de cores funciona muito bem. É uma peça que gosto de revisitar com calma.'],
    ['Íris Jardim', 5, '2026-10-06', 'A composição ficou muito harmoniosa. Os detalhes valorizam a obra sem tirar o foco do personagem.'],
    ['Tom Âmbar', 4, '2026-10-05', 'Gostei da composição, mas gostaria de ver mais variações de cor nesta coleção.'],
    ['Luna Vale', 4, '2026-10-04', 'A arte é muito bonita. Alguns detalhes do fundo poderiam ter um pouco mais de contraste.'],
    ['Otto Nuvem', 4, '2026-10-03', 'A paleta é marcante e a obra tem personalidade. Eu preferiria uma iluminação um pouco mais suave.'],
    ['Sara Rio', 4, '2026-10-02', 'Gostei do estilo e das texturas. Uma versão com o fundo mais limpo também seria interessante.'],
] as const

export const nftReviews: Record<string, NftReview[]> = Object.fromEntries(nfts.map((nft, index) => {
    // Main NFT: (15 × 5 + 4 × 4) / 19 = 4.789… → 4.8.
    const selected = index === 0 ? reviews
        : index % 3 === 1 ? [reviews[0], reviews[15], reviews[16]]
            : index % 3 === 2 ? [reviews[15], reviews[16]]
                : [reviews[0], reviews[1], reviews[15], reviews[16]]
    return [nft.id, selected.map(([author, rating, date, comment], reviewIndex) => ({
        id: `${nft.id}-review-${reviewIndex + 1}`,
        author,
        rating,
        date,
        comment,
    }))]
}))
