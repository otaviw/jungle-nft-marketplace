import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { parseCatalogSearch } from '@/lib/catalog-search'

const slides = [
    { image: 'emerald-ape', title: 'Seja dono do futuro da arte digital', mobile: 'Seja dono da cultura digital', category: undefined },
    { image: 'sage-nomad', title: 'Uma nova forma de colecionar arte', mobile: 'Sua próxima descoberta digital', category: 'Colecionáveis' },
    { image: 'neon-vessel', title: 'Descubra arte que faz parte de você', mobile: 'Arte digital para sua coleção', category: 'Arte digital' },
]

export function Hero() {
    const [current, setCurrent] = useState(0)
    const slide = slides[current]
    return (
        <section aria-labelledby="hero-title" className="market-container market-hero">
            <div className="hero-copy">
                <p className="hero-eyebrow">Bem-vindo à Kurio</p>
                <h1 id="hero-title"><span className="hero-title-desktop">{slide.title}</span><span className="hero-title-mobile">{slide.mobile}</span></h1>
                <p className="hero-description-desktop">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
                <p className="hero-description-mobile">Descubra NFTs selecionados<br />de criadores do mundo<br />todo.</p>
                <Link to="/" search={parseCatalogSearch({ category: slide.category })} hash="catalogo" className="market-cta hero-cta">Explorar <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
            <div className="hero-art"><img src={`/images/nfts/${slide.image}.png`} alt={`Obra em destaque: ${slide.image.replaceAll('-', ' ')}`} width={450} height={450} fetchPriority="high" /><img className="hero-miniature" src="/images/nfts/sage-nomad.png" alt="" width={80} height={80} /></div>
            <div className="hero-pagination" aria-label="Destaques">{slides.map((item, index) => <button key={item.image} type="button" aria-label={`Ver destaque ${index + 1}`} aria-pressed={current === index} onClick={() => setCurrent(index)} />)}</div>
        </section>
    )
}
