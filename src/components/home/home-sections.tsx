import { Link } from '@tanstack/react-router'
import { parseCatalogSearch } from '@/lib/catalog-search'

const stories = [
    ['neon-vessel', 'Como funciona a propriedade de NFTs', 'Aprenda a colecionar, negociar e verificar ativos digitais.'],
    ['emerald-ape', '10 artistas digitais para acompanhar', 'Conheça criadores que moldam a cultura digital.'],
    ['sage-nomad', 'Raridade, atributos e procedência', 'Entenda raridade, procedência, direitos autorais e utilidade.'],
    ['golden-beat', 'Como proteger sua carteira', 'Proteja sua carteira, seus ativos e sua identidade.'],
]

export function HomeSections() {
    return (
        <div className="market-container home-sections">
            <section className="collection-promos" aria-label="Explore as coleções">
                {[
                    ['emerald-ape', 'Lançamentos gênesis de edição limitada', 'Colecione edições escassas diretamente dos criadores antes da revelação pública.', 'Arte digital'],
                    ['neon-vessel', 'Arte digital selecionada e muito mais', 'Explore novos artistas, coleções verificadas e obras digitais que definem a cena.', 'Colecionáveis'],
                ].map(([image, title, text, category]) => <div key={image} className="collection-promo"><img src={`/images/nfts/${image}.png`} alt="" loading="lazy" width={250} height={250} /><div><h2>{title}</h2><p>{text}</p><Link to="/" search={parseCatalogSearch({ category })} hash="catalogo" className="market-cta">Explorar →</Link></div></div>)}
            </section>
            <section id="diario" className="mint-journal" aria-labelledby="journal-title">
                <h2 id="journal-title">Diário da Cunhagem</h2>
                <p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
                <div className="journal-grid">{stories.map(([image, title, text]) => <article key={image}><img src={`/images/nfts/${image}.png`} alt="" loading="lazy" width={250} height={185} /><div><small>Diário da Kurio · Coleção editorial</small><h3>{title}</h3><p>{text}</p><span className="editorial-unavailable">Leitura indisponível na demonstração</span></div></article>)}</div>
            </section>
        </div>
    )
}
