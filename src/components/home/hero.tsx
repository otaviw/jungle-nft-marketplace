import { ArrowRight } from 'lucide-react'

export function Hero() {
    return (
        <section
            aria-labelledby="hero-title"
            className="mx-auto max-w-6xl px-5 pt-4 md:px-8 md:pt-8"
        >
            <div className="relative grid items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#825a35] to-card p-4 md:grid-cols-[1.2fr_1fr] md:gap-16 md:rounded-none md:bg-none md:px-8 md:py-0">
                <div className="relative z-10 max-w-lg pr-[40%] pb-8 md:pr-0 md:pb-0">
                    <p className="mb-3 text-xs tracking-wide md:mb-5">
                        Bem-vindo à Kurio
                    </p>

                    <h1
                        id="hero-title"
                        className="text-lg leading-relaxed font-bold uppercase md:text-4xl md:leading-relaxed"
                    >
                        Seja dono do futuro da arte digital
                    </h1>

                    <p className="mt-3 hidden text-sm leading-6 text-muted-foreground md:block">
                        Descubra NFTs selecionados de criadores emergentes e consagrados.
                        Colecione arte digital rara, apoie artistas e tenha uma parte da
                        cultura da internet.
                    </p>

                    <p className="mt-3 text-xs leading-5 text-[#e0c29d] md:hidden">
                        Descubra NFTs selecionados de criadores do mundo todo.
                    </p>

                    <a
                        href="#catalogo"
                        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary uppercase md:mt-6 md:rounded-sm md:bg-primary md:px-6 md:py-3 md:text-primary-foreground"
                    >
                        Explorar
                        <ArrowRight size={16} className="md:hidden" aria-hidden="true" />
                    </a>
                </div>

                <div className="absolute top-5 right-4 w-[40%] md:static md:w-full">
                    <img
                        src="/images/nfts/emerald-ape.png"
                        alt="Macaco com óculos escuros e jaqueta verde"
                        width={480}
                        height={480}
                        fetchPriority="high"
                        className="aspect-square w-full rounded-2xl object-cover"
                    />

                    <img
                        src="/images/nfts/sage-nomad.png"
                        alt=""
                        width={80}
                        height={80}
                        className="absolute -bottom-3 left-2 w-14 rounded-xl border-4 border-card md:hidden"
                    />
                </div>

                <div
                    className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-6 md:left-[45%]"
                    aria-hidden="true"
                >
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span className="size-1.5 rounded-full bg-primary/60" />
                    <span className="size-1.5 rounded-full bg-primary/60" />
                </div>
            </div>
        </section>
    )
}