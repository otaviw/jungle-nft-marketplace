import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Search, ShoppingCart, LogIn } from 'lucide-react'
import { AccountMenu } from './account-menu'
import { parseCatalogSearch } from '@/lib/catalog-search'

export function MarketplaceHeader({ detail = false, onFilters, filtersOpen = false }: { detail?: boolean; onFilters?: () => void; filtersOpen?: boolean }) {
    const [searchOpen, setSearchOpen] = useState(false)
    const search = parseCatalogSearch(useSearch({ strict: false }) as Record<string, unknown>)
    const navigate = useNavigate()
    return (
        <header className={`marketplace-header market-container ${detail ? 'marketplace-header-detail' : ''}`}>
            <div className="desktop-header">
                <Link to="/" search={parseCatalogSearch({})} className="brand">KURIO</Link>
                <nav aria-label="Navegação principal" className="desktop-links">
                    <Link to="/" search={parseCatalogSearch({})} activeProps={{ className: '' }} className={!detail ? 'active' : ''}>Início</Link>
                    <Link to="/" search={parseCatalogSearch({})} hash="catalogo" activeProps={{ className: '' }} className={detail ? 'active' : ''}>Mercado</Link>
                    <Link to="/" search={parseCatalogSearch({})} hash="criadores" activeProps={{ className: '' }}>Criadores</Link>
                    <Link to="/" search={parseCatalogSearch({})} hash="diario" activeProps={{ className: '' }}>Aprenda</Link>
                </nav>
                <div className="desktop-actions">
                    <button type="button" className="icon-control" aria-label="Abrir busca" aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search /></button>
                    <Link to="/cart" aria-label="Abrir carrinho" className="icon-control"><ShoppingCart /></Link>
                    <span className="login-icon" aria-hidden="true"><LogIn size={17} /></span>
                    <AccountMenu />
                </div>
            </div>
            {(searchOpen || !detail) && (
                <div className={`header-search ${searchOpen ? 'search-expanded' : ''}`}>
                    <form role="search" onSubmit={event => {
                        event.preventDefault()
                        const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
                        void navigate({ to: '/', search: { ...search, q, page: 1 }, hash: 'catalogo' })
                    }}>
                        <button type="submit" aria-label="Buscar"><Search aria-hidden="true" size={23} /></button>
                        <label htmlFor="header-search" className="sr-only">Buscar NFTs pelo nome</label>
                        <input key={search.q} id="header-search" name="q" type="search" defaultValue={search.q} placeholder="Explorar coleções" />
                    </form>
                    {onFilters && <button type="button" className="filter-toggle" aria-label="Abrir filtros" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={onFilters}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="5" cy="6" r="2.5" /><path d="M11 6h9M3 18h9" /><circle cx="18" cy="18" r="2.5" /></svg></button>}
                </div>
            )}
        </header>
    )
}
