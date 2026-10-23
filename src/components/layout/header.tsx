import { Search, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
    return (
        <header className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="hidden h-20 items-center justify-between border-b border-primary/30 md:flex">
                <a href="/" className="text-sm font-bold tracking-widest">
                    KURIO
                </a>

                <nav aria-label="Navegação principal">
                    <a
                        href="#catalogo"
                        className="border-b-2 border-primary pb-7 text-sm text-primary"
                    >
                        Início
                    </a>
                </nav>

                <div className="flex items-center gap-5">
                    <a href="#catalogo" aria-label="Explorar NFTs">
                        <Search size={20} />
                    </a>

                    <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        aria-label="Carrinho em implementação"
                    >
                        <ShoppingCart size={20} />
                    </Button>

                    <Button disabled>Entrar</Button>
                </div>
            </div>

            <a
                href="#catalogo"
                className="mt-6 flex items-center gap-3 rounded-xl bg-card px-4 py-4 text-muted-foreground md:hidden"
            >
                <Search size={22} aria-hidden="true" />
                <span>Explorar coleções</span>
            </a>
        </header>
    )
}