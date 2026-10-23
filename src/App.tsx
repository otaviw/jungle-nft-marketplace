import { Header } from '@/components/layout/header'
import { Hero } from '@/components/home/hero'

function App() {
  return (
    <>
      <a
        href="#catalogo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Pular para o catálogo
      </a>

      <Header />

      <main>
        <Hero />

        <section
          id="catalogo"
          aria-labelledby="catalog-title"
          className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-20"
        >
          <h2 id="catalog-title" className="text-lg font-bold">
            Todos os NFTs
          </h2>
        </section>
      </main>
    </>
  )
}

export default App