import { Link } from '@tanstack/react-router'
import { ChevronLeft, Search } from 'lucide-react'
import { AccountMenu } from './account-menu'
import { MarketplaceHeader } from './marketplace-header'
import { parseCatalogSearch } from '@/lib/catalog-search'

export function Header() {
    return <>
        <MarketplaceHeader detail />
        <header className="account-mobile-header market-container">
            <Link to="/" search={parseCatalogSearch({})} hash="catalogo" className="account-back"><ChevronLeft size={20} aria-hidden="true" />Voltar ao catálogo</Link>
            <Link to="/" search={parseCatalogSearch({})} hash="catalogo" className="account-explore"><Search size={20} aria-hidden="true" />Explorar coleções</Link>
            <div className="account-mobile-actions"><AccountMenu /></div>
        </header>
    </>
}
