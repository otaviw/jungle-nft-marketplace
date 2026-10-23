import { Search, ShoppingCart } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { AccountMenu } from './account-menu'

export function Header() {
    return (
        <header className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="hidden h-20 items-center justify-between border-b border-primary/30 md:flex">
                <a href="/" className="text-sm font-bold tracking-widest">
                    KURIO
                </a>

                <nav aria-label="Navegação principal">
                    <a
                        href="/#catalogo"
                        className="border-b-2 border-primary pb-7 text-sm text-primary"
                    >
                        Início
                    </a>
                </nav>

                <div className="flex items-center gap-5">
                    <a href="/#catalogo" aria-label="Explorar NFTs">
                        <Search size={20} />
                    </a>

                    <Link
                        to="/cart"
                        aria-label="Abrir carrinho"
                        className="inline-flex size-10 items-center justify-center rounded-md hover:bg-accent"
                    >
                        <ShoppingCart size={20} aria-hidden="true" />
                    </Link>

                    <AccountMenu />
                </div>
            </div>

            <a
                href="#catalogo"
                className="mt-6 flex items-center gap-3 rounded-xl bg-card px-4 py-4 text-muted-foreground md:hidden"
            >
                <Search size={22} aria-hidden="true" />
                <span>Explorar coleções</span>
            </a>

            <div className="mt-3 flex justify-end md:hidden">
                <AccountMenu />
            </div>
        </header>
    )
}