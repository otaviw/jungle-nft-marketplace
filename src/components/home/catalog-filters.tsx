import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { categories, networks, parseCatalogSearch } from '@/lib/catalog-search'

export function CatalogFilters({ onApply }: { onApply?: () => void }) {
    const search = useSearch({ from: '/' })
    const navigate = useNavigate({ from: '/' })
    return (
        <form id="catalog-filters" key={`${search.category}-${search.network}-${search.sort}`} onSubmit={event => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void navigate({ search: parseCatalogSearch({ ...search, category: form.get('category'), network: form.get('network'), sort: form.get('sort'), page: 1 }) })
            onApply?.()
        }}>
            <label className="sidebar-label"><span id="catalog-category-label">Coleções</span><span className="sr-only">Selecione uma coleção</span>
                <select aria-label="Coleção" name="category" defaultValue={search.category ?? ''} size={4} className="sidebar-options"><option value="">Todas as coleções</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select>
            </label>
            <div className="sidebar-price"><h3>Preço</h3><p>Valores em ETH</p><div className="price-sort-actions">{[['price-asc', 'Menor preço'], ['price-desc', 'Maior preço']].map(([value, label]) => <button key={value} type="submit" onClick={event => { const sort = event.currentTarget.form?.elements.namedItem('sort'); if (sort instanceof HTMLSelectElement) sort.value = value }}>{label}</button>)}</div></div>
            <label className="sidebar-label"><span id="catalog-network-label">Rede</span><select aria-labelledby="catalog-network-label" name="network" defaultValue={search.network ?? ''} size={4} className="sidebar-options"><option value="">Todas as redes</option>{networks.map(network => <option key={network} value={network}>{network}</option>)}</select></label>
            <div className="filter-actions"><Button type="submit">Aplicar</Button><Button type="button" variant="ghost" onClick={() => { void navigate({ search: parseCatalogSearch({ q: search.q }) }); onApply?.() }}>Limpar</Button></div>
        </form>
    )
}
