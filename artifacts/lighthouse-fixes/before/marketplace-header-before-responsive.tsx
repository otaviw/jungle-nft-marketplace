import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { Search, ShoppingCart } from 'lucide-react'
import { AccountMenu } from './account-menu'
import { parseCatalogSearch } from '@/lib/catalog-search'

const sections = [
    { id: 'inicio', label: 'Início' },
    { id: 'catalogo', label: 'Mercado' },
    { id: 'criadores', label: 'Criadores' },
    { id: 'diario', label: 'Aprenda' },
] as const

export function MarketplaceHeader({ detail = false, onFilters, filtersOpen = false }: {
    detail?: boolean
    onFilters?: () => void
    filtersOpen?: boolean
}) {
    const [searchOpen, setSearchOpen] = useState(false)
    const [activeSection, setActiveSection] = useState('inicio')
    const pathname = useLocation({ select: location => location.pathname })
    const search = parseCatalogSearch(useSearch({ strict: false }) as Record<string, unknown>)
    const navigate = useNavigate()
    const router = useRouter()

    useEffect(() => {
        if (pathname !== '/') return
        let frame = 0
        function measure() {
            const headerHeight = document.querySelector('.marketplace-header')?.getBoundingClientRect().height ?? 70
            const visible = sections
                .map(section => ({ id: section.id, top: section.id === 'inicio' ? -window.scrollY : document.getElementById(section.id)?.getBoundingClientRect().top }))
                .filter(section => section.top !== undefined && section.top <= headerHeight + 40)
                .sort((a, b) => b.top! - a.top!)
            setActiveSection(visible[0]?.id ?? 'inicio')
        }
        function schedule() {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(measure)
        }
        schedule()
        window.addEventListener('scroll', schedule, { passive: true })
        window.addEventListener('resize', schedule)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('scroll', schedule)
            window.removeEventListener('resize', schedule)
        }
    }, [pathname])

    function goToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        void navigate({
            to: '/',
            search: pathname === '/' ? search : parseCatalogSearch({}),
            hash: id === 'inicio' ? '' : id,
            resetScroll: false,
        }).then(() => {
            requestAnimationFrame(() => {
                const headerHeight = document.querySelector('.marketplace-header')?.getBoundingClientRect().height ?? 70
                const target = document.getElementById(id)
                const top = id === 'inicio' ? 0 : target ? window.scrollY + target.getBoundingClientRect().top - headerHeight - 16 : 0
                window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
                setActiveSection(id)
            })
        })
    }

    return (
        <header className={`marketplace-header market-container ${detail ? 'marketplace-header-detail' : ''}`}>
            <div className="desktop-header">
                <Link to="/" search={parseCatalogSearch({})} className="brand" onClick={event => goToSection(event, 'inicio')}>KURIO</Link>
                <nav aria-label="Navegação principal" className="desktop-links">
                    {sections.map(section => {
                        const active = pathname === '/' ? activeSection === section.id : detail && section.id === 'catalogo'
                        const href = router.buildLocation({ to: '/', search: pathname === '/' ? search : parseCatalogSearch({}), hash: section.id === 'inicio' ? '' : section.id }).href
                        return <a key={section.id} href={href} aria-current={active ? 'location' : undefined} className={active ? 'active' : ''} onClick={event => goToSection(event, section.id)}>{section.label}</a>
                    })}
                </nav>
                <div className="desktop-actions">
                    <button type="button" className="icon-control" aria-label="Abrir busca" aria-expanded={searchOpen} onClick={() => {
                        setSearchOpen(value => !value)
                        if (!searchOpen) requestAnimationFrame(() => document.getElementById('header-search')?.focus())
                    }}><Search aria-hidden="true" /></button>
                    <Link to="/cart" aria-label="Abrir carrinho" className="icon-control"><ShoppingCart aria-hidden="true" /></Link>
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
