import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
    categories,
    networks,
    parseCatalogSearch,
    sortOptions,
} from '@/lib/catalog-search'

const selectClassName =
    'mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function CatalogFilters() {
    const search = useSearch({ from: '/' })
    const navigate = useNavigate({ from: '/' })

    return (
        <form
            key={`${search.category}-${search.network}-${search.sort}`}
            className="mb-8 grid gap-4 rounded-xl bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
                event.preventDefault()

                const form = new FormData(event.currentTarget)

                const nextSearch = parseCatalogSearch({
                    ...search,
                    category: form.get('category'),
                    network: form.get('network'),
                    sort: form.get('sort'),
                    page: 1,
                })

                void navigate({ search: nextSearch })
            }}
        >
            <label className="text-sm">
                Coleção
                <select
                    name="category"
                    defaultValue={search.category ?? ''}
                    className={selectClassName}
                >
                    <option value="">Todas as coleções</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-sm">
                Rede
                <select
                    name="network"
                    defaultValue={search.network ?? ''}
                    className={selectClassName}
                >
                    <option value="">Todas as redes</option>
                    {networks.map((network) => (
                        <option key={network} value={network}>
                            {network}
                        </option>
                    ))}
                </select>
            </label>

            <label className="text-sm">
                Ordenar por
                <select
                    name="sort"
                    defaultValue={search.sort}
                    className={selectClassName}
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>

            <div className="flex items-end gap-2">
                <Button type="submit">Aplicar</Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                        void navigate({
                            search: parseCatalogSearch({ q: search.q }),
                        })
                    }
                >
                    Limpar
                </Button>
            </div>
        </form>
    )
}