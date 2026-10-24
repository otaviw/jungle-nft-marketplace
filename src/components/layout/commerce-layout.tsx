import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { MarketplaceHeader } from './marketplace-header'
import { MarketplaceFooter } from './marketplace-footer'
import { parseCatalogSearch } from '@/lib/catalog-search'

export function CommerceLayout({ title, step, children }: { title: string; step: 'cart' | 'checkout' | 'receipt'; children: ReactNode }) {
    return <div className={`marketplace commerce-page commerce-${step}`}>
        <MarketplaceHeader detail />
        <main className="market-container commerce-main">
            <nav className="commerce-breadcrumb" aria-label="Caminho de navegação"><Link to="/" search={parseCatalogSearch({})}>Início</Link><span>/</span><Link to="/" search={parseCatalogSearch({})} hash="catalogo">Mercado</Link><span>/</span><span aria-current="page">{step === 'cart' ? 'Carrinho' : step === 'checkout' ? 'Pagamento' : 'Recibo'}</span></nav>
            <div className="commerce-mobile-heading">
                {step === 'cart' ? <Link to="/" search={parseCatalogSearch({})} aria-label="Voltar ao catálogo"><ChevronLeft aria-hidden="true" /></Link> : <Link to="/cart" aria-label="Voltar ao carrinho"><ChevronLeft aria-hidden="true" /></Link>}
                {step === 'receipt' ? <span>{title}</span> : <h1>{title}</h1>}
            </div>
            {children}
        </main>
        <MarketplaceFooter />
    </div>
}
