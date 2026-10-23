import { Header } from '@/components/layout/header'
import { Hero } from '@/components/home/hero'
import { Catalog } from '@/components/home/catalog'

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
        <Catalog />
      </main>
    </>
  )
}

export default App