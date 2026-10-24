import { useState } from 'react'
import { MarketplaceHeader } from '@/components/layout/marketplace-header'
import { MarketplaceFooter } from '@/components/layout/marketplace-footer'
import { MobileNavigation } from '@/components/layout/mobile-navigation'
import { HomeSections } from '@/components/home/home-sections'
import { Hero } from '@/components/home/hero'
import { Catalog } from '@/components/home/catalog'

function App() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  return (
    <div className="marketplace home-page">
      <a
        href="#catalogo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Pular para o catálogo
      </a>

      <MarketplaceHeader filtersOpen={filtersOpen} onFilters={() => {
        setFiltersOpen(value => !value)
        if (!filtersOpen) requestAnimationFrame(() => document.querySelector<HTMLSelectElement>('#catalog-filters select')?.focus())
      }} />

      <main>
        <Hero />
        <Catalog filtersOpen={filtersOpen} onCloseFilters={() => setFiltersOpen(false)} />
        <HomeSections />
      </main>
      <MarketplaceFooter />
      <MobileNavigation />
    </div>
  )
}

export default App
