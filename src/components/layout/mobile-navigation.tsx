import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Home, Heart, ShoppingCart, UserRound, X } from 'lucide-react'
import { parseCatalogSearch } from '@/lib/catalog-search'
import { AccountMenu } from './account-menu'

export function MobileNavigation() {
    const account = useRef<HTMLDialogElement>(null)
    return (
        <>
            <nav aria-label="Navegação mobile" className="mobile-navigation">
                <Link to="/" search={parseCatalogSearch({})} aria-label="Início" className="active"><Home aria-hidden="true" fill="currentColor" /></Link>
                <button type="button" aria-label="Sobre favoritos" onClick={() => account.current?.showModal()}><Heart aria-hidden="true" fill="currentColor" /></button>
                <Link to="/" search={parseCatalogSearch({})} hash="catalogo" aria-label="Explorar NFTs" className="nav-explore"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true"><path d="M5 8a7 7 0 0 1 14 0M5 16a7 7 0 0 0 14 0M3 12h18M5 10v4M19 10v4" /></svg></Link>
                <Link to="/cart" aria-label="Abrir carrinho"><ShoppingCart aria-hidden="true" fill="currentColor" /></Link>
                <button type="button" aria-label="Abrir conta" onClick={() => account.current?.showModal()}><UserRound aria-hidden="true" fill="currentColor" /></button>
            </nav>
            <dialog ref={account} className="market-dialog account-dialog" aria-labelledby="mobile-account-title">
                <button type="button" aria-label="Fechar conta" className="dialog-close" onClick={() => account.current?.close()}><X /></button>
                <h2 id="mobile-account-title">Sua coleção começa aqui</h2>
                <p>Entre na sua conta para salvar favoritos. Use o coração nos cards ou no detalhe de cada NFT.</p>
                <AccountMenu />
            </dialog>
        </>
    )
}
