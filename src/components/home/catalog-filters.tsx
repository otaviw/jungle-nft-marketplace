import { useState, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Slider } from '@base-ui/react/slider'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { categories, networks, parseCatalogSearch } from '@/lib/catalog-search'
import type { CatalogFacets } from '@/types/nft'

export function CatalogFilters({ onApply }: { onApply?: () => void }) {
    const search = useSearch({ from: '/' })
    const { data, isError, refetch } = useQuery({
        queryKey: ['nfts', 'facets'],
        queryFn: async ({ signal }) => (await api.get<CatalogFacets>('/nfts/facets', { signal })).data,
    })
    const priceLimit = Math.max(1, Math.ceil(Number(data?.maxPrice ?? '1')), Number(search.minPrice ?? 0), Number(search.maxPrice ?? 0))
    return <CatalogFilterForm key={`${search.category}-${search.network}-${search.minPrice}-${search.maxPrice}`} facets={data} priceLimit={priceLimit} onApply={onApply}>
        {isError && <p role="alert">Contagens indisponíveis. <button type="button" onClick={() => void refetch()}>Tentar novamente</button></p>}
    </CatalogFilterForm>
}

function CatalogFilterForm({ facets, priceLimit, onApply, children }: {
    facets?: CatalogFacets
    priceLimit: number
    onApply?: () => void
    children: ReactNode
}) {
    const search = useSearch({ from: '/' })
    const navigate = useNavigate({ from: '/' })
    const [draftPrices, setDraftPrices] = useState([search.minPrice, search.maxPrice])
    const prices = [draftPrices[0] ?? '0', draftPrices[1] ?? String(priceLimit)]
    const formatPrice = (value: string) => {
        const [whole, fraction = ''] = value.split('.')
        return `${whole},${fraction.padEnd(2, '0')}`
    }
    const hasFilters = Boolean(search.category || search.network || search.minPrice !== undefined || search.maxPrice !== undefined)
    return <form id="catalog-filters" onSubmit={event => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        void navigate({
            search: parseCatalogSearch({
                ...search,
                category: data.get('category'),
                network: data.get('network'),
                minPrice: draftPrices[0],
                maxPrice: draftPrices[1],
                page: 1,
            }),
            resetScroll: false,
        })
        onApply?.()
    }}>
        <fieldset className="sidebar-fieldset"><legend className="sidebar-label">Coleções</legend>
            <div className="sidebar-radio-list">{categories.map(category => <label key={category}>
                <input type="radio" name="category" aria-label={category} value={category} defaultChecked={search.category === category} />
                <span>{category}</span><span className="filter-count" aria-hidden="true">({facets ? facets.categories[category] ?? 0 : '…'})</span>
            </label>)}</div>
        </fieldset>
        <fieldset className="sidebar-price"><legend className="sidebar-label">Faixa de preço</legend>
            <Slider.Root className="price-range" value={prices.map(Number)} min={0} max={priceLimit} step={0.01} thumbCollisionBehavior="none" locale="pt-BR" onValueChange={(values, details) => {
                setDraftPrices(previous => previous.map((value, index) => index === details.activeThumbIndex ? String(values[index]) : value))
            }}>
                <Slider.Control className="price-range-control">
                    <Slider.Track className="price-range-track"><Slider.Indicator className="price-range-indicator" /></Slider.Track>
                    <Slider.Thumb index={0} className="price-range-thumb" aria-label="Preço mínimo em ETH" getAriaValueText={() => `${formatPrice(prices[0])} ETH`} />
                    <Slider.Thumb index={1} className="price-range-thumb" aria-label="Preço máximo em ETH" getAriaValueText={() => `${formatPrice(prices[1])} ETH`} />
                </Slider.Control>
            </Slider.Root>
            <p className="price-range-value">Preço: {formatPrice(prices[0])} - {formatPrice(prices[1])} ETH</p>
            <div className="filter-actions"><Button type="submit">Aplicar</Button>{hasFilters && <Button type="button" variant="ghost" onClick={() => {
                void navigate({ search: { ...search, category: undefined, network: undefined, minPrice: undefined, maxPrice: undefined, page: 1 }, resetScroll: false })
                onApply?.()
            }}>Limpar</Button>}</div>
        </fieldset>
        <fieldset className="sidebar-fieldset"><legend className="sidebar-label">Rede</legend>
            <div className="sidebar-radio-list">{networks.map(network => <label key={network}>
                <input type="radio" name="network" aria-label={network} value={network} defaultChecked={search.network === network} />
                <span>{network}</span><span className="filter-count" aria-hidden="true">({facets ? facets.networks[network] ?? 0 : '…'})</span>
            </label>)}</div>
        </fieldset>
        {children}
    </form>
}
