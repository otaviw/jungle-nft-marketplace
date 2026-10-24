import { useQuery } from '@tanstack/react-query'
import { sessionOptions } from '@/lib/session'
import { useId, useRef } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { Home, Heart, Menu, ShoppingCart, UserRound, X } from 'lucide-react'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { AccountMenu } from './account-menu'

export function MobileNavigation({ compact = false }: { compact?: boolean }) {
    const session = useQuery(sessionOptions)
    const account = useRef<HTMLDialogElement>(null)
    const titleId = useId()
    const sectionSearch = parseCatalogSearch(useSearch({ strict: false }) as Record<string, unknown>)
    return (
        <>
            {compact ? <button type="button" aria-label="Abrir menu de navegação" aria-haspopup="dialog" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl bg-card text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" onClick={() => account.current?.showModal()}><Menu size={23} aria-hidden="true" /></button> :
            <nav aria-label="Navegação mobile" className="mobile-navigation">
                <Link to="/" search={parseCatalogSearch({})} aria-label="Início" className="active"><Home aria-hidden="true" fill="currentColor" /></Link>
                {session.data
                    ? <Link to="/" search={parseCatalogSearch({ favorites: true })} hash="catalogo" aria-label="Ver favoritos"><Heart aria-hidden="true" fill="currentColor" /></Link>
                    : <Link to="/login" search={{ mode: 'login', redirect: '/?favorites=true#catalogo' }} aria-label="Entrar para ver favoritos"><Heart aria-hidden="true" fill="currentColor" /></Link>}
                <Link to="/" search={parseCatalogSearch({})} hash="catalogo" aria-label="Explorar NFTs" className="nav-explore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true"><path d="M5 8a7 7 0 0 1 14 0M5 16a7 7 0 0 0 14 0M3 12h18M5 10v4M19 10v4" /></svg></Link>
                <Link to="/cart" aria-label="Abrir carrinho"><ShoppingCart aria-hidden="true" fill="currentColor" /></Link>
                <button type="button" aria-label="Abrir conta" onClick={() => account.current?.showModal()}><UserRound aria-hidden="true" fill="currentColor" /></button>
            </nav>
            }
            <dialog ref={account} className="market-dialog account-dialog" aria-labelledby={titleId}>
                <button type="button" aria-label={compact ? 'Fechar menu de navegação' : 'Fechar conta'} className="dialog-close" onClick={() => account.current?.close()}><X aria-hidden="true" /></button>
                <h2 id={titleId}>{compact ? 'Menu de navegação' : 'Sua coleção começa aqui'}</h2>
                <nav aria-label="Seções do marketplace" className="my-4 grid gap-1">
                    {[['Início', ''], ['Mercado', 'catalogo'], ['Criadores', 'criadores'], ['Aprenda', 'diario']].map(([label, hash]) => <Link key={label} to="/" search={sectionSearch} hash={hash} className="flex min-h-11 items-center rounded-md px-3 text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => account.current?.close()}>{label}</Link>)}
                    <Link to="/cart" className="flex min-h-11 items-center gap-2 rounded-md px-3 text-primary" onClick={() => account.current?.close()}><ShoppingCart size={18} aria-hidden="true" />Carrinho</Link>
                </nav>
                <p>Entre na sua conta para salvar favoritos. Use o coração nos cards ou no detalhe de cada NFT.</p>
                <AccountMenu />
            </dialog>
        </>
    )
}
